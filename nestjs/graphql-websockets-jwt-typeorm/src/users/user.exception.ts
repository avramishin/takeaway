export class UserException extends Error {
  ctx: any;
  constructor(message: string, ctx?: any) {
    super(message);
    if (ctx) {
      this.ctx = ctx;
    }
  }
}
