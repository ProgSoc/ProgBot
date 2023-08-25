import { Inject, Injectable } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import MeiliSearch from 'meilisearch';
import { AutocompleteInterceptor } from 'necord';
import { MEILI_TOKEN } from 'src/services/meilisearch.module';
import { IndexedSubject } from 'src/workers/subjectWorker';

@Injectable()
export class SubjectCodeAutocompleteInterceptor extends AutocompleteInterceptor {
  constructor(@Inject(MEILI_TOKEN) private readonly search: MeiliSearch) {
    super();
  }

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    const subjectIndex = await this.search.getIndex<IndexedSubject>('subjects');

    const searchRes = await subjectIndex.search(focused.value, {
      limit: 10,
      attributesToRetrieve: ['code', 'name'],
      attributesToSearchOn: ['code', 'name', 'md'],
    });

    return interaction.respond(
      searchRes.hits.map((subject) => ({
        name: `${subject.code.toString()} - ${subject.name}`,
        value: subject.code.toString(),
      })),
    );
  }
}
