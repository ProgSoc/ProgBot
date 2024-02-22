import { Injectable } from "@nestjs/common";
import { HandbookService } from "./handbook.service";
import { ConfigService } from "@nestjs/config";
import Piscina from "piscina";
import path from "path";
import { fileURLToPath } from "url";
import mainLogger from "src/logger";
import {
  CourseIndexArgs,
  MajorIndexArgs,
  SubjectIndexArgsArgs,
  SubmajorsIndexArgs,
} from "src/workers/subjectWorker";

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
        "../workers/subjectWorker.js",
      ),
      minThreads: 1,
      maxThreads: 4,
    });

    this.pool.on("error", (error) => {
      this.logger.error(error);
    });

    this.pool.on("taskerror", (error) => {
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
            url: this.configService.getOrThrow<string>("MEILI_URL"),
            key: this.configService.getOrThrow<string>("MEILI_MASTER_KEY"),
          },
          redis: {
            url: this.configService.getOrThrow<string>("REDIS_URL"),
          },
        },
      } satisfies SubjectIndexArgsArgs;

      return this.pool.run(args, {
        name: "indexSubject",
      });
    });
    this.logger.time("Scraping subjects");
    await Promise.all(subjectPromises);
    this.logger.timeEnd("Scraping subjects");
  }

  public async scrapeCourses() {
    const courses = await this.handbookService.getCourses();

    const coursePromises = courses.map(async (course) => {
      const args = {
        course,
        options: {
          meilisearch: {
            url: this.configService.getOrThrow<string>("MEILI_URL"),
            key: this.configService.getOrThrow<string>("MEILI_MASTER_KEY"),
          },
          redis: {
            url: this.configService.getOrThrow<string>("REDIS_URL"),
          },
        },
      } satisfies CourseIndexArgs;

      return this.pool.run(args, {
        name: "indexCourse",
      });
    });

    this.logger.time("Scraping courses");
    await Promise.all(coursePromises);
    this.logger.timeEnd("Scraping courses");
  }

  public async scrapeMajors() {
    const majors = await this.handbookService.getMajors();

    const majorPromises = majors.map(async (major) => {
      const args = {
        major,
        options: {
          meilisearch: {
            url: this.configService.getOrThrow<string>("MEILI_URL"),
            key: this.configService.getOrThrow<string>("MEILI_MASTER_KEY"),
          },
          redis: {
            url: this.configService.getOrThrow<string>("REDIS_URL"),
          },
        },
      } satisfies MajorIndexArgs;

      return this.pool.run(args, {
        name: "indexMajor",
      });
    });

    this.logger.time("Scraping majors");
    await Promise.all(majorPromises);
    this.logger.timeEnd("Scraping majors");
  }

  public async scrapeSubmajors() {
    const submajors = await this.handbookService.getSubmajors();

    const submajorPromises = submajors.map(async (submajor) => {
      const args = {
        submajor,
        options: {
          meilisearch: {
            url: this.configService.getOrThrow<string>("MEILI_URL"),
            key: this.configService.getOrThrow<string>("MEILI_MASTER_KEY"),
          },
          redis: {
            url: this.configService.getOrThrow<string>("REDIS_URL"),
          },
        },
      } satisfies SubmajorsIndexArgs;

      return this.pool.run(args, {
        name: "indexSubmajor",
      });
    });

    this.logger.time("Scraping submajors");
    await Promise.all(submajorPromises);
    this.logger.timeEnd("Scraping submajors");
  }
}
