import { Type } from 'class-transformer';
import { Instrument, Product, SDKv2 } from '@shiftforex/client-sdkv2';
import { CacheService } from '../cache/cache.service';
import { Exchange } from '../exchange/exchange.model';

const cacheService = new CacheService();

/**
 * AuthGuard automatically adds User instance to request
 */
export class User {
  id: string;

  username: string;

  @Type(() => Exchange)
  exchange: Exchange;

  accessToken?: string;
  whitelabel?: string;

  private sdk: SDKv2;

  getClientSDK() {
    if (!this.sdk) {
      this.sdk = new SDKv2(this.exchange.id, this.exchange.environment);
    }
    this.sdk.accessToken = this.accessToken;
    return this.sdk;
  }

  getInstruments() {
    return this.getClientSDK().getInstruments();
  }

  getProducts() {
    return this.getClientSDK().getProducts();
  }

  async getInstrumentsThruCache() {
    return cacheService.thruCacheAsync<Instrument[]>(
      () => this.getInstruments(),
      `exchange-${this.id}-instruments`,
      300,
    );
  }

  async getProductsThruCache() {
    return cacheService.thruCacheAsync<Product[]>(
      () => this.getProducts(),
      `exchange-${this.id}-products`,
      300,
    );
  }
}
