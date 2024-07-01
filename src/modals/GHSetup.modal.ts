import { Injectable } from "@nestjs/common";
import { Octokit } from "@octokit/rest";
import {
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { Ctx, Modal, type ModalContext } from "necord";
import { GHService } from "src/services/gh.service";

@Injectable()
export class GHSetupModal {
  constructor(private readonly ghService: GHService) {}

  @Modal("gh-setup")
  public async modal(@Ctx() [interaction]: ModalContext) {
    const organisationName =
      interaction.fields.getTextInputValue("organisation-name");
    const apiToken = interaction.fields.getTextInputValue("gh-api-token");
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: "This command can only be used in a guild",
        ephemeral: true,
      });
      return;
    }

    // Validate the input
    try {
      const octokit = new Octokit({ auth: apiToken });
      await octokit.orgs.get({ org: organisationName });
    } catch (e) {
      await interaction.reply({
        content: `Error: ${e.message}`,
        ephemeral: true,
      });
      return;
    }

    await this.ghService.setup(guild.id, organisationName, apiToken);

    await interaction.reply({
      content: "Successfully setup contribution leaderboard for this server!",
      ephemeral: true,
    });
  }

  public static getModal() {
    return new ModalBuilder()
      .setTitle("Contribution Tracking Setup")
      .setCustomId("gh-setup")
      .setComponents([
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId("organisation-name")
            .setLabel("Organisation Name")
            .setPlaceholder(
              "Enter the name of your github organisation as it appears in the url (e.g. 'progsoc')"
            )
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph),
        ]),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId("gh-api-token")
            .setLabel("Github API Token")
            .setPlaceholder("Enter your Github API token.")
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph),
        ]),
      ]);
  }
}
