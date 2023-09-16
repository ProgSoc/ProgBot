import { Attachment, SlashCommandAttachmentOption } from 'discord.js';
import { AttachmentOption } from 'necord';

export class UploadMembershipsCommandDto {
  @AttachmentOption({
    description: 'The CSV file to upload',
    required: true,
    name: 'csv',
  })
  csv: Attachment;
}
