import { MeiliSearch } from "meilisearch";
import KeyvRedis from "@keyv/redis";
import { load } from "cheerio";
import { NodeHtmlMarkdown } from "node-html-markdown";
import mainLogger from "src/logger";

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

const getHTML = async (link: string, redis: KeyvRedis<string>) => {
  const cachedSubjectHTML = await redis.get(link);

  if (cachedSubjectHTML) {
    return cachedSubjectHTML;
  }

  const subjectHtml = await fetch(link).then((res) => {
    if (!res.ok) {
      return null;
    }
    return res.text();
  });

  if (!subjectHtml) {
    return null;
  }

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

  const index = searchClient.index("subjects");

  const subjectHtml = await getHTML(subject.link, redis);

  if (!subjectHtml) {
    return;
  }

  const $ = load(subjectHtml);

  const pageContent = $(".ie-images").html();

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
    primaryKey: "code",
  });
}

interface Course {
  code: string;
  name: string;
  link: string;
}

export interface CourseIndexArgs {
  course: Course;
  options: Options;
}

export interface IndexedCourse {
  code: string;
  name: string;
  link: string;
  md: string;
}

export async function indexCourse({ course, options }: CourseIndexArgs) {
  const redis = new KeyvRedis(options.redis.url);

  const searchClient = new MeiliSearch({
    host: options.meilisearch.url,
    apiKey: options.meilisearch.key,
  });

  const index = searchClient.index("courses");

  const courseHtml = await getHTML(course.link, redis);

  if (!courseHtml) {
    return;
  }

  const $ = load(courseHtml);

  const pageContent = $(".ie-images").html();

  if (!pageContent) {
    return;
  }

  const md = NodeHtmlMarkdown.translate(pageContent);

  const courseData = {
    code: course.code,
    name: course.name,
    link: course.link,
    md,
  };

  const id = await index.addDocuments([courseData], {
    primaryKey: "code",
  });
}

interface Major {
  code: string;
  name: string;
  link: string;
}

export interface MajorIndexArgs {
  major: Major;
  options: Options;
}

export interface IndexedMajor {
  code: string;
  name: string;
  link: string;
  md: string;
}

export async function indexMajor({ major, options }: MajorIndexArgs) {
  const redis = new KeyvRedis(options.redis.url);

  const searchClient = new MeiliSearch({
    host: options.meilisearch.url,
    apiKey: options.meilisearch.key,
  });

  const index = searchClient.index("majors");

  const majorHtml = await getHTML(major.link, redis);

  if (!majorHtml) {
    return;
  }

  const $ = load(majorHtml);

  const pageContent = $(".ie-images").html();

  if (!pageContent) {
    return;
  }

  const md = NodeHtmlMarkdown.translate(pageContent);

  const majorData = {
    code: major.code,
    name: major.name,
    link: major.link,
    md,
  };

  const id = await index.addDocuments([majorData], {
    primaryKey: "code",
  });
}

interface Submajor {
  code: string;
  name: string;
  link: string;
}

export interface SubmajorsIndexArgs {
  submajor: Submajor;
  options: Options;
}

export interface IndexedSubmajor {
  code: string;
  name: string;
  link: string;
  md: string;
}

export async function indexSubmajor({ submajor, options }: SubmajorsIndexArgs) {
  const redis = new KeyvRedis(options.redis.url);

  const searchClient = new MeiliSearch({
    host: options.meilisearch.url,
    apiKey: options.meilisearch.key,
  });

  const index = searchClient.index("submajors");

  const submajorHtml = await getHTML(submajor.link, redis);

  if (!submajorHtml) {
    return;
  }

  const $ = load(submajorHtml);

  const pageContent = $(".ie-images").html();

  if (!pageContent) {
    return;
  }

  const md = NodeHtmlMarkdown.translate(pageContent);

  const submajorData = {
    code: submajor.code,
    name: submajor.name,
    link: submajor.link,
    md,
  };

  const id = await index.addDocuments([submajorData], {
    primaryKey: "code",
  });
}
