import { Injectable } from "@nestjs/common";
import { EmbedBuilder, codeBlock } from "discord.js";
import {
  Context,
  Options,
  SlashCommand,
  type SlashCommandContext,
} from "necord";
import { ContributionTimeSpan, GHService } from "src/services/gh.service";
import { AsciiTable3 } from "ascii-table3";
import { GHSetupModal } from "src/modals/GHSetup.modal";

@Injectable()
export class GHCommands {
  constructor(private readonly ghService: GHService) {}

  @SlashCommand({
    name: "ghsetup",
    description:
      "Provide the bot with a Github Personal Access Token and an organisation name to track contributions",
    defaultMemberPermissions: ["Administrator"],
  })
  public async ghsetup(@Context() [interaction]: SlashCommandContext) {
    await interaction.showModal(GHSetupModal.getModal());
  }

  @SlashCommand({
    name: "contributing",
    description:
      "Get information on how to contribute to the organisation's projects",
  })
  public async contributing(@Context() [interaction]: SlashCommandContext) {
    const organisation = await this.ghService.get_organisation(
      interaction.guildId!
    );
    const embed = new EmbedBuilder().setTitle(
      `Contributing to ${organisation} Projects`
    )
      .setDescription(`Contributions to ${organisation} projects are always welcome! To contribute:
1. Find a project you're interested in on the [Github](https://github.com/${organisation}).
1. Find a feature you would like to add or a bug you would like to fix. This can either be something you've found yourself or something from the issues tab. This can be anything from a small typo fix to a large new feature.
1. [Fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo) the repository and clone it to your local machine.
1. Get a development environment set up. Most of the projects will contain instructions in their READMEs.
1. Add your changes and test locally. Make sure to follow the project's coding style, add comments to anything that might be unclear, and run any tests or formatters that are specified for the project. Be tidy and make sure not to include any unnecessary changes. If you're adding multiple features or fixes, consider creating separate [branches](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-branches) and PRs for each.
1. Push your changes to your fork and create a [pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork). Make sure to outline what you have done in the PR description. If you've fixed an issue, you can [reference it in your PR](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue).
1. Wait for a maintainer to review your PR. They may ask for changes or approve it.
      `);

    await interaction.reply({
      embeds: [embed],
    });
  }

  @SlashCommand({
    name: "ghleaderboard",
    description:
      "Get the Github contribution score leaderboard for this server",
  })
  public async ghleaderboard(
    @Context() [interaction]: SlashCommandContext,
    @Options({
      name: "before",
      description: "Only include contributions before this date",
    })
    before?: string,
    @Options({
      name: "after",
      description: "Only include contributions after this date",
    })
    after?: string
  ) {
    const guildId = interaction.guildId;

    interaction.reply({
      content: "Fetching...",
    });

    if (!guildId) {
      await interaction.editReply({
        content: "This command can only be used in a guild",
      });
      return;
    }

    let timespan: ContributionTimeSpan = {};
    try {
      if (before !== undefined) {
        timespan.end = new Date(before);
        if (!Number.isFinite(timespan.end.valueOf())) {
          timespan.end = undefined;
        }
      }
      if (after !== undefined) {
        timespan.start = new Date(after);
        if (!Number.isFinite(timespan.start.valueOf())) {
          timespan.start = undefined;
        }
      }
    } catch (error) {
      await interaction.editReply({
        content: "Invalid date format",
      });
    }

    let scores = await this.ghService.get_scores(guildId, timespan);
    if (!scores) {
      await interaction.editReply({
        content: "An error occurred while fetching the leaderboard",
      });
      return;
    }

    const members = Object.values(scores.members)
      .sort((a, b) => b.score - a.score)
      .filter((member) => member.mergedPrs > 0 || member.createdIssues > 0);

    const table = new AsciiTable3().setHeading(
      "Rank",
      "Name",
      "Score",
      "PRs",
      "Issues"
    );

    for (const [i, member] of members.entries()) {
      let name: string = member.githubUsername;
      if (name.length > 16) {
        name = `${name.substring(0, 16)}…`;
      }

      table.addRow(
        i + 1,
        name,
        member.score,
        member.mergedPrs,
        member.createdIssues
      );
    }

    const embed = new EmbedBuilder()
      .setTitle(`${scores.organisation} Contribution Leaderboard`)
      .setDescription(
        `${codeBlock(
          table.toString()
        )}\nFor information on how to contribute, use the \`/contributing\` command.`
      );

    await interaction.editReply({
      content: "",
      embeds: [embed],
    });
  }
}
