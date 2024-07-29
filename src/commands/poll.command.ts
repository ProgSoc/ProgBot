import { Injectable } from "@nestjs/common";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionResponse,
  ModalBuilder,
  PermissionsBitField,
  PollAnswerData,
  PollData,
  PollLayoutType,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import {
  Context,
  Options,
  SlashCommand,
  Button,
  type SlashCommandContext,
  type ButtonContext,
  ComponentParam,
  createCommandGroupDecorator,
  Subcommand,
} from "necord";

import { PollService } from "src/services/poll.service";
import { PollCreateCommandDto } from "src/dto/PollCreateCommandDto";
import { PollExportCommandDto } from "src/dto/PollExportCommandDto";
import { PollEndCommandDto } from "src/dto/PollEndCommandDto";

import mainLogger from "src/logger";

type PollCreateSlashCommand = {
  command_name: string,
  command_data: PollCreateCommandDto,
  reply: InteractionResponse<boolean>,
  poll: PollData,
  allow_mention_everyone: boolean
};

export const PollCommandDecorator = createCommandGroupDecorator({
  name: "poll",
  description: "Commands related to polls",
});

const get_command = <T extends Record<string, any>>(
  command: string,
  data: T
): string => {
  return `/${command} ${Object.entries(data).map(([key, value]) => `${key}:${value}`).join(" ")}`;
};

@PollCommandDecorator()
export class PollCommand {
  private readonly logger = mainLogger.scope(PollCommand.name);
  private polls: Record<string, PollCreateSlashCommand> = {};

  constructor(private readonly PollService: PollService) {}

