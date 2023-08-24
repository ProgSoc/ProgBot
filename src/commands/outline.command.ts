import { Injectable } from '@nestjs/common';
import { AttachmentBuilder } from 'discord.js';
import {
  Context,
  Options,
  SlashCommand,
  type SlashCommandContext,
} from 'necord';
import { OutlineCommandDto } from 'src/dto/OutlineCommandDto';
import mainLogger from 'src/logger';

@Injectable()
export class OutlineCommand {
  private readonly logger = mainLogger.scope(OutlineCommand.name);

  @SlashCommand({
    name: 'outline',
    description: 'Get the subject outline for a specific subject',
  })
  public async invite(
    @Context() [interaction]: SlashCommandContext,
    @Options()
    { subjectCode, session, year }: OutlineCommandDto,
  ) {
    await interaction.deferReply();
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

    if (!fetchedOutline.ok) {
      await interaction.followUp({
        content: 'Sorry, I could not find that subject outline.',
        ephemeral: true,
      });
      return;
    }

    if (
      !fetchedOutline.headers.get('Content-Type').includes('application/pdf')
    ) {
      await interaction.followUp({
        content: 'Sorry, I could not find that subject outline.',
        ephemeral: true,
      });
      return;
    }

    const arrayBuffer = await fetchedOutline.arrayBuffer();

    const fileName = `${subjectCode}-${session ?? 'AUT'}-${
      year ?? new Date().getFullYear()
    }-Subject_Outline.pdf`;

    const attachment = new AttachmentBuilder(Buffer.from(arrayBuffer))
      .setName(fileName)
      .setDescription(`Subject outline for ${subjectCode} ${session} ${year}`);

    await interaction.followUp({
      content: 'Here is your subject outline!',
      files: [attachment],
      ephemeral: true,
    });
  }
}
