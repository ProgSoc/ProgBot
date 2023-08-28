import { Controller, Get } from '@nestjs/common';

@Controller()
export class DiscordController {
  @Get('health')
  public health() {
    return 'ok';
  }
}
