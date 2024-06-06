import { expect, jest, test, beforeAll, describe } from '@jest/globals';
import dotenv from 'dotenv';
import Snapi from '../src/snapi/snapi';
import { LoginData, BedData, BedSide_e, Actuator_e, Outlets_e } from '../src/snapi/interfaces';

dotenv.config();

describe('snapi', () => {
  let snapi: Snapi;
  let loginResponse: LoginData | undefined;
  let bedResponse: BedData | undefined;

  beforeAll(async () => {
    const username = process.env.USERNAME;
    const password = process.env.PASSWORD;
    snapi = new Snapi(username!, password!);
    loginResponse = await snapi.login();
    bedResponse = await snapi.bed();
  });

  test('should login successfully', async () => {
    expect(loginResponse).toEqual(expect.objectContaining({"edpLoginStatus": 200}));
  });

  test('should get registration data', async () => {
    const result = await snapi.getRegistration();
    expect(result).toEqual(expect.objectContaining({"status": 200}));
  });

  test('should get family status', async () => {
    const result = await snapi.getFamilyStatus();
    expect(result).toEqual(expect.objectContaining({"status": 200}));
  });

  test('should get sleeper data', async () => {
    const result = await snapi.getSleeper();
    expect(result).toEqual(expect.objectContaining({"status": 200}));
  });

  test('should get bed data', async () => {
    const result = await snapi.getBed();
    expect(result).toEqual(expect.objectContaining({"status": 200}));
  });

  test('should get bed status data', async () => {
    const result = await snapi.getBedStatus(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({"status": 200}));
  });

  test('should get and put bed pause mode data', async () => {
    const result = await snapi.getBedPauseMode(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({"status": 200}));
    const putResult = await snapi.putBedPauseMode(bedResponse!.beds[1].bedId, result!.data.pauseMode);
    expect(putResult).toEqual(expect.objectContaining({"status": 200}));
  });

  test('should get pump status and put sleep number data', async () => {
    const result = await snapi.getPumpStatus(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({"status": 200}));
    const putResult = await snapi.putSleepNumber(bedResponse!.beds[1].bedId, BedSide_e.leftSide, result!.data.leftSideSleepNumber);
    expect(putResult).toEqual(expect.objectContaining({"status": 200}));
  });

  test('should get and put responsive air data', async () => {
    const result = await snapi.getResponsiveAirStatus(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({"status": 200}));
    const putResult = await snapi.putResponsiveAir(bedResponse!.beds[1].bedId, result!.data.leftSideEnabled, result!.data.rightSideEnabled);
    expect(putResult).toEqual(expect.objectContaining({"status": 200}));
  });

  test('should put force idle state', async () => {
    const result = await snapi.putForceIdle(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({"status": 200}));
  });

  // skipping preset for now

  test('should get and put foundation status', async () => {
    const result = await snapi.getFoundationStatus(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({"status": 200}));
    const putResult = await snapi.putAdjust(bedResponse!.beds[1].bedId, BedSide_e.leftSide, Number(result!.data.fsLeftFootPosition), Actuator_e.Foot);
    expect(putResult).toEqual(expect.objectContaining({"status": 200}));
  });

  test('should get and put outlet status', async () => {
    const result = await snapi.getOutletStatus(bedResponse!.beds[1].bedId, Outlets_e.LeftLight);
    expect(result).toEqual(expect.objectContaining({"status": 200}));
    const putResult = await snapi.putOutlet(bedResponse!.beds[1].bedId, Outlets_e.LeftLight, result!.data.setting);
    expect(putResult).toEqual(expect.objectContaining({"status": 200}));
  });

  // skipping motion for now

  test('should get and put underbed light status', async () => {
    const result = await snapi.getUnderbedLightStatus(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({"status": 200}));
    const putResult = await snapi.putUnderbedLight(bedResponse!.beds[1].bedId, result!.data.enableAuto);
    expect(putResult).toEqual(expect.objectContaining({"status": 200}));
  });

  test('should get and put footwarming status', async () => {
    const result = await snapi.getFootwarmingStatus(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({"status": 200}));
    console.log(result?.data)
    const putResult = await snapi.putFootwarming(bedResponse!.beds[1].bedId, result!.data.footWarmingStatusLeft, result!.data.footWarmingStatusRight, result!.data.footWarmingTimerLeft, result!.data.footWarmingTimerRight);
    expect(putResult).toEqual(expect.objectContaining({"status": 200}));
  });

  // skipping adjustment for now

  // skipping sleep data for now

  // skipping sleep slice data for now

});
