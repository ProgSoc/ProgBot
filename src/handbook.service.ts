import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { type Cache } from 'cache-manager';
import { load } from 'cheerio';
import { z } from 'zod';

const coursesSchema = z.array(
  z.object({
    /** Begins with a c and has 4-5 numbers */
    code: z.string().regex(/^C\d{4,5}$/i),
    name: z.string(),
    link: z.string().url(),
  }),
);

const subjectsSchema = z.array(
  z.object({
    /** Has 6 numbers */
    code: z.coerce.number().int(),
    name: z.string(),
    link: z.string().url(),
  }),
);

const majorsSchema = z.array(
  z.object({
    /**
     * Begins with MA and has 5 numbers
     */
    code: z.string().regex(/^MAJ\d{5}$/i),
    name: z.string(),
    link: z.string().url(),
  }),
);

const submajorsSchema = z.array(
  z.object({
    /**
     * Begins with SM and has 5 numbers
     * @example SM12345
     */
    code: z.string().regex(/^SMJ\d{5}$/i),
    name: z.string(),
    link: z.string().url(),
  }),
);

@Injectable()
export class HandbookService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a list of courses
   * @returns A list of courses
   */
  public async getCourses(): Promise<z.infer<typeof coursesSchema>> {
    const cachedCourses = await this.cacheManager.get<string>('courses');

    if (cachedCourses) {
      return coursesSchema.parseAsync(JSON.parse(cachedCourses));
    } else {
      /** Numerical list of courses */
      const url = 'https://www.handbook.uts.edu.au/directory/courses1.html';

      const response = await fetch(url);
      const text = await response.text();

      const $ = load(text);

      const rawCourses = $('.ie-images a')
        .toArray()
        .slice(1)
        .map((anchor) => {
          const code = $(anchor).text();
          const link = $(anchor).attr('href');
          let name = '';
          const nextSibling = $(anchor)[0].nextSibling;
          if (nextSibling.type === 'text') {
            name = nextSibling.nodeValue.trim();
          }

          return {
            code,
            name,
            link,
          };
        });

      const courses = await coursesSchema.parseAsync(rawCourses);

      await this.cacheManager.set(
        'courses',
        JSON.stringify(courses),
        1000 * 60 * 60 * 24, // 1 day
      );

      return courses;
    }
  }

  /**
   * Get a list of subjects
   * @returns A list of subjects
   */
  public async getSubjects(): Promise<z.infer<typeof subjectsSchema>> {
    const cachedSubjects = await this.cacheManager.get<string>('subjects');

    if (cachedSubjects) {
      const resolvedSubjects = await subjectsSchema.parseAsync(
        JSON.parse(cachedSubjects),
      );
      return resolvedSubjects;
    } else {
      const url = 'https://www.handbook.uts.edu.au/subjects/numerical.html';

      const response = await fetch(url);

      const text = await response.text();

      const $ = load(text);

      const rawSubjects = $('.ie-images a')
        .toArray()
        .slice(1)
        .map((anchor) => {
          const code = $(anchor).text();
          const link = $(anchor).attr('href');
          let name = '';
          const nextSibling = $(anchor)[0].nextSibling;
          if (nextSibling?.type === 'text') {
            name = nextSibling.nodeValue.trim();
          }

          return {
            code,
            name,
            link,
          };
        });

      const subjects = await subjectsSchema.parseAsync(rawSubjects);

      await this.cacheManager.set(
        'subjects',
        JSON.stringify(subjects),
        1000 * 60 * 60 * 24, // 1 day
      );

      return subjects;
    }
  }

  /**
   * Get a list of majors
   * @returns A list of majors
   */
  public async getMajors(): Promise<z.infer<typeof majorsSchema>> {
    const cachedMajors = await this.cacheManager.get<string>('majors');

    if (cachedMajors) {
      const resolvedMajors = await majorsSchema.parseAsync(
        JSON.parse(cachedMajors),
      );
      return resolvedMajors;
    } else {
      const url = 'https://www.handbook.uts.edu.au/directory/majors1.html';

      const response = await fetch(url);

      const text = await response.text();

      const $ = load(text);

      const rawMajors = $('.ie-images a')
        .toArray()
        .slice(1)
        .map((anchor) => {
          const code = $(anchor).text();
          const link = $(anchor).attr('href');
          let name = '';
          const nextSibling = $(anchor)[0].nextSibling;
          if (nextSibling?.type === 'text') {
            name = nextSibling.nodeValue.trim();
          }

          return {
            code,
            name,
            link,
          };
        });

      const majors = await majorsSchema.parseAsync(rawMajors);

      await this.cacheManager.set(
        'majors',
        JSON.stringify(majors),
        1000 * 60 * 60 * 24, // 1 day
      );

      return majors;
    }
  }

  /**
   * Get a list of submajors
   * @returns A list of submajors
   */
  public async getSubmajors(): Promise<z.infer<typeof submajorsSchema>> {
    const cachedSubmajors = await this.cacheManager.get<string>('submajors');

    if (cachedSubmajors) {
      const resolvedSubmajors = await submajorsSchema.parseAsync(
        JSON.parse(cachedSubmajors),
      );
      return resolvedSubmajors;
    } else {
      const url = 'https://www.handbook.uts.edu.au/directory/submajors1.html';

      const response = await fetch(url);

      const text = await response.text();

      const $ = load(text);

      const rawSubmajors = $('.ie-images a')
        .toArray()
        .slice(1)
        .map((anchor) => {
          const code = $(anchor).text();
          const link = $(anchor).attr('href');
          let name = '';
          const nextSibling = $(anchor)[0].nextSibling;
          if (nextSibling?.type === 'text') {
            name = nextSibling.nodeValue.trim();
          }

          return {
            code,
            name,
            link,
          };
        });

      const submajors = await submajorsSchema.parseAsync(rawSubmajors);

      await this.cacheManager.set(
        'submajors',
        JSON.stringify(submajors),
        1000 * 60 * 60 * 24, // 1 day
      );

      return submajors;
    }
  }
}
