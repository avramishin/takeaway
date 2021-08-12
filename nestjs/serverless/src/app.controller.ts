import { Get, Controller } from '@nestjs/common';

const startTime = new Date().valueOf();

@Controller()
export class AppController {
  @Get()
  warmUp() {
    const now = new Date().valueOf();
    const message = `up ${((now - startTime) / 1000).toFixed(0)} seconds`;
    return message;
  }
}
