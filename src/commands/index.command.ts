import { Inject } from '@nestjs/common';
import MeiliSearch from 'meilisearch';
import {
  Context,
  SlashCommand,
  type SlashCommandContext,
  Subcommand,
  createCommandGroupDecorator,
} from 'necord';
import { MEILI_TOKEN } from 'src/services/meilisearch.module';
import { ScrapingService } from 'src/services/scraping.service';

const guildId = process.env.GUILD_ID;

export const IndexCommandDecorator = createCommandGroupDecorator({
  name: 'index',
  description: 'Indexing the handbook',
  defaultMemberPermissions: ['Administrator'],
  guilds: guildId ? [guildId] : undefined,
});

@IndexCommandDecorator()
export class IndexCommands {
  constructor(
    @Inject(MEILI_TOKEN) private readonly search: MeiliSearch,
    private readonly scrapingService: ScrapingService,
  ) {}

  @Subcommand({
    name: 'subjects',
    description: 'Index subjects',
  })
  public async indexSubjects(@Context() [interaction]: SlashCommandContext) {
    await interaction.reply('Indexing subjects');
    await this.scrapingService.scrapeSubjects();
    await interaction.editReply('Done');
  }

  @Subcommand({
    name: 'courses',
    description: 'Index courses',
  })
  public async indexCourses(@Context() [interaction]: SlashCommandContext) {
    await interaction.reply('Indexing courses');
    await this.scrapingService.scrapeCourses();
    await interaction.editReply('Done');
  }

  @Subcommand({
    name: 'majors',
    description: 'Index majors',
  })
  public async indexMajors(@Context() [interaction]: SlashCommandContext) {
    await interaction.reply('Indexing majors');
    await this.scrapingService.scrapeMajors();
    await interaction.editReply('Done');
  }

  @Subcommand({
    name: 'submajors',
    description: 'Index submajors',
  })
  public async indexSubmajors(@Context() [interaction]: SlashCommandContext) {
    await interaction.reply('Indexing submajors');
    await this.scrapingService.scrapeSubmajors();
    await interaction.editReply('Done');
  }
}
