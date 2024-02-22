import { Signale } from "@dynamicabot/signales";

const mainLogger = new Signale({
  config: {
    displayBadge: true,
    displayScope: true,
    displayLabel: true,
  },
  scope: "Main",
});

export default mainLogger;
