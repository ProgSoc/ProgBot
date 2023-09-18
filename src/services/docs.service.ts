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

@Injectable()
export class DocsService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  private async getDocs(): Promise<z.infer<typeof DocsResponseSchema>> {
    const cacheKey = 'docs';
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) {
      const asJson = JSON.parse(cached);
      const validated = await DocsResponseSchema.parse(asJson);
      return validated;
    }
    const docs = await this.fetchDocs();
    await this.cacheManager.set(cacheKey, JSON.stringify(docs), 1000);
    return docs;
  }

  private async fetchDocs(): Promise<z.infer<typeof DocsResponseSchema>> {
    const docsUrl = this.configService.getOrThrow('DOCS_LUNR_INDEX_URL');
    const response = await fetch(docsUrl);

    const docs = await response.json();

    const validated = await DocsResponseSchema.parse(docs);

    return validated;
  }

  public async searchDocs(query: string) {
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
      docs.docs.forEach((doc) => {
        builder.add(doc);
      });
    });

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
        const { NodeHtmlMarkdown } = await import('node-html-markdown');
        const md = NodeHtmlMarkdown.translate(doc.text);
        return {
          ...doc,
          text: md,
        };
      }),
    );

    return resultsWithMarkdown;
  }
}
