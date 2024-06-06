const rootURL = 'https://prod-api.sleepiq.sleepnumber.com/rest/';

export const loginURL = `${rootURL}login`;
export const registrationURL = `${rootURL}registration`;
export const sleeperURL = `${rootURL}sleeper`;
export const bedURL = `${rootURL}bed`;
export const sleepDataURL = `${rootURL}sleepData`;
export const sleepSliceDataURL = `${rootURL}sleepSliceData`;

export const familyStatusURL = `${bedURL}/familyStatus`;

const bedIdURL = `${bedURL}/{0}/`;
export const bedStatusURL = `${bedIdURL}status`;
export const bedPauseModeURL = `${bedIdURL}pauseMode`;
export const sleepNumberURL = `${bedIdURL}sleepNumber`;
export const responsiveAirURL = `${bedIdURL}responsiveAir`;

const pumpURL = `${bedIdURL}pump/`;
export const forceIdleURL = `${pumpURL}forceIdle`;
export const pumpStatusURL = `${pumpURL}status`;

const foundationURL = `${bedIdURL}foundation/`;
export const presetURL = `${foundationURL}preset`;
export const foundationStatusURL = `${foundationURL}status`;
export const outletStatusURL = `${foundationURL}outlet`;
export const motionURL = `${foundationURL}motion`;
export const underbedLightURL = `${foundationURL}underbedLight`;
export const pinchURL = `${foundationURL}pinch`;
export const systemURL = `${foundationURL}system`;
export const statusURL = `${foundationURL}status`;
export const footwarmingURL = `${foundationURL}footwarming`;

export const adjustmentURL = `${foundationURL}adjustment`;
export const adjustURL = `${adjustmentURL}/micro`;