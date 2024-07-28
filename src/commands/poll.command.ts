import { Injectable } from "@nestjs/common";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionResponse,
  ModalBuilder,
  PermissionsBitField,
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
  Button,
  Modal,
  type SlashCommandContext,
  type ButtonContext,
  type ModalContext,
  ComponentParam,
  ModalParam,
} from "necord";
import mainLogger from "src/logger";

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
    description: "The poll duration (min 1h, max 32d or 4w). Accepted units: h, d, w",
    required: true,
  })
  duration: string;
  @BooleanOption({
    name: "allow_multiselect",
    description: "Allow multiple options to be selected",
    required: true,
  })
  allow_multiselect: boolean;
}

export class PollExportCommandDto {
  @StringOption({
    name: "channel_id",
    description: "The channel id of the poll message. Get this by right click channel > 'Copy Channel ID'",
    required: true,
  })
  channel_id: string;
  @StringOption({
    name: "poll_message_id",
    description: "The message id of the poll message. Get this by right click poll > 'Copy Message ID'",
    required: true,
  })
  poll_message_id: string;
  @BooleanOption({
    name: "reply_privately",
    description: "Whether to export the poll to you only. Defaults to true.",
    required: false,
  })
  reply_privately: boolean;
}

type PollCreateMessage = {
  message: InteractionResponse<boolean>
  question: string,
  answers: string[],
  duration_h: number,
  allow_multiselect: boolean,
  allow_mention_everyone: boolean,
};

@Injectable()
export class PollCommand {
  private readonly logger = mainLogger.scope(PollCommand.name);

  private polls: Record<string, PollCreateMessage> = {};
  private message: string | undefined;

  constructor(private readonly PollService: PollService) {}

  @SlashCommand({
    name: "poll_export",
    description: "Export poll results",
  })
  public async poll_export(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: PollExportCommandDto,
  ) {
    const {
      channel_id,
      poll_message_id,
      reply_privately = true
    } = data;

    const original_command = `/poll_export channel_id:${channel_id} poll_message_id:${poll_message_id} reply_privately:${reply_privately}`;
    let content = `### Original command:\n${original_command}`;

    const message = await this.PollService.pollGet(interaction.channelId, poll_message_id);
    if (!message.poll) {
      content += `\nPoll not found`;
      await interaction.reply({
        content,
        ephemeral: reply_privately,
      });
      return;
    }

    const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(message.poll, null, 2)), {
      name: `poll_${channel_id}_${poll_message_id}.json`,
    });

    await interaction.reply({
      content,
      ephemeral: reply_privately,
      files: [attachment],
    });
  }

  @SlashCommand({
    name: "poll_create",
    description: "Create a poll in the current channel",
  })
  public async poll_create(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: PollCreateCommandDto,
  ) {
    const { question, options, duration, allow_multiselect } = data;
    
    const original_command = `/poll_create question:${question} options:${options} duration:${duration} allow_multiselect:${allow_multiselect}`;
    let content = `### Original command:\n${original_command}`;

    const answers = options.split(",").map(option => option.trim()).filter(option => option.length > 0);
    if (answers.length > 10) {
      content += `\nMax 10 answer options. Please enter a comma-separated list of up to 10 options.`;
      await interaction.reply({
        content,
        ephemeral: true,
      });
      return;
    }

    const duration_match = duration.match(/(\d+)([hdw])/);
    if (!duration_match) {
      content += `\nInvalid duration. Accepts a whole number followed by a unit from the following: h, d, w (e.g. 1h, 2d, 3w)`;
      await interaction.reply({
        content,
        ephemeral: true,
      });
      return;
    }

    let duration_h = parseInt(duration_match[1]);
    const durationUnit = duration_match[2];
    switch (durationUnit) {
      case "h":
        duration_h *= 1;
        break;
      case "d":
        duration_h *= 24;
        break;
      case "w":
        duration_h *= 24 * 7;
        break;
    }
    if (duration_h < 1 || duration_h > 32 * 24) {
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

    const message_set_button = new ButtonBuilder()
      .setCustomId(`message_set_button/${interaction.id}`)
      .setLabel("Add/Edit Message")
      .setStyle(ButtonStyle.Secondary);

    const publish = new ButtonBuilder()
      .setCustomId(`publish/${interaction.id}`)
      .setLabel("Publish")
      .setStyle(ButtonStyle.Primary);

    const row_1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      message_set_button
    );
    const row_2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      publish
    );

    const poll = {
      question: {
        text: question,
      },
      answers: answers.map((option, index) => ({
        text: option,
      })),
      duration: duration_h,
      allowMultiselect: allow_multiselect,
      layoutType: PollLayoutType.Default
    };
    
    const message = await interaction.reply({
      content: `Preview:\n`,
      ephemeral: true,
      components: [row_1, row_2],
      poll,
    });

    this.logger.debug(`poll_create/${interaction.id}`);
    this.polls[interaction.id] = {
      message,
      question,
      answers,
      duration_h,
      allow_multiselect,
      allow_mention_everyone,
    };
  }

  @Button('message_set_button/:id')
  public async handleAddMessage(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('id') id: string,
  ) {
    this.logger.debug(`message_set_button/${id}`);
    const modal = new ModalBuilder()
      .setCustomId(`message_set_modal/${id}`)
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
    return;
  }

  @Button('publish/:id')
  public async handlePublishPoll(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('id') id: string,
  ) {
    this.logger.debug("publish", id);
    const data = this.polls[id];
    if (!data) {
      return;
    }
    const { question, answers, duration_h, allow_multiselect, allow_mention_everyone } = data;
    const poll: RESTAPIPollCreate = {
      question: {
        text: question,
      },
      answers: answers.map((option, index) => ({
        poll_media: {
          text: option,
        },
      })),
      duration: duration_h,
      allow_multiselect,
      layout_type: PollLayoutType.Default
    };

    const _ = await this.PollService.pollCreate(
      interaction.channelId,
      poll,
      this.message,
      allow_mention_everyone
    );
    
    await data.message.delete().catch(e => this.logger.error("handlePublishPoll data.message.delete", e));
    delete this.polls[interaction.id];

    return;
  }

  @Modal('message_set_modal/:id')
  public async handleModalSubmit(
    @Context() [interaction]: ModalContext,
    @ModalParam('id') id: string,
  ) {
    this.message = interaction.fields.getTextInputValue('message');
    this.polls[id].message.edit({
      content: `Preview:\n${this.message}`,
    });
    await interaction.reply({
      content: "Poll message updated",
      ephemeral: true,
    });
    await interaction.deleteReply();
    return;
  }
}