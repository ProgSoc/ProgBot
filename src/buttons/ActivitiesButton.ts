import { Inject, Injectable } from '@nestjs/common';
import {
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  hyperlink,
  time,
} from 'discord.js';
import { eq } from 'drizzle-orm';
import { Button, type ButtonContext, ComponentParam, Context } from 'necord';
import { DATABASE_TOKEN, type Database } from 'src/db/db.module';
import { subject } from 'src/db/schema';
import {
  ActivitySchemaType,
  TimetableService,
} from 'src/services/timetable.service';

@Injectable()
export class ActivitiesButton {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly timetableService: TimetableService,
  ) {}

  @Button('timetable/:year/:semester/:subjectId/activities')
  public async onSubjectActivities(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('year') year: string,
    @ComponentParam('subjectId') subjectId: string,
    @ComponentParam('semester') semester: string,
  ) {
    await interaction.deferReply();
    const odd = parseInt(year) % 2 === 1;

    const subjectTimetable = await this.timetableService.getSubjectTimetable(
      subjectId,
      parseInt(year),
      semester as any,
    );
    const firstSubject = subjectTimetable.at(0);

    if (!firstSubject) {
      return interaction.reply({
        ephemeral: true,
        content: "Couldn't find subject.",
      });
    }

    const activityEmbeds: Array<Array<EmbedBuilder>> = [];
    // chunk activities in groups of 10
    Object.values(firstSubject.activities)
      // .filter((acitivty) => !!acitivty.availability)
      .forEach((activity, index) => {
        // round down
        const pageIndex = Math.floor(index / 10);
        const page = activityEmbeds.at(pageIndex);
        if (!page) {
          activityEmbeds[pageIndex] = [SubjectActivityBuilder(activity)];
        } else {
          activityEmbeds[pageIndex].push(SubjectActivityBuilder(activity));
        }
      });

    if (!activityEmbeds.length) {
      await interaction.reply({
        ephemeral: true,
        content: 'No available activities found',
      });
    }

    activityEmbeds.forEach(async (embeds, pageIndex) => {
      await interaction.followUp({
        embeds,
        content: `Page ${pageIndex + 1}`,
        ephemeral: true,
      });
    });
  }

  public static ActivityButtonBuilder(
    year: number,
    semester: string,
    subjectId: string,
  ) {
    return new ButtonBuilder()
      .setCustomId(`timetable/${year}/${semester}/${subjectId}/activities`)
      .setLabel('Activities')
      .setStyle(ButtonStyle.Secondary);
  }
}

const SubjectActivityBuilder = (activity: ActivitySchemaType) => {
  /** Tut1 */
  const activityGroup = activity.activity_group_code;
  /** Activity Index e.g. 1, 2, 3 */
  const activityIndex = activity.activity_code;
  /** Location, e.g. ONLINE or CB11.05.202 */
  const location = activity.location;
  /** Availability */
  const availability = activity.availability;
  const description = activity.description;
  const colour = activity.color as `#`; // As hex to satisfy type
  const dateTime = `${activity.start_time} ${activity.day_of_week}`;
  const durationInHours = activity.duration / 60;

  return new EmbedBuilder()
    .setTitle(`${activityGroup} ${activityIndex}`)
    .setDescription(description)
    .setColor(colour)
    .addFields(
      { name: 'Location', value: location, inline: true },
      {
        name: 'Availability',
        value: availability.toString(),
        inline: true,
      },
      {
        name: 'Time',
        value: dateTime,
        inline: true,
      },
      {
        name: 'Duration',
        value:
          durationInHours === 1 ? `${durationInHours}` : `${durationInHours}s`,
        inline: true,
      },
    );
};
