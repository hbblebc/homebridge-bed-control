import { expect, test, beforeAll, describe } from '@jest/globals';
import dotenv from 'dotenv';
import Snapi from '../src/snapi/snapi';
import { LoginData, BedData, BedSide_e, Actuator_e, Outlets_e, Preset_e, Adjustment_e, Motion_e } from '../src/snapi/interfaces';
import { Logging } from 'homebridge';
import { mock } from 'ts-jest-mocker';

dotenv.config();

describe('snapi', () => {
  let snapi: Snapi;
  let loginResponse: LoginData | undefined;
  let bedResponse: BedData | undefined;
  let mockLogging: Logging;

  beforeAll(async () => {
    const username = process.env.USERNAME;
    const password = process.env.PASSWORD;
    mockLogging = mock<Logging>();
    mockLogging.info = () => { };
    mockLogging.warn = () => { };
    mockLogging.error = () => { };
    mockLogging.debug = () => { };

    snapi = new Snapi(username!, password!, mockLogging);
    loginResponse = await snapi.login();
    bedResponse = await snapi.bed();
  });

  test('should login successfully', async () => {
    expect(loginResponse).toEqual(expect.objectContaining({'edpLoginStatus': 200}));
  });

  test('should get registration data', async () => {
    const result = await snapi.getRegistration();
    expect(result).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should get family status', async () => {
    const result = await snapi.getFamilyStatus();
    expect(result).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should get sleeper data', async () => {
    const result = await snapi.getSleeper();
    expect(result).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should get bed data', async () => {
    const result = await snapi.getBed();
    expect(result).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should get bed status data', async () => {
    const result = await snapi.getBedStatus(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should get and put bed pause mode data', async () => {
    const result = await snapi.getBedPauseMode(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({'status': 200}));
    const putResult = await snapi.putBedPauseMode(bedResponse!.beds[1].bedId, result!.data.pauseMode);
    expect(putResult).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should get pump status and put sleep number data', async () => {
    const result = await snapi.getPumpStatus(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({'status': 200}));
    const putResult = await snapi.putSleepNumber(bedResponse!.beds[1].bedId, BedSide_e.leftSide, result!.data.leftSideSleepNumber);
    expect(putResult).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should get and put responsive air data', async () => {
    const result = await snapi.getResponsiveAirStatus(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({'status': 200}));
    const putResult = await snapi.putResponsiveAir(bedResponse!.beds[1].bedId, result!.data.leftSideEnabled, result!.data.rightSideEnabled);
    expect(putResult).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should put force idle state', async () => {
    const result = await snapi.putForceIdle(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should put preset', async () => {
    const bedId = bedResponse!.beds[1].bedId;
    const side = BedSide_e.rightSide;
    const preset = Preset_e.Flat;
    const result = await snapi.putPreset(bedId, side, preset);
    expect(result).toEqual(expect.objectContaining({ 'status': 200 }));
  });

  test('should get and put foundation status', async () => {
    const result = await snapi.getFoundationStatus(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({'status': 200}));
    const putResult = await snapi.putAdjust(
      bedResponse!.beds[1].bedId,
      BedSide_e.leftSide,
      Number(result!.data.fsLeftFootPosition),
      Actuator_e.Foot);
    expect(putResult).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should get and put outlet status', async () => {
    const result = await snapi.getOutletStatus(bedResponse!.beds[1].bedId, Outlets_e.LeftLight);
    expect(result).toEqual(expect.objectContaining({'status': 200}));
    const putResult = await snapi.putOutlet(bedResponse!.beds[1].bedId, Outlets_e.LeftLight, result!.data.setting);
    expect(putResult).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should put motion', async () => {
    const bedId = bedResponse!.beds[1].bedId;
    const side = BedSide_e.rightSide;
    const head = Motion_e.Off;
    const massage = Motion_e.Off;
    const foot = Motion_e.Off;

    const result = await snapi.putMotion(bedId, side, head, massage, foot);

    expect(result).toEqual(expect.objectContaining({ 'status': 200 }));
  });

  test('should get and put underbed light status', async () => {
    const result = await snapi.getUnderbedLightStatus(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({'status': 200}));
    const putResult = await snapi.putUnderbedLight(bedResponse!.beds[1].bedId, result!.data.enableAuto);
    expect(putResult).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should get and put footwarming status', async () => {
    const result = await snapi.getFootwarmingStatus(bedResponse!.beds[1].bedId);
    expect(result).toEqual(expect.objectContaining({'status': 200}));
    const putResult = await snapi.putFootwarming(
      bedResponse!.beds[1].bedId,
      result!.data.footWarmingStatusLeft,
      result!.data.footWarmingStatusRight,
      result!.data.footWarmingTimerLeft,
      result!.data.footWarmingTimerRight);
    expect(putResult).toEqual(expect.objectContaining({'status': 200}));
  });

  test('should put adjustment', async () => {
    const bedId = bedResponse!.beds[1].bedId;
    const side = BedSide_e.rightSide;
    const head = Adjustment_e.Off;
    const waveMode = Adjustment_e.Off;
    const foot = Adjustment_e.Off;
    const timer = 15;
    const result = await snapi.putAdjustment(bedId, side, head, waveMode, foot, timer);
    expect(result).toEqual(expect.objectContaining({ 'status': 200 }));
  });

  test('should get sleep data', async () => {
    const dataDate = '2022-01-01';
    const interval = 'D1';
    const sleeper = bedResponse!.beds[1].sleeperRightId;
    const result = await snapi.getSleepData(dataDate, interval, sleeper);
    expect(result).toEqual(expect.objectContaining({ 'status': 200 }));
  });

  test('should get sleep slice data', async () => {
    const dataDate = '2022-01-01';
    const sleeper = bedResponse!.beds[1].sleeperRightId;
    const result = await snapi.getSleepSliceData(dataDate, sleeper);
    expect(result).toEqual(expect.objectContaining({ 'status': 200 }));
  });

});
