import { NumberOption, StringOption } from 'necord';

export class TimetableActivitiesCommandDto {
  @StringOption({
    name: 'code',
    description: 'The subject code',
    required: true,
  })
  code: string;
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
  session: 'SUM' | 'AUT' | 'SPR';
  @NumberOption({
    name: 'year',
    description: 'The year',
    required: false,
  })
  year?: number;
}
