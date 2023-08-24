import { Injectable } from '@nestjs/common';
import { EmbedBuilder } from 'discord.js';
import {
  Context,
  Options,
  SlashCommand,
  type SlashCommandContext,
} from 'necord';
import { TimetableActivitiesCommandDto } from 'src/dto/TimetableActivitiesCommandDto';
import mainLogger from 'src/logger';
import { TimetableService } from 'src/timetable.service';

@Injectable()
export class TimetableCommand {
  private readonly logger = mainLogger.scope(TimetableCommand.name);

  constructor(private readonly timetableService: TimetableService) {}

  @SlashCommand({
    name: 'timetable',
    description: 'Get the timetable of a subject',
  })
  public async timetable(
    @Context() [interaction]: SlashCommandContext,
    @Options()
    { code, session, year: inputYear }: TimetableActivitiesCommandDto,
  ) {
    await interaction.deferReply();
    const year = inputYear ?? new Date().getFullYear();

    this.logger.info('Timetable command received');

    const timetable = await this.timetableService.getSubjectTimetable(
      code,
      year,
      session,
    );

    const firstSubject = timetable[0];

    if (!firstSubject) {
      await interaction.followUp({
        content: 'No subjects found',
        ephemeral: true,
      });
      return;
    }

    const subjectEmbed = new EmbedBuilder()
      .setTitle(firstSubject.description)
      .setDescription(firstSubject.subject_code)
      .addFields([
        {
          name: 'Acitivity Count',
          value: firstSubject.activity_count?.toString() ?? 'Unknown',
        },
      ])
      .setColor('Blue');

    await interaction.followUp({
      embeds: [subjectEmbed],
      ephemeral: true,
    });
  }
}
