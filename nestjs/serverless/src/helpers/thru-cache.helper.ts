import crypto from 'crypto';

const storage = new Map<string, { expires: Date; value: any }>();

/**
 * Cache decorator
 * @param ttl time to live in seconds
 */
export function ThruCache(ttl: number) {
  return (
    target: any,
    propertyKey: string,
    propertyDescriptor: PropertyDescriptor,
  ) => {
    const originalMethod = propertyDescriptor.value;

    propertyDescriptor.value = function(...args: any[]) {
      const key = crypto
        .createHash('md5')
        .update(JSON.stringify([propertyKey, args]))
        .digest('hex');

      const storedResult = storage.get(key);
      const now = new Date();

      if (storedResult && storedResult.expires >= now) {
        return storedResult.value;
      }

      const result = originalMethod.apply(this, args);
      now.setSeconds(now.getSeconds() + ttl);
      storage.set(key, {
        expires: now,
        value: result,
      });

      return result;
    };
  };
}
