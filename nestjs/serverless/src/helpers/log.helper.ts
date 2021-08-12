import debugFactory from 'debug';
import { v4 as uuid } from 'uuid';
/**
 * Logging decorator
 */
export function Log() {
  return (
    target: any,
    propertyKey: string,
    propertyDescriptor: PropertyDescriptor,
  ) => {
    const originalMethod = propertyDescriptor.value;
    propertyDescriptor.value = function(...args: any[]) {
      const namespace = `App:${target.constructor.name}:${propertyKey}`;
      const debug = debugFactory(namespace);
      const trace = uuid().substr(0, 8);
      debug(`[${trace} arg] %j`, args);
      const result = originalMethod.apply(this, args);
      if (isPromise(result)) {
        result
          .then((data: any) => {
            debug(`[${trace} res] %j`, data);
          })
          .catch(error => {
            debug(`[${trace} res] error %j`, error.message, error.stack);
          });
      } else {
        debug(`[${trace} res] %j`, result);
      }
      return result;
    };
  };
}

function isPromise(promise) {
  return !!promise && typeof promise.then === 'function';
}
