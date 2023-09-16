import { Injectable } from '@nestjs/common';
import { OAuth2Scopes } from 'discord.js';
import { Context, SlashCommand, type SlashCommandContext } from 'necord';
import mainLogger from 'src/logger';

@Injectable()
export class InviteCommand {
  private readonly logger = mainLogger.scope(InviteCommand.name);

  @SlashCommand({ name: 'invite', description: 'Invite the bot' })
  public async invite(@Context() [interaction]: SlashCommandContext) {
    this.logger.info('Invite command received');

    const inviteString = interaction.client.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: ['ManageRoles', 'ModerateMembers'],
    });

    await interaction.reply({
      content: `Invite link: ${inviteString}`,
      ephemeral: true,
    });
  }
}
