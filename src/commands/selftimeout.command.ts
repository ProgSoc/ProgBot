import { Injectable } from "@nestjs/common";
import {
  Context,
  Options,
  SlashCommand,
  type SlashCommandContext,
} from "necord";
import mainLogger from "src/logger";
import { APIInteractionGuildMember, GuildMember, time } from "discord.js";
import { TimeoutCommandDto } from "src/dto/TimeoutCommandDto";

@Injectable()
export class SelfTimeoutCommand {
  private readonly logger = mainLogger.scope(SelfTimeoutCommand.name);

  @SlashCommand({
    name: "selftimeout",
    description: "Time yourself out to better focus.",
    dmPermission: false,
  })
  public async ping(
    @Context() [interaction]: SlashCommandContext,
    @Options() { timeout }: TimeoutCommandDto,
  ) {
    try {
      const { member } = interaction;

      if (!(member instanceof GuildMember)) {
        return interaction.reply(
          "You must be in a server to use this command.",
        );
      }

      if (!interaction.appPermissions?.has("ModerateMembers")) {
        return interaction.reply({
          ephemeral: true,
          content:
            "The bot needs the `ModerateMembers` permission to use this command.",
        });
      }

      if (member.permissions.has("Administrator")) {
        return interaction.reply({
          ephemeral: true,
          content: "You cannot time out an admin.",
        });
      }

      if (member.guild.ownerId === member.id) {
        return interaction.reply({
          ephemeral: true,
          content: "You cannot time out the owner of the server.",
        });
      }

      try {
        await member.timeout(timeout);
      } catch (error) {
        return interaction.reply({
          ephemeral: true,
          content: `Failed to timeout ${member.toString()}.`,
        });
      }

      await interaction.reply({
        ephemeral: true,
        content: `Timed out ${member.toString()} for ${timeout} minutes.`,
      });
    } catch (error) {
      this.logger.error("erro", error);
    }
  }
}
