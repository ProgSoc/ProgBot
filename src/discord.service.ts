import { Injectable } from '@nestjs/common';
import mainLogger from './logger';
import { Context, type ContextOf, On, Once } from 'necord';
import { ActivityType, OAuth2Scopes } from 'discord.js';
import terminalLink from 'terminal-link';

@Injectable()
export class DiscordService {
  private readonly logger = mainLogger.scope('DiscordService');

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.info(`Logged in as ${client.user.tag}`);
    this.logger.debug(
      terminalLink(
        'Invite link',
        client.generateInvite({
          scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
        }),
      ),
    );
    client.user.setPresence({
      activities: [
        {
          name: 'Hello World!',
          state: 'Hello World!',
          type: ActivityType.Custom,
        },
      ],
      afk: false,
      status: 'online',
    });
  }

  @On('warn')
  public onWarn(@Context() [info]: ContextOf<'warn'>) {
    this.logger.warn(info);
  }
}
