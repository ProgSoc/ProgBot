import { Signale } from '@dynamicabot/signales';

const mainLogger = new Signale({
  config: {
    displayBadge: true,
    displayScope: true,
    displayLabel: true,
  },
});

export default mainLogger;
