import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings.js';
import { BedControlPlatform } from './platform.js';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, BedControlPlatform);
};
