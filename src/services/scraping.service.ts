import { Injectable } from '@nestjs/common';
import { HandbookService } from './handbook.service';
import { ConfigService } from '@nestjs/config';
import Piscina from 'piscina';
import path from 'path';
import { fileURLToPath } from 'url';
import mainLogger from 'src/logger';
import { SubjectIndexArgsArgs } from 'src/workers/subjectWorker';

@Injectable()
export class ScrapingService {
  private pool: Piscina;

  private readonly logger = mainLogger.child(ScrapingService.name);

  constructor(
    private readonly handbookService: HandbookService,
    private readonly configService: ConfigService,
  ) {
    this.pool = new Piscina({
      filename: path.join(
        fileURLToPath(import.meta.url),
        '../workers/subjectWorker.js',
      ),
      minThreads: 1,
      maxThreads: 4,
    });

    this.pool.on('error', (error) => {
      this.logger.error(error);
    });

    this.pool.on('taskerror', (error) => {
      this.logger.error(error);
    });
  }

  public async scrapeSubjects() {
    const subjects = await this.handbookService.getSubjects();

    const subjectPromises = subjects.map(async (subject) => {
      const args = {
        subject,
        options: {
          meilisearch: {
            url: this.configService.getOrThrow<string>('MEILI_URL'),
            key: this.configService.getOrThrow<string>('MEILI_MASTER_KEY'),
          },
          redis: {
            url: this.configService.getOrThrow<string>('REDIS_URL'),
          },
        },
      } satisfies SubjectIndexArgsArgs;

      return this.pool.run(args, {
        name: 'indexSubject',
      });
    });
    this.logger.time('Scraping subjects');
    await Promise.all(subjectPromises);
    this.logger.timeEnd('Scraping subjects');
  }
}
