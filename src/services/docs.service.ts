import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Cache } from 'cache-manager';
import { MatchData } from 'lunr';
import { z } from 'zod';

const DocSchema = z.object({
  title: z.string(),
  location: z.string(),
  text: z.string(),
  tags: z.array(z.string()).optional(),
});

const DocsResponseSchema = z.object({
  docs: z.array(DocSchema),
  config: z.object({
    lang: z.array(z.string()),
    separator: z.string().optional(),
    pipeline: z.array(z.string()),
  }),
});

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
const MetadataSchema = z.record(
  z.record(
    z.object({
      position: z.array(z.tuple([z.number(), z.number()])),
    }),
    {
      description: 'The metadata about the field',
    },
  ),
  {
    description: 'The metadata about the search term',
  },
);

const SearchResultSchema = z.object({
  ...DocSchema.shape,
  meta: MetadataSchema,
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

@Injectable()
export class DocsService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Fetch the docs from the docs API and index them with lunr, generating a cached lunr index
   * @returns The lunr index as a string
   */
  private async getDocsIndex(): Promise<string> {
    const cacheKey = 'docs-index-position-md3';
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) {
      return cached;
    }
    const docs = await this.getDocs();
    const { default: lunr } = await import('lunr');
    const idx = lunr((builder) => {
      builder.ref('location');
      builder.field('location');
      builder.field('title', {
        boost: 10,
      });
      builder.field('text', {
        boost: 5,
      });
      builder.field('tags', {
        boost: 5,
      });
      builder.metadataWhitelist = ['position'];
      docs.docs.forEach((doc) => {
        builder.add(doc);
      });
    });

    const serializedIdx = JSON.stringify(idx);

    await this.cacheManager.set(cacheKey, serializedIdx, 1000 * 60 * 30);
    return serializedIdx;
  }

  /**
   * Get the docs from the blog and their asociated excerpts
   * @returns The docs as a validated object
   */
  private async getDocs(): Promise<z.infer<typeof DocsResponseSchema>> {
    const cacheKey = 'docs-md3';
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) {
      const validated = await DocsResponseSchema.parse(JSON.parse(cached));
      const { NodeHtmlMarkdown } = await import('node-html-markdown'); // This markdown processor is fast but sacrifices spacing
      const markedDown = validated.docs.map((doc) => ({
        ...doc,
        text: NodeHtmlMarkdown.translate(doc.text),
        title: NodeHtmlMarkdown.translate(doc.title),
      }));
      return {
        ...validated,
        docs: markedDown,
      };
    }

    const docs = await this.fetchDocs();

    const serializedDocs = JSON.stringify(docs);

    await this.cacheManager.set(cacheKey, serializedDocs, 1000 * 60 * 30);

    return docs;
  }

  /**
   * Fetch the mkdocs-material search index
   * @returns The search index as a validated object
   */
  private async fetchDocs(): Promise<z.infer<typeof DocsResponseSchema>> {
    const docsUrl = this.configService.getOrThrow('DOCS_LUNR_INDEX_URL');
    const response = await fetch(docsUrl);

    const docs = await response.json();

    const validated = await DocsResponseSchema.parse(docs);

    return validated;
  }

  /**
   * Search the docs for a query
   * @param query The query to search for
   * @returns The search results as a validated object
   */
  public async searchDocs(query: string): Promise<SearchResult[]> {
    const searchIndex = await this.getDocsIndex();
    const docs = await this.getDocs();
    const { default: lunr } = await import('lunr');
    const idx = lunr.Index.load(JSON.parse(searchIndex));

    const results = idx.search(query);

    const resultsWithDocs: Array<SearchResult> = [];

    results.forEach((result) => {
      const doc = docs.docs.find((doc) => doc.location === result.ref);
      if (doc) {
        resultsWithDocs.push(
          SearchResultSchema.parse({
            ...doc,
            meta: result.matchData.metadata as z.infer<typeof MetadataSchema>,
          }),
        );
      }
    });

    return resultsWithDocs;
  }
}
