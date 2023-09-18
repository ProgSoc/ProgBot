import { Controller, Get, Redirect, UseGuards } from '@nestjs/common';
import { DiscordAuthGuard } from './auth/guard/discord.guard';

@Controller()
export class DiscordController {
  @Get('health')
  public health() {
    return 'ok';
  }

  @Get('auth/discord')
  @UseGuards(DiscordAuthGuard)
  public authDiscord() {}

  @Get('auth/discord/callback')
  @UseGuards(DiscordAuthGuard)
  @Redirect('https://discord.com/app')
  public authDiscordCallback() {}
}
