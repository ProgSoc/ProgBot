import { Injectable } from '@nestjs/common';
import { DateTime, Duration } from 'luxon';
import { Context, SlashCommand, type SlashCommandContext } from 'necord';
import mainLogger from 'src/logger';

@Injectable()
export class UptimeCommand {
  private readonly logger = mainLogger.scope(UptimeCommand.name);

  @SlashCommand({ name: 'uptime', description: 'Get the bot uptime' })
  public async ping(@Context() [interaction]: SlashCommandContext) {
    const uptime = process.uptime();

    const relativeUptime = Duration.fromObject({ seconds: uptime }).toHuman();

    this.logger.info('Uptime command received');

    await interaction.reply({
      content: `The bot has been up for ${relativeUptime}`,
      ephemeral: true,
    });
  }
}
