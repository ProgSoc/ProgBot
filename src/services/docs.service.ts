import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Cache } from 'cache-manager';
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

export interface SearchResult {
  text: string;
  title: string;
  location: string;
  tags?: string[] | undefined;
}

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
    const cacheKey = 'docs-index';
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) {
      return cached;
    }
    const docs = await this.fetchDocs();
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
    const cacheKey = 'docs';
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) {
      const validated = await DocsResponseSchema.parse(JSON.parse(cached));
      return validated;
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

    const resultsWithDocs: Array<z.infer<typeof DocSchema>> = [];

    results.forEach((result) => {
      const doc = docs.docs.find((doc) => doc.location === result.ref);
      if (doc) {
        resultsWithDocs.push(doc);
      }
    });

    // covert text to markdown
    const resultsWithMarkdown = await Promise.all(
      resultsWithDocs.map(async (doc) => {
        const { NodeHtmlMarkdown } = await import('node-html-markdown'); // This markdown processor is fast but sacrifices spacing
        const bodyMd = NodeHtmlMarkdown.translate(doc.text);
        const titleMd = NodeHtmlMarkdown.translate(doc.title);
        return {
          ...doc,
          text: bodyMd,
          title: titleMd,
        };
      }),
    );

    return resultsWithMarkdown;
  }
}
