import { Injectable } from "@nestjs/common";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  PollData,
  PollLayoutType
} from "discord.js";
import {
  Context,
  Options,
  SlashCommand,
  BooleanOption,
  StringOption
} from "necord";

import { PollService } from "src/services/poll.service";

export class PollCreateCommandDto {
  @StringOption({
    name: "question",
    description: "The poll question",
    required: true,
  })
  question: string;
  @StringOption({
    name: "options",
    description: "The poll options separated by a comma (max 10)",
    required: true,
  })
  options: string;
  @StringOption({
    name: "duration",
    description: "The duration of the poll (min 1h, max 32d or 4w). Accepts a whole number followed by a unit from the following: h, d, w",
    required: true,
  })
  duration: string;
  @BooleanOption({
    name: "allowMultiselect",
    description: "Allow multiple options to be selected",
    required: true,
  })
  allowMultiselect: boolean;
}

export class PollExportCommandDto {
  @StringOption({
    name: "channelId",
    description: "The channel id of the poll. Get this by right clicking the channel and selecting 'Copy Channel ID'",
    required: true,
  })
  channelId: string;
  @StringOption({
    name: "messageId",
    description: "The message id of the poll. Get this by right clicking on the poll and selecting 'Copy Message ID'",
    required: true,
  })
  messageId: string;
  @BooleanOption({
    name: "replyPrivately",
    description: "Whether to send the poll results as a private message",
    required: false,
  })
  replyPrivately: boolean = true;
}

@Injectable()
export class PollCommand {
  constructor(private readonly PollService: PollService) {}

  @SlashCommand({
    name: "poll_export",
    description: "Export poll results",
  })
  public async poll_export(
    @Context() interaction: ChatInputCommandInteraction | ButtonInteraction,
    @Options() {
      channelId,
      messageId,
      replyPrivately,
    }: PollExportCommandDto,
  ) {
    const originalCommand = `/poll_export channelId:${channelId} messageId:${messageId} replyPrivately:${replyPrivately}`;
    let content = `Original command: ${originalCommand}`;

    const message = await this.PollService.pollGet(interaction.channelId, messageId);
    if (!message.poll) {
      content += `\nPoll not found`;
      await interaction.reply({
        content,
        ephemeral: replyPrivately,
      });
      return;
    }

    const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(message.poll, null, 2)), {
      name: `poll_${channelId}_${messageId}.json`,
    });

    await interaction.reply({
      content,
      ephemeral: replyPrivately,
      files: [attachment],
    });
  }

  @SlashCommand({
    name: "poll_create",
    description: "Create a poll",
  })
  public async poll_create(
    @Context() interaction: ChatInputCommandInteraction | ButtonInteraction,
    @Options() {
      question,
      options,
      duration,
      allowMultiselect,
    }: PollCreateCommandDto,
  ) {
    const originalCommand = `/poll_create question:${question} options:${options} duration:${duration} allowMultiselect:${allowMultiselect}`;
    let content = `Original command: ${originalCommand}`;

    const answers = options.split(",").map(option => option.trim());
    if (answers.length > 10) {
      content += `\nMax 10 answer options. Please enter a comma-separated list of up to 10 options.`;
      await interaction.reply({
        content,
        ephemeral: true,
      });
      return;
    }

    const durationMatch = duration.match(/(\d+)([hdw])/);
    if (!durationMatch) {
      content += `\nInvalid duration. Accepts a whole number followed by a unit from the following: h, d, w (e.g. 1h, 2d, 3w)`;
      await interaction.reply({
        content,
        ephemeral: true,
      });
      return;
    }

    let durationHours = parseInt(durationMatch[1]);
    const durationUnit = durationMatch[2];
    switch (durationUnit) {
      case "h":
        durationHours *= 1;
        break;
      case "d":
        durationHours *= 24;
        break;
      case "w":
        durationHours *= 24 * 7;
        break;
    }
    if (durationHours < 1 || durationHours > 32 * 24) {
      content += `\nPlease enter a duration between 1h and 32d or 4w`;
      await interaction.reply({
        content,
        ephemeral: true,
      });
      return;
    }

    const poll: PollData = {
      question: {
        text: question,
      },
      answers: answers.map((option, index) => ({
        text: option,
      })),
      duration: durationHours,
      allowMultiselect,
      layoutType: PollLayoutType.Default
    };

    if (interaction instanceof ButtonInteraction) {
      switch (interaction.customId) {
        case "publish_poll":
          const _ = await this.PollService.pollCreate(interaction.channelId, {
            question: {
              text: question,
            },
            answers: answers.map((option, index) => ({
              answer_id: index + 1,
              poll_media: {
                text: option,
              },
            })),
            duration: durationHours,
            allow_multiselect: allowMultiselect,
            layout_type: PollLayoutType.Default
          });
          break;
      }
      
      return;
    }

    const publish = new ButtonBuilder()
      .setCustomId("publish_poll")
      .setLabel("Publish")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(publish);

    await interaction.reply({
      content,
      ephemeral: true,
      components: [row],
      poll
    });
  }
}