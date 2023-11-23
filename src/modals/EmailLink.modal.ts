import { Injectable } from '@nestjs/common';
import {
  ActionRowBuilder,
  MessageActionRowComponent,
  MessageActionRowComponentBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { Ctx, Modal, type ModalContext } from 'necord';
import { VerifyButton } from 'src/buttons/VerifyButton';
import { MembershipsService } from 'src/services/memberships.service';

@Injectable()
export class LinkMembershipEmailModal {
  constructor(private readonly membershipService: MembershipsService) {}

  @Modal(`link-membership-email`)
  public async modal(@Ctx() [interaction]: ModalContext) {
    const email = interaction.fields.getTextInputValue('email');
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: 'This command can only be used in a guild',
        ephemeral: true,
      });
      return;
    }

    try {
      await this.membershipService.sendCode(interaction.user.id, email);
      const actionRow =
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          VerifyButton.getButton(),
        );
      await interaction.reply({
        content: 'Check your email for a code',
        ephemeral: true,
        components: [actionRow],
      });
      return;
    } catch (error) {
      if (error instanceof Error) {
        await interaction.reply({
          content: error.message,
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        content: 'Unknown error',
        ephemeral: true,
      });
      return;
    }
  }

  public static getModal() {
    return new ModalBuilder()
      .setTitle('Link Membership')
      .setCustomId('link-membership-email')
      .setComponents([
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId('email')
            .setLabel('Email')
            .setPlaceholder('Enter the email you used to sign up')
            .setRequired(true)
            .setStyle(TextInputStyle.Short),
        ]),
      ]);
  }
}
