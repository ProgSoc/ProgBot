import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { type Cache } from 'cache-manager';
import { z } from 'zod';
import mainLogger from '../logger';

const activitySchema = z.object({
  /**
   * 010024_AUT_U_1_S
   */
  subject_code: z.string(),
  activity_group_code: z.string(),
  activity_code: z.coerce.number(),
  campus: z.string(),
  day_of_week: z.string(),
  /** 17:30 */
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  /** CB10.04.430 */
  location: z.string(),
  duration: z.coerce.number(),
  selectable: z.string(),
  availability: z.number(),
  week_pattern: z.coerce.number(),
  description: z.string(),
  zone: z.string(),
  semester: z.string(),
  semester_description: z.string(),
  activity_type: z.string(),
  /** 26/12/2022 */
  start_date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  color: z.string(),
  activityDays: z.array(z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/)).optional(),
});

export type ActivitySchemaType = z.infer<typeof activitySchema>;

const subjectSchema = z.object({
  /** "010024_AUT_U_1_S" */
  subject_code: z.string(),
  callista_code: z.coerce.number(),
  description: z.string(),
  faculty: z.string(),
  semester: z.string(),
  campus: z.string(),
  activity_count: z.number(),
  activities: z.record(activitySchema),
});

const subjectsSchema = z.record(subjectSchema);

export class TimetableService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  private readonly logger = mainLogger.scope(TimetableService.name);

  public async getSubjectTimetable(
    callistaCode: string,
    year: number,
    semester: 'AUT' | 'SUM' | 'SPR',
  ): Promise<Array<z.infer<typeof subjectSchema>>> {
    const cacheString = `${year}-${semester}-${callistaCode}`.trim();
    const cachedSubject = await this.cacheManager.get<string>(cacheString);

    if (cachedSubject) {
      this.logger.debug('Found cached subject', callistaCode);
      const subject = await subjectSchema.parseAsync(JSON.parse(cachedSubject));
      return [subject];
    }

    const oddYear = year % 2 === 1;

    const rootUrl = `https://mytimetablecloud.uts.edu.au/${
      oddYear ? 'odd' : 'even'
    }/rest/timetable/subjects`;

    const requestParams = {
      'search-term': callistaCode,
      semester: semester,
      campus: 'ALL',
      faculty: 'ALL',
      type: 'ALL',
      days: ['1', '2', '3', '4', '5', '6', '0'],
      'start-time': '00:00',
      'end-time': '23:00',
    };

    const urlParams = new URLSearchParams();

    // append the body to the url params
    Object.entries(requestParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => urlParams.append(key, v));
      } else {
        urlParams.append(key, value);
      }
    });

    const response = await fetch(rootUrl, {
      body: urlParams.toString(),
      method: 'POST',
      headers: {
        'User-Agent': 'UTS-Subject-Outline-Bot',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get subject timetable');
    }

    const data = await response.json();

    const subjects = subjectsSchema.parse(data);

    Object.values(subjects).forEach(async (subject) => {
      const year = new Date().getFullYear();
      const cachingString =
        `${year}-${subject.semester}-${subject.callista_code}`.trim();
      await this.cacheManager.set(
        cachingString,
        JSON.stringify(subject),
        1000 * 60 * 60 * 24 * 7,
      );
      this.logger.debug('Cached subject', cachingString);
    });

    const subjectValues = await z
      .array(subjectSchema)
      .parseAsync(Object.values(subjects));

    return subjectValues;
  }
}
