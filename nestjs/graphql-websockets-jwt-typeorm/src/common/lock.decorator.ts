import { Lock } from './lock';
import debugFactory from 'debug';

const locks: Map<string, Lock> = new Map();

/**
 * Logging decorator
 */
export function ThruLock(name: string) {
  return (
    target: any,
    propertyKey: string,
    propertyDescriptor: PropertyDescriptor,
  ) => {
    const originalMethod = propertyDescriptor.value;
    propertyDescriptor.value = function (...args: any[]) {
      let lock = locks.get(name);
      const debug = debugFactory(`${ThruLock.name}:${propertyKey}`);
      if (!lock) {
        lock = new Lock();
        locks.set(name, lock);
      }

      return lock.acquire().then(() => {
        debug('lock');
        const result = originalMethod.apply(this, args);
        if (isPromise(result)) {
          result.finally(() => {
            debug('release');
            lock.release();
          });
        } else {
          debug('release');
          lock.release();
        }
        return result;
      });
    };
  };
}

function isPromise(promise) {
  return !!promise && typeof promise.then === 'function';
}
