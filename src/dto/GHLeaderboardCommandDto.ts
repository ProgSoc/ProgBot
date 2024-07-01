import { StringOption } from "necord";

export class GHLeaderboardCommandDto {
  @StringOption({
    name: "period",
    description:
      "The period to include contributions from. e.g. all, month, week, year",
    required: true,
  })
  period: string;
}
