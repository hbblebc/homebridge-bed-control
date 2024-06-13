import { expect, jest, test, beforeEach, afterEach, describe } from '@jest/globals';
import { mock } from 'ts-jest-mocker';
import { API, Characteristic, HAPStatus, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { OccupancySensor } from 'homebridge/node_modules/hap-nodejs/dist/lib/definitions';
import Snapi from '../src/snapi/snapi';
import { BedAccessory } from '../src/bedAccessory';
import { BedControlPlatform } from '../src/platform';
import {
  Actuator_e,
  BedSideKey_e,
  BedStatusData,
  FootwarmingStatusData,
  Footwarming_e,
  FoundationStatusData,
  OutletStatusData,
  Outlet_Setting_e,
  Outlets_e,
  PauseMode_e,
  PumpStatusData,
  ResponsiveAirStatusData,
} from '../src/snapi/interfaces';
import { HomebridgeAPI } from 'homebridge/lib/api';

jest.useFakeTimers();

describe('BedAccessory', () => {
  let bedAccessory: BedAccessory;
  let platform: BedControlPlatform;
  let mockSnapi: Snapi;

  let mockLogging: Logging;
  let mockConfig: PlatformConfig;
  let mockAPI: API;

  let characteristic: Characteristic;
  let service: Service;
  let platformAccessory: PlatformAccessory;

  const bedId = 'bed1';

  beforeEach(() => {

    characteristic = {} as unknown as Characteristic;
    characteristic['onSet'] = jest.fn<() => Characteristic>().mockReturnValue(characteristic);
    characteristic['onGet'] = jest.fn<() => Characteristic>().mockReturnValue(characteristic);
    characteristic['setProps'] = jest.fn<() => Characteristic>().mockReturnValue(characteristic);
    characteristic['setValue'] = jest.fn<() => Characteristic>().mockReturnValue(characteristic);

    service = {} as unknown as Service;
    service['setCharacteristic'] = jest.fn<() => Service>().mockReturnValue(service);
    service['getCharacteristic'] = jest.fn<() => Characteristic>().mockReturnValue(characteristic);
    service['updateCharacteristic'] = jest.fn<() => Service>().mockReturnValue(service);

    platformAccessory = {
      UUID: 'uuid',
      context: {
        ignoreList: [],
        updateInterval: 0,
        sendDelay: 2000,
        bedStats: {
          bedId: 'bed1',
          name: 'bed1',
        },
        bedFeatures: {
          Manufacturer: '',
          leftSide: {
            numberControl: false,
          },
          rightSide: {
            numberControl: false,
          },
          anySide: {
            occupancySensor: false,
          },
        },
      },
      displayName: 'bed1',
      getService: jest.fn<() => Service>().mockReturnValue(service),
    } as unknown as PlatformAccessory;

    mockLogging = mock<Logging>();
    mockConfig = mock<PlatformConfig>();
    // mockAPI = mock<API>();
    mockAPI = new HomebridgeAPI();

    mockLogging.info = () => { };
    mockLogging.warn = () => { };
    mockLogging.error = () => { };
    mockLogging.debug = () => { };
    // mockLogging.error = (message: string, ...parameters: any[]) => console.log(message, parameters);
    // mockLogging.debug = (message: string, ...parameters: any[]) => console.log(message, parameters);
    mockConfig.email = '';
    mockConfig.password = '';
    mockConfig.updateInterval = 0;
    mockConfig.delay = 2;
    mockConfig.bedPlatform = '';
    mockConfig.ignore = [];
    // mockAPI.on = () => {
    //   return mockAPI;
    // };
    // mockAPI.hap.uuid = {
    //   generate: () => 'uuid',
    //   isValid: () => true,
    //   unparse: () => '',
    //   write: () => Buffer.from(''),
    //   toShortForm: () => '',
    //   toLongForm: () => '',
    //   BASE_UUID: '-0000-1000-8000-0026BB765291',
    // };
    // // @ts-expect-error - mock Service not describing full API
    // mockAPI.hap.Service = mock<Service>();
    // // @ts-expect-error - mock Characteristic not describing full API
    // mockAPI.hap.Characteristic = mock<Characteristic>();
    // mockAPI.registerPlatformAccessories = () => { };
    // mockAPI.unregisterPlatformAccessories = () => { };

    platform = new BedControlPlatform(mockLogging, mockConfig, mockAPI);

    mockSnapi = mock(Snapi);

    bedAccessory = new BedAccessory(platform, platformAccessory, mockSnapi);
  });

  afterEach(() => {
    // jest.resetAllMocks();
  });

  test('should create an instance of BedAccessory', () => {
    expect(bedAccessory).toBeInstanceOf(BedAccessory);
  });

  test('should set privacy mode to on', async () => {
    const setBedPauseModeMock = jest.spyOn(mockSnapi, 'setBedPauseMode');
    const mockValue = true;

    await bedAccessory.setPrivacy(mockValue);

    expect(setBedPauseModeMock).toHaveBeenCalledWith(bedId, PauseMode_e.On);
    expect(platform.privacyModeEnabled[bedId]).toBe(mockValue);
  });

  test('should set privacy mode to off', async () => {
    const setBedPauseModeMock = jest.spyOn(mockSnapi, 'setBedPauseMode');
    const mockValue = false;

    await bedAccessory.setPrivacy(mockValue);

    expect(setBedPauseModeMock).toHaveBeenCalledWith(bedId, PauseMode_e.Off);
    expect(platform.privacyModeEnabled[bedId]).toBe(mockValue);
  });

  test('should get privacy mode', async () => {
    const pauseMode = PauseMode_e.On;
    const mockPauseMode = jest.spyOn(mockSnapi, 'bedPauseMode').mockResolvedValue(pauseMode);

    const result = await bedAccessory.getPrivacy();

    expect(mockPauseMode).toHaveBeenCalledWith(bedId);
    expect(result).toBe(true);
  });

  test('should set the number for the left side', async () => {
    const setSleepNumberMock = jest.spyOn(mockSnapi, 'sleepNumber');
    const side = BedSideKey_e.LeftSide;
    const value = 50;
    await bedAccessory.setNumber(side, value);
    jest.runAllTimers();
    expect(setSleepNumberMock).toHaveBeenCalledWith(bedId, 'L', value);
  });

  test('should set the number for the right side', async () => {
    const setSleepNumberMock = jest.spyOn(mockSnapi, 'sleepNumber');
    const side = BedSideKey_e.RightSide;
    const value = 60;
    await bedAccessory.setNumber(side, value);
    jest.runAllTimers();
    expect(setSleepNumberMock).toHaveBeenCalledWith(bedId, 'R', value);
  });

  test('should get the number for the left side', async () => {
    const data: PumpStatusData = {
      leftSideSleepNumber: 50,
      rightSideSleepNumber: 60,
      activeTask: 0,
      chamberType: 0,
    };
    jest.spyOn(bedAccessory, 'getPumpStatus').mockResolvedValue(data);
    const result = await bedAccessory.getNumber(BedSideKey_e.LeftSide);
    expect(result).toBe(50);
  });

  test('should get the number for the right side', async () => {
    const data: PumpStatusData = {
      leftSideSleepNumber: 50,
      rightSideSleepNumber: 60,
      activeTask: 0,
      chamberType: 0,
    };
    jest.spyOn(bedAccessory, 'getPumpStatus').mockResolvedValue(data);
    const result = await bedAccessory.getNumber(BedSideKey_e.RightSide);
    expect(result).toBe(60);
  });

  test('should throw an error if communication with the service fails [getNumber]', async () => {
    jest.spyOn(bedAccessory, 'getPumpStatus').mockResolvedValue(undefined);
    await expect(bedAccessory.getNumber(BedSideKey_e.LeftSide)).rejects.toThrow(
      new platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE));
  });

  test('should get occupancy for the left side', async () => {
    bedAccessory.services = {
      leftSide: {
        occupancySensor: {
          getCharacteristic: () => ({ value: true } as unknown as Characteristic),
          updateCharacteristic: () => ({} as unknown as Service),
        } as unknown as OccupancySensor,
      },
    };
    bedAccessory.services['rightSide'] = {...bedAccessory.services['leftSide']};
    bedAccessory.services['anySide'] = {...bedAccessory.services['leftSide']};
    const data: BedStatusData = {
      leftSide: {
        isInBed: true,
        alertDetailedMessage: '',
        sleepNumber: 0,
        alertId: 0,
        lastLink: '',
        pressure: 0,
      },
      rightSide: {
        isInBed: false,
        alertDetailedMessage: '',
        sleepNumber: 0,
        alertId: 0,
        lastLink: '',
        pressure: 0,
      },
      status: 0,
    };
    jest.spyOn(bedAccessory, 'getBedStatus').mockResolvedValue(data);
    const result = await bedAccessory.getOccupancy(BedSideKey_e.LeftSide);
    expect(result).toBe(1);
  });

  test('should get occupancy for the right side', async () => {
    bedAccessory.services = {
      leftSide: {
        occupancySensor: {
          getCharacteristic: () => ({ value: true } as unknown as Characteristic),
          updateCharacteristic: () => ({} as unknown as Service),
        } as unknown as OccupancySensor,
      },
    };
    bedAccessory.services['rightSide'] = { ...bedAccessory.services['leftSide'] };
    bedAccessory.services['anySide'] = { ...bedAccessory.services['leftSide'] };

    const data: BedStatusData = {
      leftSide: {
        isInBed: false,
        alertDetailedMessage: '',
        sleepNumber: 0,
        alertId: 0,
        lastLink: '',
        pressure: 0,
      },
      rightSide: {
        isInBed: true,
        alertDetailedMessage: '',
        sleepNumber: 0,
        alertId: 0,
        lastLink: '',
        pressure: 0,
      },
      status: 0,
    };
    jest.spyOn(bedAccessory, 'getBedStatus').mockResolvedValue(data);
    const result = await bedAccessory.getOccupancy(BedSideKey_e.RightSide);
    expect(result).toBe(1);
  });

  test('should not get occupancy if privacy mode is enabled', async () => {
    bedAccessory.services = {
      leftSide: {
        occupancySensor: {
          getCharacteristic: () => ({ value: true } as unknown as Characteristic),
          updateCharacteristic: () => ({} as unknown as Service),
        } as unknown as OccupancySensor,
      },
    };
    bedAccessory.services['rightSide'] = { ...bedAccessory.services['leftSide'] };
    bedAccessory.services['anySide'] = { ...bedAccessory.services['leftSide'] };

    platform.privacyModeEnabled[bedId] = true;
    const leftResult = await bedAccessory.getOccupancy(BedSideKey_e.LeftSide);
    expect(leftResult).toBe(0);
    const rightResult = await bedAccessory.getOccupancy(BedSideKey_e.RightSide);
    expect(rightResult).toBe(0);
  });

  test('should set responsive air to on for left side', async () => {
    const setResponsiveAirMock = jest.spyOn(mockSnapi, 'responsiveAir');
    const side = BedSideKey_e.LeftSide;
    const value = true;
    await bedAccessory.setResponsiveAir(side, value);
    expect(setResponsiveAirMock).toHaveBeenCalledWith(bedId, value, undefined);
  });

  test('should set responsive air to on for right side', async () => {
    const setResponsiveAirMock = jest.spyOn(mockSnapi, 'responsiveAir');
    const side = BedSideKey_e.RightSide;
    const value = true;
    await bedAccessory.setResponsiveAir(side, value);
    expect(setResponsiveAirMock).toHaveBeenCalledWith(bedId, undefined, value);
  });

  test('should set responsive air to off for left side', async () => {
    const setResponsiveAirMock = jest.spyOn(mockSnapi, 'responsiveAir');
    const side = BedSideKey_e.LeftSide;
    const value = false;
    await bedAccessory.setResponsiveAir(side, value);
    expect(setResponsiveAirMock).toHaveBeenCalledWith(bedId, value, undefined);
  });

  test('should set responsive air to off for right side', async () => {
    const setResponsiveAirMock = jest.spyOn(mockSnapi, 'responsiveAir');
    const side = BedSideKey_e.RightSide;
    const value = false;
    await bedAccessory.setResponsiveAir(side, value);
    expect(setResponsiveAirMock).toHaveBeenCalledWith(bedId, undefined, value);
  });

  test('should get responsive air status for the left side', async () => {
    const data: ResponsiveAirStatusData = {
      adjustmentThreshold: 0,
      inBedTimeout: 0,
      leftSideEnabled: true,
      outOfBedTimeout: 0,
      pollFrequency: 0,
      prefSyncState: '',
      rightSideEnabled: false,
    };
    jest.spyOn(bedAccessory, 'getResponsiveAirStatus').mockResolvedValue(data);
    const result = await bedAccessory.getResponsiveAir(BedSideKey_e.LeftSide);
    expect(result).toBe(true);
  });

  test('should get responsive air status for the right side', async () => {
    const data: ResponsiveAirStatusData = {
      adjustmentThreshold: 0,
      inBedTimeout: 0,
      leftSideEnabled: false,
      outOfBedTimeout: 0,
      pollFrequency: 0,
      prefSyncState: '',
      rightSideEnabled: true,
    };
    jest.spyOn(bedAccessory, 'getResponsiveAirStatus').mockResolvedValue(data);
    const result = await bedAccessory.getResponsiveAir(BedSideKey_e.RightSide);
    expect(result).toBe(true);
  });

  test('should throw an error if communication with the service fails [getResponsiveAir]', async () => {
    jest.spyOn(bedAccessory, 'getResponsiveAirStatus').mockResolvedValue(undefined);
    await expect(bedAccessory.getResponsiveAir(BedSideKey_e.LeftSide)).rejects.toThrow(
      new platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE),
    );
  });

  test('should set the position for the left side head actuator', async () => {
    const adjustActuatorMock = jest.spyOn(mockSnapi, 'adjust');
    const side = BedSideKey_e.LeftSide;
    const actuator = Actuator_e.Head;
    const value = 50;
    await bedAccessory.setActuatorPosition(side, actuator, value);
    jest.runAllTimers();
    expect(adjustActuatorMock).toHaveBeenCalledWith(bedId, 'L', value, actuator);
  });

  test('should set the position for the left side foot actuator', async () => {
    const adjustActuatorMock = jest.spyOn(mockSnapi, 'adjust');
    const side = BedSideKey_e.LeftSide;
    const actuator = Actuator_e.Foot;
    const value = 60;
    await bedAccessory.setActuatorPosition(side, actuator, value);
    jest.runAllTimers();
    expect(adjustActuatorMock).toHaveBeenCalledWith(bedId, 'L', value, actuator);
  });

  test('should set the position for the right side head actuator', async () => {
    const adjustActuatorMock = jest.spyOn(mockSnapi, 'adjust');
    const side = BedSideKey_e.RightSide;
    const actuator = Actuator_e.Head;
    const value = 70;
    await bedAccessory.setActuatorPosition(side, actuator, value);
    jest.runAllTimers();
    expect(adjustActuatorMock).toHaveBeenCalledWith(bedId, 'R', value, actuator);
  });

  test('should set the position for the right side foot actuator', async () => {
    const adjustActuatorMock = jest.spyOn(mockSnapi, 'adjust');
    const side = BedSideKey_e.RightSide;
    const actuator = Actuator_e.Foot;
    const value = 80;
    await bedAccessory.setActuatorPosition(side, actuator, value);
    jest.runAllTimers();
    expect(adjustActuatorMock).toHaveBeenCalledWith(bedId, 'R', value, actuator);
  });

  test('should get the position for the left side head actuator', async () => {
    const data = {
      fsLeftHeadPosition: '32',
      fsRightHeadPosition: '3c',
      fsLeftFootPosition: '46',
      fsRightFootPosition: '50',
    } as unknown as FoundationStatusData;
    jest.spyOn(bedAccessory, 'getFoundationStatus').mockResolvedValue(data);
    const result = await bedAccessory.getActuatorPosition(BedSideKey_e.LeftSide, Actuator_e.Head);
    expect(result).toBe(50);
  });

  test('should get the position for the left side foot actuator', async () => {
    const data = {
      fsLeftHeadPosition: '32',
      fsRightHeadPosition: '3c',
      fsLeftFootPosition: '46',
      fsRightFootPosition: '50',
    } as unknown as FoundationStatusData;
    jest.spyOn(bedAccessory, 'getFoundationStatus').mockResolvedValue(data);
    const result = await bedAccessory.getActuatorPosition(BedSideKey_e.LeftSide, Actuator_e.Foot);
    expect(result).toBe(70);
  });

  test('should get the position for the right side head actuator', async () => {
    const data = {
      fsLeftHeadPosition: '32',
      fsRightHeadPosition: '3c',
      fsLeftFootPosition: '46',
      fsRightFootPosition: '50',
    } as unknown as FoundationStatusData;
    jest.spyOn(bedAccessory, 'getFoundationStatus').mockResolvedValue(data);
    const result = await bedAccessory.getActuatorPosition(BedSideKey_e.RightSide, Actuator_e.Head);
    expect(result).toBe(60);
  });

  test('should get the position for the right side foot actuator', async () => {
    const data = {
      fsLeftHeadPosition: '32',
      fsRightHeadPosition: '3c',
      fsLeftFootPosition: '46',
      fsRightFootPosition: '50',
    } as unknown as FoundationStatusData;
    jest.spyOn(bedAccessory, 'getFoundationStatus').mockResolvedValue(data);
    const result = await bedAccessory.getActuatorPosition(BedSideKey_e.RightSide, Actuator_e.Foot);
    expect(result).toBe(80);
  });

  test('should set the outlet state to on', async () => {
    const setOutletMock = jest.spyOn(mockSnapi, 'outlet');
    const outlet = Outlets_e.LeftPlug;
    const value = true;
    await bedAccessory.setOutlet(outlet, value);
    expect(setOutletMock).toHaveBeenCalledWith(bedId, outlet, Outlet_Setting_e.On);
  });

  test('should set the outlet state to off', async () => {
    const setOutletMock = jest.spyOn(mockSnapi, 'outlet');
    const outlet = Outlets_e.LeftPlug;
    const value = false;
    await bedAccessory.setOutlet(outlet, value);
    expect(setOutletMock).toHaveBeenCalledWith(bedId, outlet, Outlet_Setting_e.Off);
  });

  test('should get the outlet state', async () => {
    const outlet = Outlets_e.LeftPlug;
    const outletStatus = Outlet_Setting_e.On;
    const data = { setting: outletStatus } as unknown as OutletStatusData;
    jest.spyOn(mockSnapi, 'outletStatus').mockResolvedValue(data);
    const result = await bedAccessory.getOutlet(outlet);
    expect(result).toBe(outletStatus);
  });

  test('should throw an error if communication with the service fails [setOutlet]', async () => {
    jest.spyOn(mockSnapi, 'outletStatus').mockResolvedValue(undefined);
    const outlet = Outlets_e.LeftPlug;
    await expect(bedAccessory.getOutlet(outlet)).rejects.toThrow(
      new platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE),
    );
  });

  test('should set the outlet state to on for any side outlet', async () => {
    platformAccessory.context.bedFeatures.leftSide.outlet = true;
    platformAccessory.context.bedFeatures.rightSide.outlet = true;
    const setOutletMock = jest.spyOn(mockSnapi, 'outlet');
    const outletKey = 'outlet';
    const value = true;
    await bedAccessory.setAnyOutlet(outletKey, value);
    expect(setOutletMock).toHaveBeenCalledWith(bedId, Outlets_e.LeftPlug, Outlet_Setting_e.On);
    expect(setOutletMock).toHaveBeenCalledWith(bedId, Outlets_e.RightPlug, Outlet_Setting_e.On);
  });

  test('should set the outlet state to off for any side outlet', async () => {
    platformAccessory.context.bedFeatures.leftSide.outlet = true;
    platformAccessory.context.bedFeatures.rightSide.outlet = true;
    const setOutletMock = jest.spyOn(mockSnapi, 'outlet');
    const outletKey = 'outlet';
    const value = false;
    await bedAccessory.setAnyOutlet(outletKey, value);
    expect(setOutletMock).toHaveBeenCalledWith(bedId, Outlets_e.LeftPlug, Outlet_Setting_e.Off);
    expect(setOutletMock).toHaveBeenCalledWith(bedId, Outlets_e.RightPlug, Outlet_Setting_e.Off);
  });

  test('should set the outlet state to on for any side light', async () => {
    platformAccessory.context.bedFeatures.leftSide.light = true;
    platformAccessory.context.bedFeatures.rightSide.light = true;
    const setOutletMock = jest.spyOn(mockSnapi, 'outlet');
    const outletKey = 'light';
    const value = true;
    await bedAccessory.setAnyOutlet(outletKey, value);
    expect(setOutletMock).toHaveBeenCalledWith(bedId, Outlets_e.LeftLight, Outlet_Setting_e.On);
    expect(setOutletMock).toHaveBeenCalledWith(bedId, Outlets_e.RightLight, Outlet_Setting_e.On);
  });

  test('should set the outlet state to off for any side light', async () => {
    platformAccessory.context.bedFeatures.leftSide.light = true;
    platformAccessory.context.bedFeatures.rightSide.light = true;
    const setOutletMock = jest.spyOn(mockSnapi, 'outlet');
    const outletKey = 'light';
    const value = false;
    await bedAccessory.setAnyOutlet(outletKey, value);
    expect(setOutletMock).toHaveBeenCalledWith(bedId, Outlets_e.LeftLight, Outlet_Setting_e.Off);
    expect(setOutletMock).toHaveBeenCalledWith(bedId, Outlets_e.RightLight, Outlet_Setting_e.Off);
  });

  test('should get the outlet state for any side', async () => {
    platformAccessory.context.bedFeatures.leftSide.outlet = true;
    platformAccessory.context.bedFeatures.rightSide.outlet = true;
    const outletStatus = Outlet_Setting_e.On;
    const leftOutletData = {
      outlet: Outlets_e.LeftPlug,
      setting: outletStatus,
    } as unknown as OutletStatusData;
    const rightOutletData = {
      outlet: Outlets_e.RightPlug,
      setting: outletStatus,
    } as unknown as OutletStatusData;
    jest.spyOn(mockSnapi, 'outletStatus')
      .mockResolvedValueOnce(leftOutletData)
      .mockResolvedValueOnce(rightOutletData);

    const result = await bedAccessory.getAnyOutlet('outlet');

    expect(result).toBe(outletStatus);
    expect(mockSnapi.outletStatus).toHaveBeenNthCalledWith(1, bedId, Outlets_e.LeftPlug);
    expect(mockSnapi.outletStatus).toHaveBeenNthCalledWith(2, bedId, Outlets_e.RightPlug);
  });

  test('should throw an error if communication with the service fails [getAnyOutlet]', async () => {
    jest.spyOn(mockSnapi, 'outletStatus').mockResolvedValue(undefined);

    await expect(bedAccessory.getAnyOutlet('outlet')).rejects.toThrow(
      new platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE),
    );
  });

  test('should get the footwarming time remaining for the left side', async () => {
    const data: FootwarmingStatusData = {
      footWarmingTimerLeft: 50,
      footWarmingTimerRight: 0,
      footWarmingStatusLeft: Footwarming_e.Low,
      footWarmingStatusRight: Footwarming_e.Off,
    };
    jest.spyOn(bedAccessory, 'getFootwarmingStatus').mockResolvedValue(data);
    const result = await bedAccessory.getFootwarmingTimeRemaining(BedSideKey_e.LeftSide);
    expect(result).toBe(10);
  });

  test('should get the footwarming time remaining for the right side', async () => {
    const data: FootwarmingStatusData = {
      footWarmingTimerLeft: 0,
      footWarmingTimerRight: 50,
      footWarmingStatusLeft: Footwarming_e.Off,
      footWarmingStatusRight: Footwarming_e.High,
    };
    jest.spyOn(bedAccessory, 'getFootwarmingStatus').mockResolvedValue(data);
    const result = await bedAccessory.getFootwarmingTimeRemaining(BedSideKey_e.RightSide);
    expect(result).toBe(10);
  });

  test('should throw an error if communication with the service fails [getFootwarmingTimeRemaining]', async () => {
    jest.spyOn(bedAccessory, 'getFootwarmingStatus').mockResolvedValue(undefined);
    await expect(bedAccessory.getFootwarmingTimeRemaining(BedSideKey_e.LeftSide)).rejects.toThrow(
      new platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE),
    );
  });

  test('should set the footwarming time remaining for the left side', async () => {
    const setFootwarmingMock = jest.spyOn(mockSnapi, 'footwarming');
    const side = BedSideKey_e.LeftSide;
    const value = 10;
    const data = {
      footWarmingStatusLeft: 0,
    } as unknown as FootwarmingStatusData;
    jest.spyOn(mockSnapi, 'footwarmingStatus').mockResolvedValue(data);
    await bedAccessory.setFootwarmingTimeRemaining(side, value);
    jest.runAllTimers();
    expect(setFootwarmingMock).toHaveBeenCalledWith(bedId, 0, undefined, 50, undefined);
  });

  test('should set the footwarming time remaining for the right side', async () => {
    const setFootwarmingMock = jest.spyOn(mockSnapi, 'footwarming');
    const side = BedSideKey_e.RightSide;
    const value = 10;
    const data = {
      footWarmingStatusRight: 0,
    } as unknown as FootwarmingStatusData;
    jest.spyOn(mockSnapi, 'footwarmingStatus').mockResolvedValue(data);
    await bedAccessory.setFootwarmingTimeRemaining(side, value);
    jest.runAllTimers();
    expect(setFootwarmingMock).toHaveBeenCalledWith(bedId, undefined, 0, undefined, 50);
  });

  test('should set the footwarming value for the left side', async () => {
    const setFootwarmingMock = jest.spyOn(bedAccessory, 'setFootwarming');
    const side = BedSideKey_e.LeftSide;
    const value = 2;
    await bedAccessory.setFootwarmingValue(side, value);
    expect(setFootwarmingMock).toHaveBeenCalledWith(side, Footwarming_e.Med);
  });

  test('should set the footwarming value for the right side', async () => {
    const setFootwarmingMock = jest.spyOn(bedAccessory, 'setFootwarming');
    const side = BedSideKey_e.RightSide;
    const value = 1;
    await bedAccessory.setFootwarmingValue(side, value);
    expect(setFootwarmingMock).toHaveBeenCalledWith(side, Footwarming_e.High);
  });

  test('should get the footwarming value for the left side', async () => {
    const footwarmingStatus = Footwarming_e.Low;
    jest.spyOn(bedAccessory, 'getFootwarming').mockResolvedValue(footwarmingStatus);
    const result = await bedAccessory.getFootwarmingValue(BedSideKey_e.LeftSide);
    expect(result).toBe(2);
  });

  test('should get the footwarming value for the right side', async () => {
    const footwarmingStatus = Footwarming_e.High;
    jest.spyOn(bedAccessory, 'getFootwarming').mockResolvedValue(footwarmingStatus);
    const result = await bedAccessory.getFootwarmingValue(BedSideKey_e.RightSide);
    expect(result).toBe(1);
  });

  test('should set footwarming to Off for left side', async () => {
    const setFootwarmingMock = jest.spyOn(mockSnapi, 'footwarming');
    const side = BedSideKey_e.LeftSide;
    const value = Footwarming_e.Off;
    await bedAccessory.setFootwarming(side, value);
    expect(setFootwarmingMock).toHaveBeenCalledWith(bedId, value, undefined, 100, undefined);
  });

  test('should set footwarming to Off for right side', async () => {
    const setFootwarmingMock = jest.spyOn(mockSnapi, 'footwarming');
    const side = BedSideKey_e.RightSide;
    const value = Footwarming_e.Off;
    await bedAccessory.setFootwarming(side, value);
    expect(setFootwarmingMock).toHaveBeenCalledWith(bedId, undefined, value, undefined, 100);
  });

  test('should set footwarming to Low for left side', async () => {
    const setFootwarmingMock = jest.spyOn(mockSnapi, 'footwarming');
    const side = BedSideKey_e.LeftSide;
    const value = Footwarming_e.Low;
    await bedAccessory.setFootwarming(side, value);
    expect(setFootwarmingMock).toHaveBeenCalledWith(bedId, value, undefined, 100, undefined);
  });

  test('should set footwarming to Low for right side', async () => {
    const setFootwarmingMock = jest.spyOn(mockSnapi, 'footwarming');
    const side = BedSideKey_e.RightSide;
    const value = Footwarming_e.Low;
    await bedAccessory.setFootwarming(side, value);
    expect(setFootwarmingMock).toHaveBeenCalledWith(bedId, undefined, value, undefined, 100);
  });

  test('should set footwarming to Med for left side', async () => {
    const setFootwarmingMock = jest.spyOn(mockSnapi, 'footwarming');
    const side = BedSideKey_e.LeftSide;
    const value = Footwarming_e.Med;
    await bedAccessory.setFootwarming(side, value);
    expect(setFootwarmingMock).toHaveBeenCalledWith(bedId, value, undefined, 100, undefined);
  });

  test('should set footwarming to Med for right side', async () => {
    const setFootwarmingMock = jest.spyOn(mockSnapi, 'footwarming');
    const side = BedSideKey_e.RightSide;
    const value = Footwarming_e.Med;
    await bedAccessory.setFootwarming(side, value);
    expect(setFootwarmingMock).toHaveBeenCalledWith(bedId, undefined, value, undefined, 100);
  });

  test('should set footwarming to High for left side', async () => {
    const setFootwarmingMock = jest.spyOn(mockSnapi, 'footwarming');
    const side = BedSideKey_e.LeftSide;
    const value = Footwarming_e.High;
    await bedAccessory.setFootwarming(side, value);
    expect(setFootwarmingMock).toHaveBeenCalledWith(bedId, value, undefined, 100, undefined);
  });

  test('should set footwarming to High for right side', async () => {
    const setFootwarmingMock = jest.spyOn(mockSnapi, 'footwarming');
    const side = BedSideKey_e.RightSide;
    const value = Footwarming_e.High;
    await bedAccessory.setFootwarming(side, value);
    expect(setFootwarmingMock).toHaveBeenCalledWith(bedId, undefined, value, undefined, 100);
  });

  test('should get the footwarming state for the left side', async () => {
    const data = {
      footWarmingStatusLeft: Footwarming_e.Low,
      footWarmingStatusRight: Footwarming_e.Off,
    } as unknown as FootwarmingStatusData;
    const getFootwarmingStatusMock = jest.spyOn(mockSnapi, 'footwarmingStatus').mockResolvedValue(data);
    const result = await bedAccessory.getFootwarming(BedSideKey_e.LeftSide);
    expect(getFootwarmingStatusMock).toHaveBeenCalled();
    expect(result).toBe(Footwarming_e.Low);
  });

  test('should get the footwarming state for the right side', async () => {
    const data = {
      footWarmingStatusLeft: Footwarming_e.Off,
      footWarmingStatusRight: Footwarming_e.High,
    } as unknown as FootwarmingStatusData;
    const getFootwarmingStatusMock = jest.spyOn(mockSnapi, 'footwarmingStatus').mockResolvedValue(data);
    const result = await bedAccessory.getFootwarming(BedSideKey_e.RightSide);
    expect(getFootwarmingStatusMock).toHaveBeenCalled();
    expect(result).toBe(Footwarming_e.High);
  });

  test('should throw an error if communication with the service fails [getFootwarming]', async () => {
    const getFootwarmingStatusMock = jest.spyOn(mockSnapi, 'footwarmingStatus').mockResolvedValue(undefined);
    await expect(bedAccessory.getFootwarming(BedSideKey_e.LeftSide)).rejects.toThrow(platform.api.hap.HapStatusError);
    expect(getFootwarmingStatusMock).toHaveBeenCalled();
  });

  test('should get the bed status', async () => {
    const bedStatusData: BedStatusData = {
      leftSide: {
        isInBed: true,
        alertDetailedMessage: '',
        sleepNumber: 0,
        alertId: 0,
        lastLink: '',
        pressure: 0,
      },
      rightSide: {
        isInBed: false,
        alertDetailedMessage: '',
        sleepNumber: 0,
        alertId: 0,
        lastLink: '',
        pressure: 0,
      },
      status: 0,
    };
    const mockBedStatus = jest.spyOn(mockSnapi, 'bedStatus').mockResolvedValue(bedStatusData);

    const result = await bedAccessory.getBedStatus();

    expect(mockBedStatus).toHaveBeenCalledWith(bedId);
    expect(result).toBe(bedStatusData);
  });

  test('should get the pump status', async () => {
    const pumpStatusData: PumpStatusData = {
      activeTask: 10,
      chamberType: 10,
      leftSideSleepNumber: 10,
      rightSideSleepNumber: 10,
    };
    const getPumpStatusMock = jest.spyOn(mockSnapi, 'pumpStatus').mockResolvedValue(pumpStatusData);
    const result = await bedAccessory.getPumpStatus();
    expect(getPumpStatusMock).toHaveBeenCalledWith(bedId);
    expect(result).toEqual(pumpStatusData);
  });

  test('should get the responsive air status', async () => {
    const responsiveAirStatus = {
      leftSideEnabled: true,
      rightSideEnabled: false,
    } as unknown as ResponsiveAirStatusData;
    const mockResponsiveAirStatus = jest.spyOn(mockSnapi, 'responsiveAirStatus').mockResolvedValue(responsiveAirStatus);
    const result = await bedAccessory.getResponsiveAirStatus();
    expect(mockResponsiveAirStatus).toHaveBeenCalledWith(bedId);
    expect(result).toEqual(responsiveAirStatus);
  });

  test('should get the foundation status', async () => {
    const foundationStatusData = {
      fsLeftHeadPosition: 50,
      fsRightHeadPosition: 50,
      fsLeftFootPosition: 0,
      fsRightFootPosition: 0,
    } as unknown as FoundationStatusData;
    const mockFoundationStatus = jest.spyOn(mockSnapi, 'foundationStatus').mockResolvedValue(foundationStatusData);
    const result = await bedAccessory.getFoundationStatus();
    expect(mockFoundationStatus).toHaveBeenCalledWith(bedId);
    expect(result).toEqual(foundationStatusData);
  });

  test('should get the footwarming status', async () => {
    const footwarmingStatusData = {
      footWarmingStatusLeft: Footwarming_e.Low,
      footWarmingStatusRight: Footwarming_e.High,
    } as unknown as FootwarmingStatusData;
    const mockFootwarmingStatus = jest.spyOn(mockSnapi, 'footwarmingStatus').mockResolvedValue(footwarmingStatusData);
    const result = await bedAccessory.getFootwarmingStatus();
    expect(mockFootwarmingStatus).toHaveBeenCalledWith(bedId);
    expect(result).toEqual(footwarmingStatusData);
  });

  test('should return the result of the function if no previous request is pending', async () => {
    const bedStatusData = { succeeded: true };
    const func = jest.fn(() => Promise.resolve(bedStatusData));
    const result = await bedAccessory.batchRequests('_bed', func);
    expect(result).toBe(bedStatusData);
    expect(func).toHaveBeenCalledTimes(1);
  });

  test('should return the result of the previous pending request if there is one', async () => {
    const bedStatusData1 = { result: 'first' };
    const bedStatusData2 = { result: 'second' };
    const func1 = jest.fn(() => Promise.resolve(bedStatusData1));
    const func2 = jest.fn(() => Promise.resolve(bedStatusData2));
    const result1 = bedAccessory.batchRequests('_bed', func1);
    const result2 = bedAccessory.batchRequests('_bed', func2);
    expect(result2).toBe(result1);
    expect(func1).toHaveBeenCalledTimes(1);
    expect(func2).not.toHaveBeenCalled();
  });

  test('should clear the pending request after it resolves', async () => {
    const bedStatusData = { succeeded: true };
    const func = jest.fn(() => Promise.resolve(bedStatusData));
    bedAccessory.batchRequests('_bed', func);
    const result = await bedAccessory.batchRequests('_bed', func);
    expect(result).toBe(bedStatusData);
    expect(func).toHaveBeenCalledTimes(1);
  });

  test('should clear the pending request after it rejects', async () => {
    const func = jest.fn(async () => Promise.reject(new Error('error')));
    let result;
    try {
      bedAccessory.batchRequests('_bed', func);
      result = await bedAccessory.batchRequests('_bed', func);
    } catch { /* do nothing */ }
    expect(result).not.toBeDefined();
    expect(func).toHaveBeenCalledTimes(1);
  });

  test('should debounce the function', () => {
    const debounceTimeout = 300;
    const mockFunc = jest.fn();
    const debouncedFunc = bedAccessory.debounce(mockFunc, debounceTimeout);

    // Call the debounced function multiple times within the timeout period
    debouncedFunc();
    debouncedFunc();
    debouncedFunc();

    // Only the last call should be executed after the timeout
    jest.advanceTimersByTime(debounceTimeout);
    expect(mockFunc).toHaveBeenCalledTimes(1);
  });

  test('should debounce the function with custom timeout', () => {
    const debounceTimeout = 500;
    const mockFunc = jest.fn();
    const debouncedFunc = bedAccessory.debounce(mockFunc, debounceTimeout);

    // Call the debounced function multiple times within the timeout period
    debouncedFunc();
    debouncedFunc();
    debouncedFunc();

    // Only the last call should be executed after the timeout
    jest.advanceTimersByTime(debounceTimeout);
    expect(mockFunc).toHaveBeenCalledTimes(1);
  });

});
