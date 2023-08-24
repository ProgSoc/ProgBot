import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { NecordModule } from 'necord';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PingCommand } from './commands/ping.command';
import { InviteCommand } from './commands/invite.command';
import { CacheModule } from '@nestjs/cache-manager';
import { OutlineCommand } from './commands/outline.command';
import { redisStore } from 'cache-manager-ioredis-yet';
import { NecordPaginationModule } from '@necord/pagination';
import type { RedisOptions } from 'ioredis';
import { HandbookCommands } from './commands/handbook.command';
import { HandbookService } from './handbook.service';
import { TimetableService } from './timetable.service';
import { TimetableCommand } from './commands/timetable.command';
// import { InjectDynamicProviders } from 'nestjs-dynamic-providers';

// @InjectDynamicProviders({ pattern: 'dist/commands/**/*.command.js' })
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.registerAsync<RedisOptions>({
      useFactory: (configService: ConfigService) => {
        const redisUrl = new URL(configService.getOrThrow<string>('REDIS_URL'));
        return {
          store: redisStore,
          host: redisUrl.hostname,
          port: parseInt(redisUrl.port),
          password: redisUrl.password,
          db: 0,
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
    NecordModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('DISCORD_TOKEN'),
        intents: [],
      }),
      inject: [ConfigService],
    }),
    NecordPaginationModule.forRoot({
      // Change your buttons appearance
      buttons: {},
      // Add buttons for skip to first and last page
      allowSkip: true,
      // Add buttons for search page
      allowTraversal: true,
    }),
  ],
  providers: [
    DiscordService,
    PingCommand,
    InviteCommand,
    OutlineCommand,
    HandbookCommands,
    HandbookService,
    TimetableService,
    TimetableCommand,
  ],
  controllers: [],
})
export class DiscordModule {}
