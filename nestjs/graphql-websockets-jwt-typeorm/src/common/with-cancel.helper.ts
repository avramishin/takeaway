export function withCancel<T>(
  asyncIterator: AsyncIterator<T | undefined>,
  onCancel: () => void,
): AsyncIterator<T | undefined> {
  return {
    ...asyncIterator,
    return() {
      onCancel();
      return asyncIterator.return
        ? asyncIterator.return()
        : Promise.resolve({ value: undefined, done: true });
    },
  };
}
