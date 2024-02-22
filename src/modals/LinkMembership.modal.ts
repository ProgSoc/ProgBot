import { Injectable } from "@nestjs/common";
import {
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { Ctx, Modal, type ModalContext } from "necord";
import { MembershipsService } from "src/services/memberships.service";

@Injectable()
export class LinkMemberShipModal {
  constructor(private readonly membershipService: MembershipsService) {}

  @Modal("link-membership")
  public async modal(@Ctx() [interaction]: ModalContext) {
    const code = interaction.fields.getTextInputValue("code");
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: "This command can only be used in a guild",
        ephemeral: true,
      });
      return;
    }

    try {
      await this.membershipService.linkCode(
        code,
        interaction.user.id,
        guild.id,
      );
      await interaction.reply({
        content: "Your membership has been linked",
        ephemeral: true,
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
        content: "Unknown error",
        ephemeral: true,
      });
      return;
    }
  }

  public static getModal() {
    return new ModalBuilder()
      .setTitle("Link Membership")
      .setCustomId("link-membership")
      .setComponents([
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId("code")
            .setLabel("Code")
            .setPlaceholder("Enter the code from the email you received")
            .setRequired(true)
            .setStyle(TextInputStyle.Short),
        ]),
      ]);
  }
}
