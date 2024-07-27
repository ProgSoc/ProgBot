import { Injectable } from "@nestjs/common";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  PermissionsBitField,
  PollData,
  PollLayoutType,
  RESTAPIPollCreate,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import {
  Context,
  Options,
  SlashCommand,
  BooleanOption,
  StringOption,
  SlashCommandContext,
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
    description: "The poll options, separated by a comma (max 10)",
    required: true,
  })
  options: string;
  @StringOption({
    name: "duration",
    description: "The poll duration (min 1h, max 32d or 4w). Accepts a whole number followed by a unit from the following: h, d, w",
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
    description: "The channel id of the poll message. Get this by right clicking the channel and selecting 'Copy Channel ID'",
    required: true,
  })
  channelId: string;
  @StringOption({
    name: "messageId",
    description: "The message id of the poll message. Get this by right clicking on the poll and selecting 'Copy Message ID'",
    required: true,
  })
  messageId: string;
  @BooleanOption({
    name: "replyPrivately",
    description: "Whether to send the poll results as a private message. Defaults to true.",
    required: false,
  })
  replyPrivately: boolean = true;
}

@Injectable()
export class PollCommand {
  constructor(private readonly PollService: PollService) { }

  @SlashCommand({
    name: "poll_export",
    description: "Export poll results",
  })
  public async poll_export(
    @Context() [interaction]: SlashCommandContext,
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
    @Context() interaction: ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction,
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

    let allow_mention_everyone = false;
    if (interaction.memberPermissions
      && interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages)
    ) {
      allow_mention_everyone = true;
    }

    let message: string | undefined;
    if (interaction instanceof ModalSubmitInteraction) {
      switch (interaction.customId) {
        case "add_poll_message":
          message = interaction.fields.getTextInputValue('message');
          break;
      }
      return;
    }

    if (interaction instanceof ButtonInteraction) {
      switch (interaction.customId) {
        case "add_message":
          const modal = new ModalBuilder()
            .setCustomId('add_poll_message')
            .setTitle('Poll Message')
            .addComponents(
              new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId('message')
                  .setLabel('Message')
                  .setMaxLength(2000)
                  .setStyle(TextInputStyle.Paragraph)
                  .setRequired(false)
              )
            );
          await interaction.showModal(modal);
          break;
        case "publish_poll":
          const poll: RESTAPIPollCreate = {
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
          };
          const _ = await this.PollService.pollCreate(
            interaction.channelId,
            poll,
            message,
            allow_mention_everyone
          );
          break;
      }
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

    const add_message = new ButtonBuilder()
      .setCustomId("add_message")
      .setLabel("Add Message")
      .setStyle(ButtonStyle.Secondary);

    const publish = new ButtonBuilder()
      .setCustomId("publish_poll")
      .setLabel("Publish")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(add_message, publish);

    await interaction.reply({
      ephemeral: true,
      components: [row],
      poll
    });
  }
}