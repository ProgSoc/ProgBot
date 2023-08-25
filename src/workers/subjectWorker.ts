import { Redis } from 'ioredis';
import { redisStore } from 'cache-manager-ioredis-yet';
import { MeiliSearch } from 'meilisearch';
import got from 'node_modules/got/dist/source/index';
import KeyvRedis from '@keyv/redis';
import { load } from 'cheerio';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import mainLogger from 'src/logger';

interface Options {
  redis: {
    url: string;
  };
  meilisearch: {
    url: string;
    key: string;
  };
}

interface Subject {
  code: number;
  link: string;
  name: string;
}

export interface IndexedSubject {
  code: number;
  link: string;
  name: string;
  md: string;
}

export interface SubjectIndexArgsArgs {
  subject: Subject;
  options: Options;
}

const getSubjectHTML = async (link: string, redis: KeyvRedis<string>) => {
  const cachedSubjectHTML = await redis.get(link);

  if (cachedSubjectHTML) {
    return cachedSubjectHTML;
  }

  const subjectHtml = await fetch(link).then((res) => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.text();
  });
  mainLogger.info(`Fetched ${link}`);
  await redis.set(link, subjectHtml, 60 * 60 * 24 * 7);
  return subjectHtml;
};

export async function indexSubject({ subject, options }: SubjectIndexArgsArgs) {
  const redis = new KeyvRedis(options.redis.url);

  const searchClient = new MeiliSearch({
    host: options.meilisearch.url,
    apiKey: options.meilisearch.key,
  });

  const index = searchClient.index('subjects');

  const subjectHtml = await getSubjectHTML(subject.link, redis);

  if (!subjectHtml) {
    return;
  }

  const $ = load(subjectHtml);

  const pageContent = $('.ie-images').html();

  if (!pageContent) {
    return;
  }

  const md = NodeHtmlMarkdown.translate(pageContent);

  const subjectData = {
    code: subject.code,
    name: subject.name,
    link: subject.link,
    md,
  };

  const id = await index.addDocuments([subjectData], {
    primaryKey: 'code',
  });
}
