import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { AttachmentBuilder } from 'discord.js';
import {
  Context,
  Options,
  SlashCommand,
  type SlashCommandContext,
} from 'necord';
import { OutlineCommandDto } from 'src/dto/OutlineCommandDto';
import mainLogger from 'src/logger';
import type { Cache } from 'cache-manager';

@Injectable()
export class OutlineCommand {
  private readonly logger = mainLogger.scope(OutlineCommand.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get the subject outline for a specific subject from the UTS API or cache
   * @param subjectCode The subject code to get the outline for
   * @param session The session to get the outline for
   * @param year The year to get the outline for
   * @returns The outline as an attachment, or null if it could not be found
   */
  private async getOutline(
    subjectCode: number,
    session: string,
    year: number,
  ): Promise<AttachmentBuilder | null> {
    const fileName = `${subjectCode}-${session ?? 'AUT'}-${
      year ?? new Date().getFullYear()
    }-Subject_Outline.pdf`;

    const cachedOutline = await this.cacheManager.get<string>(fileName);

    if (cachedOutline) {
      this.logger.debug('Found cached outline', fileName);
      const arrayBuffer = Buffer.from(cachedOutline, 'base64');

      const attachment = new AttachmentBuilder(arrayBuffer)
        .setName(fileName)
        .setDescription(
          `Subject outline for ${subjectCode} ${session} ${year}`,
        );

      return attachment;
    } else {
      const urlSearch = new URLSearchParams();

      urlSearch.set('lastGenerated', 'true');
      urlSearch.set('subjectCode', subjectCode.toString());
      urlSearch.set('mode', 'standard');
      urlSearch.set('location', 'city');
      urlSearch.set('session', session);

      if (year) {
        urlSearch.set('year', year.toString());
      } else {
        const currentYear = new Date().getFullYear();
        urlSearch.set('year', currentYear.toString());
      }

      const url = `https://cis-admin-api.uts.edu.au/subject-outlines/index.cfm/PDFs?${urlSearch.toString()}#view=FitH`;
      const fetchedOutline = await fetch(url, {
        headers: {
          'User-Agent': 'UTS-Subject-Outline-Bot',
        },
      });

      if (
        !fetchedOutline.ok ||
        !fetchedOutline.headers.get('Content-Type').includes('application/pdf')
      ) {
        return null;
      }

      const arrayBuffer = await fetchedOutline.arrayBuffer();

      const buffer = Buffer.from(arrayBuffer);

      await this.cacheManager.set(
        fileName,
        buffer.toString('base64'),
        1000 * 60 * 60 * 24 * 7, // 7 days
      );

      const attachment = new AttachmentBuilder(buffer)
        .setName(fileName)
        .setDescription(
          `Subject outline for ${subjectCode} ${session} ${year}`,
        );

      return attachment;
    }
  }

  @SlashCommand({
    name: 'outline',
    description: 'Get the subject outline for a specific subject',
  })
  public async invite(
    @Context() [interaction]: SlashCommandContext,
    @Options()
    { subjectCode, session, year }: OutlineCommandDto,
  ) {
    const outlineAttachment = await this.getOutline(subjectCode, session, year);

    if (!outlineAttachment) {
      await interaction.reply({
        content: 'Could not find subject outline!',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: 'Here is your subject outline!',
      files: [outlineAttachment],
      ephemeral: true,
    });
  }
}
