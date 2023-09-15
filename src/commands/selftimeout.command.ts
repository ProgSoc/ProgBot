import { Injectable } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  type SlashCommandContext,
} from 'necord';
import mainLogger from 'src/logger';
import { APIInteractionGuildMember, GuildMember } from 'discord.js';
import { TimeoutCommandDto } from 'src/dto/TimeoutCommandDto';

@Injectable()
export class SelfTimeoutCommand {
  private readonly logger = mainLogger.scope(SelfTimeoutCommand.name);

  @SlashCommand({
    name: 'selftimeout',
    description: 'Time yourself out to better focus.',
    dmPermission: false,
  })
  public async ping(
    @Context() [interaction]: SlashCommandContext,
    @Options() { timeout }: TimeoutCommandDto,
  ) {
    const { member } = interaction;

    if (!(member instanceof GuildMember)) {
      return interaction.reply('You must be in a server to use this command.');
    }

    const timedOutMember = await member.timeout(timeout);

    return interaction.reply({
      ephemeral: true,
      content: `Timed out ${timedOutMember.user.username} for ${timeout} minutes.`,
    });
  }
}
