export class CurrencyException extends Error {
  ctx: any;
  constructor(message: string, ctx?: any) {
    super(message);
    if (ctx) {
      this.ctx = ctx;
    }
  }
}
