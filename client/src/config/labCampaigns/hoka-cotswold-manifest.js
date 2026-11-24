/** Lab config — HOKA manifest creation demo (links to hoka-cotswold customer journey). */

import hokaCotswold from './hoka-cotswold';
import { MANIFEST_JOURNEY_STAGES, MANIFEST_TURNSTYLE_COMPONENTS } from './defaults';

export default {
  ...hokaCotswold,
  configId: 'hoka-cotswold-manifest',
  labMode: 'manifest',
  campaignName: 'HOKA Instant Win — Setup',
  embedCustomerPhone: false,
  customerLabConfigId: 'hoka-cotswold',
  timelineTitle: 'Manifest creation',
  journeyStages: MANIFEST_JOURNEY_STAGES,
  turnstyleComponents: MANIFEST_TURNSTYLE_COMPONENTS,
};
