import { Inject, Injectable } from "@nestjs/common";
import { DateTime, Duration } from "luxon";
import {
  Context,
  Options,
  SlashCommand,
  createCommandGroupDecorator,
  type SlashCommandContext,
  Subcommand,
} from "necord";
import { UploadMembershipsCommandDto } from "src/dto/UploadMembershipsCommandDto";
import mainLogger from "src/logger";
import { parse } from "csv-parse";
import transform from "stream-transform/.";
import { z } from "zod";
import { guilds, membershipTypeEnum, memberships } from "src/db/schema";
import { MembershipsService } from "src/services/memberships.service";
import { ListSchema } from "src/schema/MembershipRowSchema";
import { DATABASE_TOKEN, type Database } from "src/db/db.module";
import { MembershipHasCommandDto } from "src/dto/MembershipHasCommandDto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  EmbedBuilder,
  MessageActionRowComponent,
  inlineCode,
  userMention,
} from "discord.js";
import { MembershipLinkCommandDto } from "src/dto/MembershipLinkCommandDto";
import { LinkMemberShipModal } from "src/modals/LinkMembership.modal";
import { MembershipSetMemberRoleDto } from "src/dto/MembershipSetMemberRoleDto";
import { VerifyButtonCommandDto } from "src/dto/VerifyButtonCommandDto";
import { VerifyButton } from "src/buttons/VerifyButton";
import { VerifyEmailButton } from "src/buttons/EmailButton";

export const MembershipCommandDecorator = createCommandGroupDecorator({
  name: "membership",
  description: "Membership commands",
  defaultMemberPermissions: "Administrator",
});

// ["first_name", "last_name", "preferred_name", "email", "mobile", "type", "joined_date", "end_date", "price_paid"]

@MembershipCommandDecorator()
export class UploadMembershipsCommand {
  private readonly logger = mainLogger.scope(UploadMembershipsCommand.name);

  constructor(
    private readonly membershipsService: MembershipsService,
    @Inject(DATABASE_TOKEN) private readonly db: Database,
  ) {}

  @Subcommand({
    name: "upload",
    description: "Upload the guild's memberships",
    dmPermission: false,
  })
  public async ping(
    @Context() [interaction]: SlashCommandContext,
    @Options() { csv }: UploadMembershipsCommandDto,
  ) {
    await interaction.deferReply();
    if (!csv.contentType?.includes("text/csv")) {
      await interaction.followUp({
        content: "The file must be a CSV file",
        ephemeral: true,
      });

      return;
    }

    const { guildId } = interaction;

    if (!guildId) {
      await interaction.followUp({
        content: "This command must be run in a guild",
        ephemeral: true,
      });

      return;
    }

    await this.membershipsService.registerMembers(guildId, csv.url);

    await interaction.followUp({
      content: "The bot has received your file",
      ephemeral: true,
    });

    return;
  }

  @SlashCommand({
    name: "link",
    description: "Link a user to a membership",
    dmPermission: false,
  })
  public async link(
    @Context() [interaction]: SlashCommandContext,
    @Options() { email }: MembershipLinkCommandDto,
  ) {
    const { guildId } = interaction;

    if (!guildId) {
      await interaction.reply({
        content: "This command must be run in a guild",
        ephemeral: true,
      });

      return;
    }

    const isMember = await this.membershipsService.hasMembershipEmail(
      guildId,
      email,
    );

    const isDiscordMember = await this.membershipsService.hasMembershipDiscord(
      guildId,
      interaction.user.id,
    );

    if (isDiscordMember) {
      await interaction.reply({
        content: "You are already linked to a membership",
        ephemeral: true,
      });

      return;
    }

    if (isMember) {
      this.membershipsService.sendCode(interaction.user.id, email);
    }

    await interaction.showModal(LinkMemberShipModal.getModal());

    // Open Modal
  }

  @SlashCommand({
    name: "unlink",
    description: "Unlink a user from a membership",
    dmPermission: false,
  })
  public async unlink(@Context() [interaction]: SlashCommandContext) {
    const { guildId } = interaction;

    if (!guildId) {
      await interaction.reply({
        content: "This command must be run in a guild",
        ephemeral: true,
      });

      return;
    }

    await this.membershipsService.unlink(guildId, interaction.user.id);

    await interaction.reply({
      content: "Your membership has been unlinked",
      ephemeral: true,
    });

    return;
  }

