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
}
