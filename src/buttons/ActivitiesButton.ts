import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Button, ButtonContext, ComponentParam, Context } from 'necord';
import { DATABASE_TOKEN, Database } from 'src/db/db.module';
import { subject } from 'src/db/schema';

@Injectable()
export class ActivitiesButton {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  @Button('timetable/:year/:subjectId/activities')
  public async onSubjectActivities(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('year') year: string,
    @ComponentParam('subjectId') subjectId: string,
  ) {
    return interaction.reply({
      content: 'Not implemented yet',
      ephemeral: true,
    });
  }
}
