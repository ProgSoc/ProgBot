import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { NecordModule } from 'necord';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PingCommand } from './commands/ping.command';
import { InviteCommand } from './commands/invite.command';
import { OutlineCommand } from './commands/outline.command';
// import { InjectDynamicProviders } from 'nestjs-dynamic-providers';

// @InjectDynamicProviders({ pattern: 'dist/commands/**/*.command.js' })
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    NecordModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('DISCORD_TOKEN'),
        intents: [],
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [DiscordService, PingCommand, InviteCommand, OutlineCommand],
  controllers: [],
})
export class DiscordModule {}
