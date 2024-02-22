import { Injectable } from "@nestjs/common";
import { EmbedBuilder } from "discord.js";
import {
  Context,
  Options,
  SlashCommand,
  type SlashCommandContext,
} from "necord";
import { DocsSearchCommandDto } from "src/dto/DocsSearchCommandDto";
import { DocsService, SearchResult } from "src/services/docs.service";

@Injectable()
export class DocsCommand {
  constructor(private readonly docsService: DocsService) {}

  @SlashCommand({
    name: "docs",
    description: "Search the docs",
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
      await interaction.editReply("No results found");
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
  /**
 * The metadata contains a key for each search term found in the document and the field in which it was found. This will contain all the metadata about this term and field; for example the position of the term matches:
 * e.g. 
  "metadata": {
    "test": {
      "body": {
        "position": [[0, 4], [24, 4]]
      }
    }
  }
*/

  /**
   * We want to highlight the search terms in the embed, so we need to get the positions of the search terms in the text
   * { text: [ [ 580, 4 ], [ 808, 4 ], [ 1153, 7 ], [ 1241, 4 ] ] }
   * It includes the position of the term and the length of the term
   */
  const positionsToHighlightByField = Object.entries(result.meta).reduce(
    (acc, [_term, fields]) => {
      for (const [field, { position }] of Object.entries(fields)) {
        if (!acc[field]) {
          acc[field] = [];
        }
        acc[field].push(...position);
      }
      return acc;
    },
    {} as Record<string, [number, number][]>,
  );

  // const highlightedText = Object.entries(positionsToHighlightByField).reduce(
  //   (acc, [field, positions]) => {
  //     const sortedPositions = positions.sort(([a], [b]) => a - b);
  //     let lastPosition = 0;
  //     sortedPositions.forEach(([position, length]) => {
  //       acc += result[field].slice(lastPosition, position);
  //       acc += `**${result[field].slice(position, position + length)}**`;
  //       lastPosition = position + length;
  //     });
  //     acc += result[field].slice(lastPosition);
  //     return acc;
  //   },
  //   '',
  // );

  // console.log(highlightedText);

  const embed = new EmbedBuilder()
    .setTitle(result.title)
    .setDescription(result.text.split("\n").slice(0, 2).join("\n"))
    .setURL(`https://docs.progsoc.org/${result.location}`);

  if (result.tags) {
    embed.addFields({ name: "Tags", value: result.tags?.join(", ") ?? "None" });
  }

  return embed;
};
