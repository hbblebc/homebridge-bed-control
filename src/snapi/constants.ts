const rootURL: string = 'https://api.sleepiq.sleepnumber.com/rest/';

export const loginURL: string = `${rootURL}login`;
export const registrationURL: string = `${rootURL}registration`;
export const sleeperURL: string = `${rootURL}sleeper`;
export const bedURL: string = `${rootURL}bed`;
export const sleepDataURL: string = `${rootURL}sleepData`;
export const sleepSliceDataURL: string = `${rootURL}sleepSliceData`;

export const familyStatusURL: string = `${bedURL}/familyStatus`;

const bedIdURL: string = `${bedURL}/{0}/`;
export const bedStatusURL: string = `${bedIdURL}status`;
export const bedPauseModeURL: string = `${bedIdURL}pauseMode`;
export const sleepNumberURL: string = `${bedIdURL}sleepNumber`;
export const responsiveAirURL: string = `${bedIdURL}responsiveAir`;

const pumpURL: string = `${bedIdURL}pump/`;
export const forceIdleURL: string = `${pumpURL}forceIdle`;
export const pumpStatusURL: string = `${pumpURL}status`;

const foundationURL: string = `${bedIdURL}foundation/`;
export const presetURL: string = `${foundationURL}preset`;
export const foundationStatusURL: string = `${foundationURL}status`;
export const outletStatusURL: string = `${foundationURL}outlet`;
export const motionURL: string = `${foundationURL}motion`;
export const underbedLightURL: string = `${foundationURL}underbedLight`;
export const pinchURL: string = `${foundationURL}pinch`;
export const systemURL: string = `${foundationURL}system`;
export const statusURL: string = `${foundationURL}status`;
export const footwarmingURL: string = `${foundationURL}footwarming`;

export const adjustmentURL: string = `${foundationURL}adjustment`;
export const adjustURL: string = `${adjustmentURL}/micro`;