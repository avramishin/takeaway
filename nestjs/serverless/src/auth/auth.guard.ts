import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import NodeRSA from 'node-rsa';
import { default as jwtDecode } from 'jwt-decode';
import jwt from 'jsonwebtoken';

import { AuthService } from './auth.service';
import { DynamoService } from '../dynamo/dynamo.service';
import { User } from '../user/user.model';
import { ApiKey } from './entities/api-key.entity';
import { ExchangeUser } from './entities/exchange-user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject('AuthService')
    private authService: AuthService,
    @Inject('DynamoService') private dynamoService: DynamoService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;

    const currentUser = new User();

    const jwtToken: string =
      headers.authorization &&
      headers.authorization.toLowerCase().startsWith('bearer ')
        ? headers.authorization.substring(7)
        : request.query.token;
    if (jwtToken) {
      try {
        const jwtHeaders = jwtDecode(jwtToken, { header: true }) as any;
        const publicKey = this.authService.getPublicKey(
          jwtHeaders.kid,
        ) as string;
        const jwtPayload = jwt.verify(jwtToken, publicKey) as any;

        currentUser.id = jwtPayload.username;
        currentUser.username = jwtPayload.username;
        currentUser.exchange = this.authService.getExchangeByAuthPoolId(
          this.getAuthPoolFromISS(jwtPayload.iss),
        );
        currentUser.accessToken = jwtToken;

        const user = await this.findUserByClientUserId(jwtPayload.username);

        if (user) {
          currentUser.whitelabel = user.whitelabel;
        }
      } catch {
        throw new UnauthorizedException();
      }
    } else if (headers['api-key-id'] && headers['api-signature']) {
      const apiKeyId = headers['api-key-id'] as string;
      const signature = headers['api-signature'] as string;

      if (!apiKeyId) {
        throw new BadRequestException('MISSING_API_KEY_ID');
      }
      if (!signature) {
        throw new BadRequestException('MISSING_API_SIGNATURE');
      }

      const apiKey = await this.findApiKeyById(apiKeyId);

      if (!apiKey) {
        throw new BadRequestException('WRONG_API_KEY_ID');
      }

      if (!apiKey.is_enabled) {
        throw new BadRequestException('DISABLED_API_KEY');
      }

      const rsaKey = new NodeRSA();
      rsaKey.importKey(apiKey.public_key);
      if (
        !rsaKey.verify(
          Buffer.from(JSON.stringify(request.body)),
          signature,
          'buffer',
          'base64',
        )
      ) {
        throw new BadRequestException('INVALID_API_SIGNATURE');
      }

      const user = await this.findUserByClientUserId(apiKey.user_id);

      currentUser.id = user.client_user_id;
      currentUser.username = user.client_user_id;
      currentUser.exchange = this.authService.getExchangeById(user.exchange_id);
      currentUser.whitelabel = user.whitelabel;
    } else {
      throw new UnauthorizedException();
    }

    if (!currentUser.exchange) {
      throw new Error('Could not resolve exchange for the user');
    }

    if (currentUser.exchange.dependency?.parent) {
      // is whitelable? reassign exchange to parent
      currentUser.exchange = this.authService.getExchangeById(
        currentUser.exchange.dependency?.parent,
      );
    }

    request.user = currentUser;

    return true;
  }

  private getAuthPoolFromISS(iss: string) {
    const matched = iss.match(/^.+_(.+)$/);
    if (matched) {
      return matched[1];
    }
    throw new BadRequestException('Could not parse auth pool from accessToken');
  }

  private async findApiKeyById(id: string) {
    const result = await this.dynamoService.client
      .get({
        TableName: this.dynamoService.globalTable('api_keys'),
        Key: {
          api_key_id: id,
        },
      })
      .promise();
    return result.Item as ApiKey;
  }

  private async findUserByClientUserId(client_user_id: string) {
    const result = await this.dynamoService.client
      .query({
        TableName: this.dynamoService.globalTable('users'),
        IndexName: 'client_user_id_index',
        KeyConditionExpression: 'client_user_id = :client_user_id',
        ExpressionAttributeValues: {
          ':client_user_id': client_user_id,
        },
      })
      .promise();
    return result.Items.length ? (result.Items[0] as ExchangeUser) : undefined;
  }
}
