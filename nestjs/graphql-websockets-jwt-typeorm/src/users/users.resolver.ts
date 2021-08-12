import bcrypt from 'bcrypt-nodejs';
import { v4 as uuid } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { Algorithm } from 'jsonwebtoken';

import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';

import { config } from '../config';
import { UsersService } from './users.service';
import { UserException } from './user.exception';
import { CredentialsArgs } from './dto/credentials.args';
import { User } from './entities/user.entity';
import { AccountsService } from '../accounts/accounts.service';
import { Account } from '../accounts/entities/account.entity';
import { UserEvent, UserEventTypeEnum } from './user.event';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PubSubService } from '../pubsub.service';

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private accountsService: AccountsService,
    private eventEmitter: EventEmitter2,
    private pubSubService: PubSubService,
  ) {}

  @Mutation(() => User, { description: 'Create new user' })
  async signup(@Args() credentials: CredentialsArgs) {
    const userExists = await this.usersService.findByUsername(
      credentials.username,
    );

    if (userExists) {
      throw new UserException('USER_EXISTS', {
        username: credentials.username,
      });
    }

    const user = new User();
    user.id = uuid();
    user.username = credentials.username;
    user.password_hash = await bcrypt.hash(
      credentials.password,
      await bcrypt.genSalt(),
    );

    user.broker_id = config.default_broker_id;

    await this.usersService.createUser(user);
    return user;
  }

  @Mutation(() => String, {
    description: 'Generate and return jwt access token for credentials',
  })
  async authenticate(@Args() credentials: CredentialsArgs) {
    const user = await this.usersService.findByUsernameOrFail(
      credentials.username,
    );

    const isValidCredentials = await bcrypt.compare(
      credentials.password,
      user.password_hash,
    );

    if (!isValidCredentials) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        username: user.username,
      },
      {
        algorithm: config.jwt.algorithm as Algorithm,
        privateKey: config.jwt.privateKey,
      },
    );

    const event = new UserEvent();
    event.type = UserEventTypeEnum.UserLogged;
    event.user = user;

    await this.eventEmitter.emitAsync(UserEvent.name, event);
    return accessToken;
  }

  @ResolveField(() => [Account])
  accounts(@Parent() user: User) {
    return this.accountsService.findByUserId(user.id);
  }

  /**
   * Stream user events to subscribers
   */
  @Subscription(() => UserEvent, {
    description: 'Subscribe to user events',
    name: UserEvent.name,
  })
  subscribeUserEvents() {
    return this.pubSubService.asyncIterator(UserEvent.name);
  }

  /**
   * Forward events from local EventEmitter2 to GraphQL pubSubService
   */
  @OnEvent(UserEvent.name)
  publishUserEvents(payload: UserEvent) {
    return this.pubSubService.publish(UserEvent.name, {
      [UserEvent.name]: payload,
    });
  }
}
