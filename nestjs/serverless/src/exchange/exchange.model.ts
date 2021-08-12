import { Instrument, Product, SDKv2 } from '@shiftforex/client-sdkv2';
import { Quote } from '@shiftforex/client-sdkv2/dist/eds/interfaces/quote.interface';
import { CacheService } from '../cache/cache.service';

const cacheService = new CacheService();

interface Jwk {
  alg: string;
  e: string;
  kid: string;
  kty: string;
  n: string;
  use: string;
}

interface Auth {
  jwks: Jwk[];
  poolId: string;
}

interface Oms {
  ws: string;
  rest: string;
}

interface Dependency {
  parent: string;
  type: string;
}

export class Exchange {
  auth: Auth;
  environment: string;
  id: string;
  oms: Oms;
  dependency?: Dependency;

  async getInstruments() {
    const sdk = new SDKv2(this.id, this.environment);
    const instruments = await sdk.getInstruments();
    return instruments;
  }

  async getProducts() {
    const sdk = new SDKv2(this.id, this.environment);
    const products = await sdk.getProducts();
    return products;
  }

  async getQuoteForInstrument(instrument: string) {
    const sdk = new SDKv2(this.id, this.environment);
    const quote = await sdk.getQuote(instrument);
    return quote;
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

  async getQuoteForInstrumentThruCache(instrument: string) {
    return cacheService.thruCacheAsync<Promise<Quote>>(
      () => this.getQuoteForInstrument(instrument),
      `exchange-${this.id}-quote-${instrument}`,
      60,
    );
  }
}
