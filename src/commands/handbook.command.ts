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
import { HandbookSubjectsCommandDto } from 'src/dto/HandbookSubjectsCommandDto';
import { HandbookMajorsCommandDto } from 'src/dto/HandbookMajorsCommandDto';
import { HandbookSubmajorsCommandDto } from 'src/dto/HandbookSubmajorsCommandDto';
import { HandbookService } from 'src/services/handbook.service';
import { Inject, UseInterceptors } from '@nestjs/common';
import { SubjectCodeAutocompleteInterceptor } from 'src/autocomplete/SubjectCodeAutocomplete';
import { HandbookSubjectCommandDto } from 'src/dto/HandbookSubjectCommandDto';
import { MEILI_TOKEN } from 'src/services/meilisearch.module';
import MeiliSearch from 'meilisearch';
import {
  IndexedCourse,
  IndexedMajor,
  IndexedSubject,
  IndexedSubmajor,
} from 'src/workers/subjectWorker';

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

    const index = this.search.index<IndexedCourse>('courses');

    const searchRes = await index.search(search, {
      limit: 10,
      attributesToSearchOn: ['code', 'name'],
      attributesToRetrieve: ['code', 'name', 'link'],
    });

    const courseString = searchRes.hits
      .map(
        (course) => `- ${hyperlink(course.code, course.link)} ${course.name}`,
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

    const index = this.search.index<IndexedSubject>('subjects');

    const searchRes = await index.search(search, {
      limit: 10,
      attributesToSearchOn: ['code', 'name'],
      attributesToRetrieve: ['code', 'name', 'link'],
    });

    const subjectString = searchRes.hits
      .map(
        (subject) =>
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

    const index = this.search.index<IndexedMajor>('majors');

    const searchRes = await index.search(search, {
      limit: 10,
      attributesToSearchOn: ['code', 'name'],
      attributesToRetrieve: ['code', 'name', 'link'],
    });

    const majorString = searchRes.hits
      .map((major) => `- ${hyperlink(major.code, major.link)} ${major.name}`)
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

    const index = this.search.index<IndexedSubmajor>('submajors');

    const searchRes = await index.search(search, {
      limit: 10,
      attributesToSearchOn: ['code', 'name'],
      attributesToRetrieve: ['code', 'name', 'link'],
    });

    const submajorString = searchRes.hits
      .map(
        (submajor) =>
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
