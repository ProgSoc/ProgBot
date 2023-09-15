import { NumberOption } from 'necord';

export class TimeoutCommandDto {
  @NumberOption({
    description: 'The amount of time to timeout for in minutes',
    required: true,
    name: 'timeout',
  })
  timeout: number;
}
