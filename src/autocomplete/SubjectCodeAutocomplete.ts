import { Injectable } from '@nestjs/common';
import { AutocompleteInteraction } from 'discord.js';
import Fuse from 'fuse.js';
import { AutocompleteInterceptor } from 'necord';
import { HandbookService } from 'src/handbook.service';

@Injectable()
export class SubjectCodeAutocompleteInterceptor extends AutocompleteInterceptor {
  constructor(private readonly handbookService: HandbookService) {
    super();
  }

  public async transformOptions(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);

    const choices = await this.handbookService.getSubjects();
    const fuse = new Fuse(choices, {
      keys: ['code', 'name'],
    });

    const searched = fuse.search(focused.value.toString(), {
      limit: 10,
    });

    return interaction.respond(
      searched.map(({ item: subject }) => ({
        name: `${subject.code.toString()} - ${subject.name}`,
        value: subject.code.toString(),
      })),
    );
  }
}
