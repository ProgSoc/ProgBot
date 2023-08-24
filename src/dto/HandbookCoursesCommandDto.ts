import { StringOption } from 'necord';

export class HandbookCoursesCommandDto {
  @StringOption({
    name: 'search',
    description: 'The search query',
    required: true,
  })
  search: string;
}
