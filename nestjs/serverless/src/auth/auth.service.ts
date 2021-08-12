import _ from 'lodash';
import jwkToPem from 'jwk-to-pem';
import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { Exchange } from '../exchange/exchange.model';
import { ExchangeService } from '../exchange/exchange.service';
import { Logger } from 'winston';

@Injectable()
export class AuthService implements OnModuleInit {
  private exchanges: Exchange[] = [];

  constructor(
    private cacheService: CacheService,
    private exchangeService: ExchangeService,
  ) {}

  async onModuleInit() {
    await this.loadExchanges();
    await this.loadPublicKeys();
  }

  getPublicKey(kid: string) {
    return this.cacheService.get(kid);
  }

  /**
   * Get exchange by auth pool id
   * @param poolId
   */
  getExchangeByAuthPoolId(poolId: string) {
    return _.find(this.exchanges, exchange => exchange.auth.poolId == poolId);
  }

  getExchangeById(id: string) {
    return _.find(this.exchanges, exchange => exchange.id == id);
  }

  /**
   * Load JWK public keys from AWS and convert them to PEM
   */
  private async loadPublicKeys() {
    this.exchanges.forEach(exchange => {
      // this.logger.debug(`Loading jwks for ${exchange.id}`);
      exchange.auth.jwks.forEach(jwk => {
        const pem = jwkToPem(jwk as any);
        this.cacheService.set(jwk.kid, pem);
      });
    });
  }

  /**
   * Load exchanges from database
   */
  private async loadExchanges() {
    this.exchanges = await this.exchangeService.findAll();
  }
}