  @Subcommand({
    name: "export",
    description: "Export poll results in the current channel",
  })
  public async export(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: PollExportCommandDto,
  ) {
    const {
      message_id,
      reply_privately,
    } = data;

    const message = await this.PollService.pollGet(interaction.channelId, message_id);
    if (!message.poll) {
      const content = `Poll not found`;
      await interaction.reply({
        content,
        ephemeral: reply_privately,
      });
      return;
    }

    const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(message.poll, null, 2)), {
      name: `poll_${interaction.channelId}_${message_id}.json`,
    });

    await interaction.reply({
      content: `Poll exported: https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${message.id}`,
      ephemeral: reply_privately,
      files: [attachment],
    });
  }

  @Subcommand({
    name: "create",
    description: "Preview and create a poll in the current channel",
  })
  public async create(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: PollCreateCommandDto,
  ) {
    const {
      question,
      options,
      duration,
      allow_multiselect,
      poll_message,
    } = data;

    const answers = options.split(",").map(option => option.trim()).filter(option => option.length > 0);
    if (answers.length > 10) {
      const content = `Please enter a comma-separated list of up to 10 options.`;
      await interaction.reply({
        content,
        ephemeral: true,
      });
      return;
    }

    const duration_h = this.get_duration_h(duration);
    if (!duration_h) {
      const content = `Please enter a duration between 1h and 32d or 4w. Accepted units: h, d, w`;
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

    const message_set = new ButtonBuilder()
      .setCustomId(`message_set/${interaction.id}`)
      .setLabel("Set Message")
      .setStyle(ButtonStyle.Secondary);
    
    const poll_edit_question = new ButtonBuilder()
      .setCustomId(`poll_edit_question/${interaction.id}`)
      .setLabel("Edit Question")
      .setStyle(ButtonStyle.Secondary);

    const poll_add_answer = new ButtonBuilder()
      .setCustomId(`poll_add_answer/${interaction.id}`)
      .setLabel("Add Option")
      .setStyle(ButtonStyle.Secondary);
    
    const poll_del_answer = new ButtonBuilder()
      .setCustomId(`poll_del_answer/${interaction.id}`)
      .setLabel("Remove Option")
      .setStyle(ButtonStyle.Secondary);
    
    const poll_set_duration = new ButtonBuilder()
      .setCustomId(`poll_set_duration/${interaction.id}`)
      .setLabel("Set Duration")
      .setStyle(ButtonStyle.Secondary);
    
    const show_command = new ButtonBuilder()
      .setCustomId(`show_command/${interaction.id}`)
      .setLabel("Show Command")
      .setStyle(ButtonStyle.Secondary);

    const publish = new ButtonBuilder()
      .setCustomId(`publish/${interaction.id}`)
      .setLabel("Publish")
      .setStyle(ButtonStyle.Primary);

    const row_1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      message_set,
      poll_edit_question,
      poll_add_answer,
      poll_del_answer,
      poll_set_duration,
    );
    const row_2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      show_command,
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
    
    const reply = await interaction.reply({
      content: `Note: Please rerun the command to preview the updated poll.\nPreview:\n${poll_message ? poll_message : ""}`,
      ephemeral: true,
      components: [row_1, row_2],
      poll,
    });

    this.polls[interaction.id] = {
      command_name: interaction.commandName,
      command_data: data,
      reply,
      poll,
      allow_mention_everyone
    };
  }

  @Button('show_command/:id')
  public async handle_show_command(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('id') id: string,
  ) {
    const data = this.polls[id];
    if (!data) {
      await interaction.reply({
        content: `Poll not found, please try again.`,
        ephemeral: true,
      });
      return;
    }
    const { command_name, command_data } = data;
    
    await interaction.reply({
      content: `### Command:\n${get_command(command_name, command_data)}`,
      ephemeral: true,
    });

    return;
  }
  
  @Button('publish/:id')
  public async handle_publish(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('id') id: string,
  ) {
    const data = this.polls[id];
    if (!data) {
      await interaction.reply({
        content: `Poll not found, please try again.`,
        ephemeral: true,
      });
      return;
    }
    const { command_name, command_data, reply, poll, allow_mention_everyone } = data;

    const _ = await this.PollService.pollCreate(
      interaction.channelId,
      {
        question: poll.question,
        answers: poll.answers.map(answer => ({
          poll_media: {
            text: answer.text,
          }
        })),
        duration: poll.duration,
        allow_multiselect: poll.allowMultiselect,
        layout_type: poll.layoutType as PollLayoutType
      },
      command_data.poll_message,
      allow_mention_everyone
    );
    
    await reply.delete().catch(e => this.logger.error("handle_publish data.message.delete", e));
    delete this.polls[interaction.id];

    return;
  }

  @Button('message_set/:id')
  public async handle_message_set(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('id') id: string,
  ) {
    const data = this.polls[id];
    if (!data) {
      await interaction.reply({
        content: `Poll not found, please try again.`,
        ephemeral: true,
      });
      return;
    }
    const { command_name, command_data, reply, poll, allow_mention_everyone } = data;

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

    const res = await interaction.awaitModalSubmit({
      time: 1000 * 60 * 5, // 5 minutes
      filter: (interaction) => interaction.customId === `message_set_modal/${id}`,
    });
    command_data.poll_message = res.fields.getTextInputValue('message');
    
    await reply.edit({
      content: `Preview:\n${command_data.poll_message}`,
    });

    await res.reply({
      content: `Poll message set: ${command_data.poll_message}`,
      ephemeral: true,
    });
    await res.deleteReply();
    return;
  }

  @Button('poll_edit_question/:id')
  public async handle_edit_poll_question(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('id') id: string,
  ) {
    const data = this.polls[id];
    if (!data) {
      await interaction.reply({
        content: `Poll not found, please try again.`,
        ephemeral: true,
      });
      return;
    }
    const { command_name, command_data, reply, poll, allow_mention_everyone } = data;

    const modal = new ModalBuilder()
      .setCustomId(`edit_poll_question_modal/${id}`)
      .setTitle('Edit Question')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('question')
            .setLabel('Question')
            .setMaxLength(300)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);

    const res = await interaction.awaitModalSubmit({
      time: 1000 * 60 * 5, // 5 minutes
      filter: (interaction) => interaction.customId === `edit_poll_question_modal/${id}`,
    });
    const question = res.fields.getTextInputValue('question');

    poll.question.text = question;
    command_data.question = question;

    await reply.edit({
      poll,
    });

    await res.reply({
      content: `Question set: ${question}`,
      ephemeral: true,
    });
    await res.deleteReply();
    return;
  }

  @Button('poll_add_answer/:id')
  public async handle_add_poll_answer(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('id') id: string,
  ) {
    const data = this.polls[id];
    if (!data) {
      await interaction.reply({
        content: `Poll not found, please try again.`,
        ephemeral: true,
      });
      return;
    }
    const { command_name, command_data, reply, poll, allow_mention_everyone } = data;

    const poll_answers = poll.answers as PollAnswerData[];
    if (poll_answers.length === 10) {
      await interaction.reply({
        content: "Max 10 answer options. Please remove an option to add another.",
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`add_poll_answer_modal/${id}`)
      .setTitle('Add Option')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('answer')
            .setLabel('Option')
            .setMaxLength(55)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);

    const res = await interaction.awaitModalSubmit({
      time: 1000 * 60 * 5, // 5 minutes
      filter: (interaction) => interaction.customId === `add_poll_answer_modal/${id}`,
    });
    const answer = res.fields.getTextInputValue('answer');
    poll_answers.push({
      text: answer,
    });

    poll.answers = poll_answers;
    command_data.options = poll_answers.map(answer => answer.text).join(",");

    await reply.edit({
      poll: poll,
    });

    await res.reply({
      content: `Option added: ${answer}`,
      ephemeral: true,
    });
    await res.deleteReply();
    return;
  }

  @Button('poll_del_answer/:id')
  public async handle_del_poll_answer(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('id') id: string,
  ) {
    const data = this.polls[id];
    if (!data) {
      await interaction.reply({
        content: `Poll not found, please try again.`,
        ephemeral: true,
      });
      return;
    }
    const { command_name, command_data, reply, poll, allow_mention_everyone } = data;

    const poll_answers = poll.answers as PollAnswerData[];
    if (poll_answers.length === 1) {
      await interaction.reply({
        content: "Must have at least one answer option",
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`del_poll_answer_modal/${id}`)
      .setTitle('Remove Option')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('index')
            .setLabel('Option Index (0-9)')
            .setMaxLength(1)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
    );
    await interaction.showModal(modal);

    const res = await interaction.awaitModalSubmit({
      time: 1000 * 60 * 5, // 5 minutes
      filter: (interaction) => interaction.customId === `del_poll_answer_modal/${id}`,
    });
    const index = parseInt(res.fields.getTextInputValue('index'));
    if (isNaN(index) || index < 0 || index > 9 || index >= poll_answers.length) {
      await res.reply({
        content: "Invalid option index",
        ephemeral: true,
      });
      return;
    }

    const answer = poll_answers[index].text;
    poll_answers.splice(index, 1);

    poll.answers = poll_answers;
    command_data.options = poll_answers.map(answer => answer.text).join(",");

    await reply.edit({
      poll: poll,
    });

    await res.reply({
      content: `Option removed: ${answer}`,
      ephemeral: true,
    });
    await res.deleteReply();
    return;
  }

  @Button('poll_set_duration/:id')
  public async handle_set_duration(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('id') id: string,
  ) {
    const data = this.polls[id];
    if (!data) {
      await interaction.reply({
        content: `Poll not found, please try again.`,
        ephemeral: true,
      });
      return;
    }
    const { command_name, command_data, reply, poll, allow_mention_everyone } = data;

    const modal = new ModalBuilder()
      .setCustomId(`poll_set_duration_modal/${id}`)
      .setTitle('Set Duration')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('duration')
            .setLabel('Duration (e.g., 1h, 2d, 3w)')
            .setMinLength(2)
            .setMaxLength(4)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    await interaction.showModal(modal);

    const res = await interaction.awaitModalSubmit({
      time: 1000 * 60 * 5, // 5 minutes
      filter: (interaction) => interaction.customId === `poll_set_duration_modal/${id}`,
    });
    const duration = res.fields.getTextInputValue('duration');
    const duration_h = this.get_duration_h(duration);
    if (!duration_h) {
      await interaction.reply({
        content: "Please enter a duration between 1h and 32d or 4w. Accepted units: h, d, w",
        ephemeral: true,
      });
      return;
    }

    poll.duration = duration_h;
    command_data.duration = duration;

    await reply.edit({
      poll: poll,
    });

    await res.reply({
      content: `Duration set: ${duration}`,
      ephemeral: true,
    });
    await res.deleteReply();
    return;
  }

  private get_duration_h(
    duration: string
  ): number | undefined {
    const duration_match = duration.match(/(\d+)([hdw])/);
    if (!duration_match) {
      return undefined;
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
      return undefined;
    }
    return duration_h;
  }
}