import { StringOption } from 'necord';

export class HandbookSubjectsCommandDto {
  @StringOption({
    name: 'search',
    description: 'The search query',
    required: true,
  })
  search: string;
}
