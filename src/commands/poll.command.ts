import { Injectable } from "@nestjs/common";
import {
  ActionRowBuilder,
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

export class PollCommandDto {
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

@Injectable()
export class PollCommand {
  constructor(private readonly PollService: PollService) {}

  @SlashCommand({
    name: "poll",
    description: "Create a poll",
  })
  
  public async poll(
    @Context() interaction: ChatInputCommandInteraction | ButtonInteraction,
    @Options() {
      question,
      options,
      duration,
      allowMultiselect,
    }: PollCommandDto,
  ) {
    const originalCommand = `/poll question:${question} options:${options} duration:${duration} allowMultiselect:${allowMultiselect}`;
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