  @Subcommand({
    name: "has",
    description: "Verify a user email",
    dmPermission: false,
  })
  public async has(
    @Context() [interaction]: SlashCommandContext,
    @Options() { email, member }: MembershipHasCommandDto,
  ) {
    const { guildId } = interaction;

    if (!guildId) {
      await interaction.reply({
        content: "This command must be run in a guild",
        ephemeral: true,
      });

      return;
    }

    if (member) {
      const isMember = await this.membershipsService.hasMembershipDiscord(
        guildId,
        member.id,
      );

      if (isMember) {
        await interaction.reply({
          content: `${inlineCode(member.user.tag)} is a member`,
          ephemeral: true,
        });

        return;
      }

      await interaction.reply({
        content: `${inlineCode(member.user.tag)} is not a member`,
        ephemeral: true,
      });

      return;
    }
    if (email) {
      const isMember = await this.membershipsService.hasMembershipEmail(
        guildId,
        email,
      );

      if (isMember) {
        await interaction.reply({
          content: `${inlineCode(email)} is a member`,
          ephemeral: true,
        });

        return;
      }

      await interaction.reply({
        content: `${inlineCode(email)} is not a member`,
        ephemeral: true,
      });

      return;
    }

    await interaction.reply({
      content: "You must provide an email or a member",
      ephemeral: true,
    });

    return;
  }

  @Subcommand({
    name: "setmemberrole",
    description: "Set the member role",
    dmPermission: false,
  })
  public async setMemberRole(
    @Context() [interaction]: SlashCommandContext,
    @Options() { role }: MembershipSetMemberRoleDto,
  ) {
    const { guildId } = interaction;

    if (!guildId) {
      await interaction.reply({
        content: "This command must be run in a guild",
        ephemeral: true,
      });

      return;
    }

    await this.membershipsService.setGuildMemberRole(guildId, role.id);

    await interaction.reply({
      content: `The member role has been set to ${role.toString()}`,
      ephemeral: true,
    });

    return;
  }

  @Subcommand({
    name: "unsetmemberrole",
    description: "Unset the member role",
    dmPermission: false,
  })
  public async unsetMemberRole(@Context() [interaction]: SlashCommandContext) {
    const { guildId } = interaction;

    if (!guildId) {
      await interaction.reply({
        content: "This command must be run in a guild",
        ephemeral: true,
      });

      return;
    }

    await this.membershipsService.unsetGuildMemberRole(guildId);

    await interaction.reply({
      content: "The member role has been unset",
      ephemeral: true,
    });

    return;
  }

  @Subcommand({
    name: "verifybutton",
    description: "Prompt a user to link their membership",
    dmPermission: false,
    nsfw: false,
  })
  public async button(
    @Context() [interaction]: SlashCommandContext,
    @Options() { channel, message }: VerifyButtonCommandDto,
  ) {
    const { guildId } = interaction;

    if (!guildId) {
      await interaction.reply({
        content: "This command must be run in a guild",
        ephemeral: true,
      });

      return;
    }

    const button = VerifyEmailButton.getButton();
    const messageComponent =
      new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    if (!channel.isTextBased()) {
      await interaction.reply({
        content: "The channel must be a text channel",
        ephemeral: true,
      });

      return;
    }

    await channel.send({
      content: message,
      components: [messageComponent],
    });

    return interaction.reply({
      content: "The button has been sent",
      ephemeral: true,
    });
  }

  @Subcommand({
    name: "clear",
    description: "Clear the guild's memberships",
    dmPermission: false,
  })
  public async clear(@Context() [interaction]: SlashCommandContext) {
    const { guildId } = interaction;

    if (!guildId) {
      await interaction.reply({
        content: "This command must be run in a guild",
        ephemeral: true,
      });

      return;
    }

    await this.membershipsService.clearMemberships(guildId);

    await interaction.reply({
      content: "The memberships have been cleared",
      ephemeral: true,
    });

    return;
  }

  @Subcommand({
    name: "stats",
    description: "Display ProgSoc membership statistics",
    dmPermission: false,
  })
  public async stats(@Context() [interaction]: SlashCommandContext) {
    const { guildId } = interaction;

    // dmPermission doesn't seem to have any effect, so make sure we are in a guild.
    if (!guildId) {
      await interaction.reply({
        content: "This command must be run in a guild",
        ephemeral: true,
      });

      return;
    }

    const { members, membersLastUpdated } =
      await this.membershipsService.anonymised(guildId);

    // IDEA: column-chart plot over the year

    const embed = new EmbedBuilder()
      .setTitle("ProgSoc Membership Statistics")
      .setDescription(
        "Statistics for ProgSoc membership, has to be updated manually by the exec team. Ping an exec if it's out of date.",
      )
      .addFields([
        {
          name: "Members",
          value: members.length.toString(),
        },
      ])
      .setColor("#38B6FF");

    if (membersLastUpdated) {
      embed.setTimestamp(DateTime.fromISO(membersLastUpdated).toJSDate());
    }

    await interaction.reply({
      embeds: [embed],
      content: "Here are the membership statistics",
    });
  }
}
