import { Injectable } from '@nestjs/common';
import { EmbedBuilder } from 'discord.js';
import {
  Context,
  Options,
  SlashCommand,
  type SlashCommandContext,
} from 'necord';
import { DocsSearchCommandDto } from 'src/dto/DocsSearchCommandDto';
import { DocsService, SearchResult } from 'src/services/docs.service';

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

    const embeds = results.slice(0, 3).map(searchResultToEmbed);

    const content =
      results.length > 3
        ? `Found ${results.length} results, here are the first 3:`
        : `Showing ${results.length} results`;

    await interaction.editReply({
      content,
      embeds,
      allowedMentions: {
        parse: [],
      },
    });
  }
}

const searchResultToEmbed = (result: SearchResult) => {
  const embed = new EmbedBuilder()
    .setTitle(result.title)
    .setDescription(result.text.split('\n').slice(0, 2).join('\n'))
    .setURL(`https://docs.progsoc.org/${result.location}`);

  if (result.tags) {
    embed.addFields({ name: 'Tags', value: result.tags?.join(', ') ?? 'None' });
  }

  return embed;
};
