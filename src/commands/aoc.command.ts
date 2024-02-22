import { Injectable } from "@nestjs/common";
import { EmbedBuilder, codeBlock } from "discord.js";
import { Context, SlashCommand, type SlashCommandContext } from "necord";
import { AocSetupModal } from "src/modals/AocSetup";
import { AoCService, Leaderboard } from "src/services/aoc.service";
import { AsciiTable3 } from "ascii-table3";

@Injectable()
export class AoCCommands {
  constructor(private readonly aocService: AoCService) {}

  @SlashCommand({
    name: "aocsetup",
    description: "Setup AoC for this server",
    defaultMemberPermissions: ["Administrator"],
  })
  public async aocsetup(@Context() [interaction]: SlashCommandContext) {
    await interaction.showModal(AocSetupModal.getModal());
  }

  @SlashCommand({
    name: "aocleaderboard",
    description: "Get the AoC leaderboard for this server",
    dmPermission: false,
  })
  public async aocleaderboard(@Context() [interaction]: SlashCommandContext) {
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({
        content: "This command can only be used in a guild",
        ephemeral: true,
      });
      return;
    }

    const leaderboard = await this.aocService.getLeaderboard(guildId);

    // const leaderboardEmbed = new EmbedBuilder()
    //   .setTitle('AoC Leaderboard')
    //   .setDescription(leaderboardToMd(leaderboard));

    await interaction.reply({
      content: `Here's the leaderboard for this server\n${codeBlock(
        leaderboardToMd(leaderboard),
      )}`,
      //   embeds: [leaderboardEmbed],
      //   ephemeral: true,
    });
  }
}

/**
 * Convert a leaderboard to markdown (for discord) e.g. without formatted tables
 *
 * Each member is able to get 2 stars per day, first level of the members record is the member itself, each
 * member has completion_day_level which is a record of the days they have completed and the stars they have as a record of records
 *
 * Use a black star emoji ★ for 1 star and a gold star ⭐ for 2 stars
 *
 * @param leaderboard The leaderboard to convert to markdown
 */
const leaderboardToMd = (leaderboard: Leaderboard) => {
  const table = new AsciiTable3().setHeading("Rank", "Score", "Stars", "Name");

  const members = Object.values(leaderboard.members);

  const memberRows = members
    .sort((a, b) => b.local_score - a.local_score)
    .map((member, index) => {
      const dayRecords = Object.values(member.completion_day_level);

      // Make a single line of gold and silver stars
      let stars = "";
      for (const dayRecord of dayRecords) {
        const starsForDay = Object.values(dayRecord).length;
        if (starsForDay === 1) {
          stars += "☆";
        } else if (starsForDay === 2) {
          stars += "★";
        }
      }

      return {
        rank: index + 1,
        score: member.local_score,
        stars,
        name: member.name,
      };
    });

  // max stars length
  //   const maxStarsLength = memberRows.reduce((acc, row) => {
  //     return Math.max(acc, Buffer.byteLength(row.stars));
  //   }, 0);

  for (const row of memberRows) {
    table.addRow(row.rank, row.score, `${row.stars}`, row.name ?? "Unknown");
  }

  //   table.setWidth(3, maxStarsLength);

  console.log(table.toString());

  return table.toString();
};
