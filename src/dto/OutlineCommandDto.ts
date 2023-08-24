import { NumberOption, StringOption } from 'necord';

export class OutlineCommandDto {
  @StringOption({
    name: 'subject-code',
    description: 'The subject code',
    required: true,
    autocomplete: true,
  })
  subjectCode: string;
  @StringOption({
    name: 'session',
    description: 'The session',
    required: true,
    choices: [
      {
        name: 'Autumn',
        value: 'AUT',
      },
      {
        name: 'Spring',
        value: 'SPR',
      },
      {
        name: 'Summer',
        value: 'SUM',
      },
    ],
  })
  session: string;
  @NumberOption({
    name: 'year',
    description: 'The year',
    required: false,
  })
  year?: number;
}
