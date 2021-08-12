import NodeCache from 'node-cache';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService extends NodeCache {
  /**
   * Async cacher, fetch data from asynDataProvider in case of cache miss
   * @param asynDataProvider async data provider
   * @param key cache key
   * @param ttl timeout in seconds
   */
  async thruCacheAsync<T>(
    asynDataProvider: () => any,
    key: string,
    ttl: number,
  ) {
    let data: T = this.get(key);

    if (!data) {
      data = await asynDataProvider();
      this.set(key, data, ttl);
    }

    return data;
  }
}
