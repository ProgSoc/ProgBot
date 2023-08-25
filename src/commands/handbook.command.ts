import {
  Context,
  type SlashCommandContext,
  Subcommand,
  createCommandGroupDecorator,
  Options,
} from 'necord';
import mainLogger from 'src/logger';
import { MessageFlags, hyperlink } from 'discord.js';
import { HandbookCoursesCommandDto } from 'src/dto/HandbookCoursesCommandDto';
import Fuse from 'fuse.js';
import { HandbookSubjectsCommandDto } from 'src/dto/HandbookSubjectsCommandDto';
import { HandbookMajorsCommandDto } from 'src/dto/HandbookMajorsCommandDto';
import { HandbookSubmajorsCommandDto } from 'src/dto/HandbookSubmajorsCommandDto';
import { HandbookService } from 'src/services/handbook.service';
import { Inject, UseInterceptors } from '@nestjs/common';
import { SubjectCodeAutocompleteInterceptor } from 'src/autocomplete/SubjectCodeAutocomplete';
import { HandbookSubjectCommandDto } from 'src/dto/HandbookSubjectCommandDto';
import { MEILI_TOKEN } from 'src/services/meilisearch.module';
import MeiliSearch from 'meilisearch';
import { IndexedSubject } from 'src/workers/subjectWorker';

export const HandbookCommandDecorator = createCommandGroupDecorator({
  name: 'handbook',
  description: 'Commands related to the handbook',
});

@HandbookCommandDecorator()
export class HandbookCommands {
  constructor(
    private readonly handbookService: HandbookService,
    @Inject(MEILI_TOKEN) private readonly search: MeiliSearch,
  ) {}

  private readonly logger = mainLogger.scope(HandbookCommands.name);

  @Subcommand({
    name: 'courses',
    description: 'Get a list of courses',
  })
  public async courses(
    @Context() [interaction]: SlashCommandContext,
    @Options() { search }: HandbookCoursesCommandDto,
  ) {
    this.logger.info('Courses command received');

    const courses = await this.handbookService.getCourses();

    const searchRes = new Fuse(courses, {
      keys: ['code', 'name'],
    });

    const courseString = searchRes
      .search(search, {
        limit: 10,
      })
      .map(
        ({ item: course }) =>
          `- ${hyperlink(course.code, course.link)} ${course.name}`,
      )
      .join('\n');

    if (courseString === '') {
      await interaction.reply({
        content: 'No courses found',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: courseString,
      flags: [MessageFlags.SuppressEmbeds, MessageFlags.Ephemeral],
    });
  }

  @UseInterceptors(SubjectCodeAutocompleteInterceptor)
  @Subcommand({
    name: 'subjects',
    description: 'Get a list of subjects',
  })
  public async subjects(
    @Context() [interaction]: SlashCommandContext,
    @Options() { search }: HandbookSubjectsCommandDto,
  ) {
    this.logger.info('Subjects command received');

    const subjects = await this.handbookService.getSubjects();

    const searchRes = new Fuse(subjects, {
      keys: ['code', 'name'],
    });

    const subjectString = searchRes
      .search(search, {
        limit: 10,
      })
      .map(
        ({ item: subject }) =>
          `- ${hyperlink(subject.code.toString(), subject.link)} ${
            subject.name
          }`,
      )
      .join('\n');

    if (subjectString === '') {
      await interaction.reply({
        content: 'No subjects found',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: subjectString,
      flags: [MessageFlags.SuppressEmbeds, MessageFlags.Ephemeral],
    });
  }

  @Subcommand({
    name: 'majors',
    description: 'Get a list of majors',
  })
  public async majors(
    @Context() [interaction]: SlashCommandContext,
    @Options() { search }: HandbookMajorsCommandDto,
  ) {
    this.logger.info('Majors command received');

    const majors = await this.handbookService.getMajors();

    const searchRes = new Fuse(majors, {
      keys: ['code', 'name'],
    });

    const majorString = searchRes
      .search(search, {
        limit: 10,
      })
      .map(
        ({ item: major }) =>
          `- ${hyperlink(major.code, major.link)} ${major.name}`,
      )
      .join('\n');

    if (majorString === '') {
      await interaction.reply({
        content: 'No majors found',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: majorString,
      flags: [MessageFlags.SuppressEmbeds, MessageFlags.Ephemeral],
    });
  }

  @Subcommand({
    name: 'submajors',
    description: 'Get a list of submajors',
  })
  public async submajors(
    @Context() [interaction]: SlashCommandContext,
    @Options() { search }: HandbookSubmajorsCommandDto,
  ) {
    this.logger.info('Submajors command received');

    const submajors = await this.handbookService.getSubmajors();

    const searchRes = new Fuse(submajors, {
      keys: ['code', 'name'],
    });

    const submajorString = searchRes
      .search(search, {
        limit: 10,
      })
      .map(
        ({ item: submajor }) =>
          `- ${hyperlink(submajor.code, submajor.link)} ${submajor.name}`,
      )
      .join('\n');

    if (submajorString === '') {
      await interaction.reply({
        content: 'No submajors found',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: submajorString,
      flags: [MessageFlags.SuppressEmbeds, MessageFlags.Ephemeral],
    });
  }
}
