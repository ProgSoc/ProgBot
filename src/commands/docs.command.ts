import { Injectable } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  type SlashCommandContext,
} from 'necord';
import { DocsSearchCommandDto } from 'src/dto/DocsSearchCommandDto';
import { DocsService } from 'src/services/docs.service';

@Injectable()
export class DocsCommand {
  constructor(private readonly docsService: DocsService) {}

  @SlashCommand({
    name: 'docs',
    description: 'Search the docs',
    dmPermission: true,
  })
  public async docs(
    @Context() [interaction]: SlashCommandContext,
    @Options() { query, publish = false }: DocsSearchCommandDto,
  ) {
    await interaction.deferReply({
      ephemeral: !publish,
    });
    const results = await this.docsService.searchDocs(query);

    if (results.length === 0) {
      await interaction.editReply('No results found');
      return;
    }

    const [first] = results;

    const titleLine = `## ${first.title}`;
    const tagsLine = first.tags
      ? `Tags: ${first.tags.map((tag) => `**${tag}**`).join(', ')}`
      : undefined;
    const linkLine = `_This is an excerpt from the page: https://docs.progsoc.org/${first.location}_`;
    const body = first.text;

    const fields = [linkLine, titleLine];
    if (tagsLine) fields.push(tagsLine);
    fields.push(body);

    const content = fields.join('\n\n');

    await interaction.editReply({
      content,
      allowedMentions: {
        parse: [],
      },
    });
  }
}
