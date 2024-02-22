import { Injectable } from "@nestjs/common";
import {
  ActionRowBuilder,
  MessageActionRowComponent,
  MessageActionRowComponentBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { Ctx, Modal, type ModalContext } from "necord";
import { VerifyButton } from "src/buttons/VerifyButton";
import { AoCService } from "src/services/aoc.service";
import { MembershipsService } from "src/services/memberships.service";
import { z } from "zod";

@Injectable()
export class AocSetupModal {
  constructor(private readonly aocService: AoCService) {}

  @Modal("aoc-setup")
  public async modal(@Ctx() [interaction]: ModalContext) {
    const rawLeaderboardUrl =
      interaction.fields.getTextInputValue("leaderboard-url");
    const rawSessionToken =
      interaction.fields.getTextInputValue("session-token");
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: "This command can only be used in a guild",
        ephemeral: true,
      });
      return;
    }

    try {
      z.string()
        .url()
        .startsWith("https://adventofcode.com")
        .endsWith(".json")
        .parse(rawLeaderboardUrl);
    } catch (error) {
      await interaction.reply({
        content: "Invalid leaderboard url",
        ephemeral: true,
      });
      return;
    }

    try {
      z.string().parse(rawSessionToken);
    } catch (error) {
      await interaction.reply({
        content: "Invalid session token",
        ephemeral: true,
      });
      return;
    }

    // set the guilds leaderboard url and session token
    await this.aocService.setup(guild.id, rawLeaderboardUrl, rawSessionToken);

    await interaction.reply({
      content: "AoC setup complete",
      ephemeral: true,
    });
  }

  public static getModal() {
    return new ModalBuilder()
      .setTitle("Advent of Code Setup")
      .setCustomId("aoc-setup")
      .setComponents([
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId("leaderboard-url")
            .setLabel("Leaderboard URL")
            .setPlaceholder("Enter your leaderboard url ending in .json")
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph),
        ]),
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId("session-token")
            .setLabel("Session Token")
            .setPlaceholder("Enter your session token (from your cookies)")
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph),
        ]),
      ]);
  }
}
