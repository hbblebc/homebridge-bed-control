import { when } from 'jest-when';
import { expect, jest, test, beforeEach, describe } from '@jest/globals';
import { mock } from 'ts-jest-mocker';
import { BedControlPlatform } from '../src/platform';
import { API, Characteristic, Logger, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import Snapi from '../src/snapi/snapi';
import { PauseMode_e } from '../src/snapi/interfaces';


jest.useFakeTimers();
jest.mock('../src/snapi/snapi', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => {
    return {
      init: Snapi as jest.MockedClass<typeof Snapi>,
      familyStatus: () => undefined,
      bed: () => undefined,
      bedPauseMode: () => undefined,
    };
  }),
}));
// jest.mock('../src/snapi/snapi');

describe('BedControlPlatform', () => {
  let characteristic;
  let service;
  let bed1Accessory;
  let bed2Accessory;
  let familyBeds;

  let mockLogger: Logger;
  let mockConfig: PlatformConfig;
  let mockAPI: API;
  let platform: BedControlPlatform;

  beforeEach(() => {

    characteristic = {};
    characteristic['setCharacteristic'] = () => characteristic;
    characteristic['getCharacteristic'] = () => characteristic;
    characteristic['updateCharacteristic'] = () => characteristic;
    characteristic['onSet'] = () => characteristic;
    characteristic['onGet'] = () => characteristic;
    characteristic['setProps'] = () => characteristic;
    characteristic['setValue'] = () => characteristic;

    service = () => {
      const self = {};
      const setCharacteristic = () => characteristic;
      const getCharacteristic = () => characteristic;
      const updateCharacteristic = () => characteristic;

      self['setCharacteristic'] = setCharacteristic;
      self['getCharacteristic'] = getCharacteristic;
      self['updateCharacteristic'] = updateCharacteristic;
      return (self);
    };

    bed1Accessory = {
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
      getService: service,
    } as unknown as PlatformAccessory;

    bed2Accessory = {
      UUID: 'uuid',
      context: {
        ignoreList: [],
        updateInterval: 0,
        sendDelay: 2000,
        bedStats: {
          bedId: 'bed2',
          name: 'bed2',
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
      displayName: 'bed2',
      getService: service,
    } as unknown as PlatformAccessory;

    familyBeds = [
      { bedId: 'bed1', leftSide: {}, rightSide: {} },
      { bedId: 'bed2', leftSide: {}, rightSide: {} },
    ];

    mockLogger = mock<Logger>();
    mockConfig = mock<PlatformConfig>();
    mockAPI = mock<API>();

    mockLogger.info = () => { };
    mockLogger.warn = () => { };
    mockLogger.error = () => { };
    mockLogger.debug = () => { };
    // mockLogger.error = (message: string, ...parameters: any[]) => console.log(message, parameters);
    // mockLogger.debug = (message: string, ...parameters: any[]) => console.log(message, parameters);
    mockConfig.email = '';
    mockConfig.password = '';
    mockConfig.updateInterval = 0;
    mockConfig.delay = 2;
    mockConfig.bedPlatform = '';
    mockConfig.ignore = [];
    mockAPI.on = () => {
      return mockAPI;
    };
    mockAPI.hap.uuid = {
      generate: () => 'uuid',
      isValid: () => true,
      unparse: () => '',
      write: () => Buffer.from(''),
      toShortForm: () => '',
      toLongForm: () => '',
      BASE_UUID: '-0000-1000-8000-0026BB765291',
    };
    // @ts-expect-error - mock Service not describing full API
    mockAPI.hap.Service = mock<Service>();
    // @ts-expect-error - mock Characteristic not describing full API
    mockAPI.hap.Characteristic = mock<Characteristic>();
    mockAPI.registerPlatformAccessories = () => { };
    mockAPI.unregisterPlatformAccessories = () => { };

    platform = new BedControlPlatform(mockLogger, mockConfig, mockAPI);
  });

  afterEach(() => {
    // jest.resetAllMocks();
  });

  describe('constructor', () => {
    test('should initialize properties correctly', () => {
      expect(platform.disabled).toBe(false);
      expect(platform.username).toBe('');
      expect(platform.password).toBe('');
      expect(platform.updateInterval).toBe(0);
      expect(platform.sendDelay).toBe(2000);
      expect(platform.platform).toBe('');
      expect(platform.ignoreList).toEqual([]);
      expect(platform.snapi['init']).toHaveBeenCalledTimes(1);
      expect(platform.privacyModeEnabled).toEqual({});
    });
  });

  describe('configureAccessory', () => {
    test('should add the accessory to the accessories cache', () => {
      const accessory = {} as PlatformAccessory;
      platform.configureAccessory(accessory);
      expect(platform.accessories).toContain(accessory);
    });
  });

  describe('discoverDevices', () => {
    test('should log an error if there is an error connecting to the API', async () => {
      const logErrorSpy = jest.spyOn(platform.log, 'error');
      await platform.discoverDevices();

      expect(logErrorSpy).toHaveBeenCalledWith('Error connecting to API. No beds loaded.');
    });

    test('should ignore beds in the ignore list', async () => {
      const logInfoSpy = jest.spyOn(platform.log, 'info');
      const familyStatusSpy = jest.spyOn(platform.snapi, 'familyStatus');
      const bedSpy = jest.spyOn(platform.snapi, 'bed');
      platform.ignoreList = ['bed1'];

      when(familyStatusSpy).calledWith().mockResolvedValue([{ bedId: 'bed1' }]);
      when(bedSpy).calledWith().mockResolvedValue({
        beds: [
          { model: '', bedId: 'bed1', name: 'bed1' },
        ],
      });

      await platform.discoverDevices();

      expect(logInfoSpy).toHaveBeenCalledWith('Ignoring bed: bed1');
    });

    test('should create a new bed accessory if it does not exist', async () => {
      const familyStatusSpy = jest.spyOn(platform.snapi, 'familyStatus');
      const bedSpy = jest.spyOn(platform.snapi, 'bed');
      const platformAccessorySpy = jest.spyOn(platform.api, 'platformAccessory');
      const registerPlatformAccessoriesSpy = jest.spyOn(platform.api, 'registerPlatformAccessories');
      when(familyStatusSpy).calledWith().mockResolvedValue([{ bedId: 'bed1' }]);
      when(bedSpy).calledWith().mockResolvedValue({
        beds: [
          { model: '', bedId: 'bed1', name: 'bed1' },
        ],
      });
      when(platformAccessorySpy).calledWith('bed1', 'uuid').mockReturnValue({
        context: {},
        getService: service,
      });

      await platform.discoverDevices();

      expect(registerPlatformAccessoriesSpy).toHaveBeenCalled();
    });

    test('should restore existing bed from cache', async () => {
      const logInfoSpy = jest.spyOn(platform.log, 'info');
      const familyStatusSpy = jest.spyOn(platform.snapi, 'familyStatus');
      const bedSpy = jest.spyOn(platform.snapi, 'bed');
      const platformAccessorySpy = jest.spyOn(platform.api, 'platformAccessory');
      when(familyStatusSpy).calledWith().mockResolvedValue([{ bedId: 'bed1' }]);
      when(bedSpy).calledWith().mockResolvedValue({
        beds: [
          { model: '', bedId: 'bed1', name: 'bed1' },
        ],
      });
      when(platformAccessorySpy).calledWith('bed1', 'uuid').mockReturnValue({
        context: {},
        getService: service,
      });

      platform.configureAccessory(bed1Accessory);
      platform.ignoreList = [];

      await platform.discoverDevices();

      expect(logInfoSpy).toHaveBeenCalledWith('Restoring existing bed from cache:', 'bed1');
    });

    test('should update an existing bed accessory if the ignore list has changed', async () => {
      const familyStatusSpy = jest.spyOn(platform.snapi, 'familyStatus');
      const bedSpy = jest.spyOn(platform.snapi, 'bed');
      const platformAccessorySpy = jest.spyOn(platform.api, 'platformAccessory');
      const unregisterPlatformAccessoriesSpy = jest.spyOn(platform.api, 'unregisterPlatformAccessories');
      const registerPlatformAccessoriesSpy = jest.spyOn(platform.api, 'registerPlatformAccessories');
      when(familyStatusSpy).calledWith().mockResolvedValue([{ bedId: 'bed1' }]);
      when(bedSpy).calledWith().mockResolvedValue({
        beds: [
          { model: '', bedId: 'bed1', name: 'bed1' },
        ],
      });
      when(platformAccessorySpy).calledWith('bed1', 'uuid').mockReturnValue(bed1Accessory);

      bed1Accessory.context.ignoreList = ['bed2'];
      platform.configureAccessory(bed1Accessory);

      await platform.discoverDevices();

      expect(unregisterPlatformAccessoriesSpy).toHaveBeenCalledWith('homebridge-bed-control', 'BedControl', [bed1Accessory]);
      expect(registerPlatformAccessoriesSpy).toHaveBeenCalled();

      // Clean up
      bed1Accessory.context.ignoreList = [];
    });
  });

  describe('poll', () => {
    test('should update the privacy mode status for each bed', async () => {
      const logDebugSpy = jest.spyOn(platform.log, 'debug');
      const logWarnSpy = jest.spyOn(platform.log, 'warn');
      const familyStatusSpy = jest.spyOn(platform.snapi, 'familyStatus');
      const bedPauseModeSpy = jest.spyOn(platform.snapi, 'bedPauseMode');
      when(familyStatusSpy).calledWith().mockResolvedValue(familyBeds);
      when(bedPauseModeSpy).calledWith('bed1').mockResolvedValue(PauseMode_e.On);
      when(bedPauseModeSpy).calledWith('bed2').mockResolvedValue(PauseMode_e.On);

      platform.configureAccessory(bed1Accessory);
      platform.configureAccessory(bed2Accessory);

      platform.updateInterval = 1000;
      await platform.poll();
      jest.runOnlyPendingTimers();

      expect(logDebugSpy).toHaveBeenCalledWith('[Polling][bed1] Get Privacy Mode -> true');
      expect(logDebugSpy).toHaveBeenCalledWith('[Polling][bed2] Get Privacy Mode -> true');
      expect(logWarnSpy).toHaveBeenCalledWith(
        '[Polling] All beds have privacy mode enabled. Polling skipped to reduce unneccessary API requests.',
        'Updating privacy mode through the device application will not re-enable polling here until the privacy value is',
        'synced back to homekit by opening the Home app and viewing the privacy switch device. Modifying privacy state',
        'through homekit will immediately reflect here.',
      );
    });

    test('should log an error if failed to connect to the API', async () => {
      const logErrorSpy = jest.spyOn(platform.log, 'error');
      const familyStatusSpy = jest.spyOn(platform.snapi, 'familyStatus');
      const bedPauseModeSpy = jest.spyOn(platform.snapi, 'bedPauseMode');
      when(familyStatusSpy).calledWith()
        .mockResolvedValueOnce(familyBeds)
        .mockResolvedValue(undefined);
      when(bedPauseModeSpy).calledWith('bed1').mockResolvedValue(PauseMode_e.Off);
      when(bedPauseModeSpy).calledWith('bed2').mockResolvedValue(PauseMode_e.Off);

      platform.configureAccessory(bed1Accessory);
      platform.configureAccessory(bed2Accessory);

      platform.updateInterval = 1000;
      await platform.poll();
      await jest.runOnlyPendingTimersAsync();

      expect(logErrorSpy).toHaveBeenCalledWith('[Polling] Failed to connect to the API. Disabling polling function...');
    });

    test('should log a warning if no beds are found', async () => {
      const logWarnSpy = jest.spyOn(platform.log, 'warn');
      const familyStatusSpy = jest.spyOn(platform.snapi, 'familyStatus');
      when(familyStatusSpy).calledWith().mockResolvedValue(undefined);

      platform.updateInterval = 1000;
      await platform.poll();
      await jest.runOnlyPendingTimersAsync();

      expect(familyStatusSpy).toHaveBeenCalledTimes(1);
      expect(logWarnSpy).toHaveBeenCalledTimes(2);
      expect(logWarnSpy).toHaveBeenCalledWith('[Polling] No beds found');
      expect(logWarnSpy).toHaveBeenCalledWith(
        '[Polling] All beds have privacy mode enabled. Polling skipped to reduce unneccessary API requests.',
        'Updating privacy mode through the device application will not re-enable polling here until the privacy value is',
        'synced back to homekit by opening the Home app and viewing the privacy switch device. Modifying privacy state',
        'through homekit will immediately reflect here.',
      );
    });

    test('should handle polling data out of sync', async () => {
      const logDebugSpy = jest.spyOn(platform.log, 'debug');
      const logWarnSpy = jest.spyOn(platform.log, 'warn');
      const familyStatusSpy = jest.spyOn(platform.snapi, 'familyStatus');
      const bedPauseModeSpy = jest.spyOn(platform.snapi, 'bedPauseMode');
      const updateCharacteristicSpy = jest.spyOn(bed1Accessory.getService('Privacy Switch')!, 'updateCharacteristic');
      const bed1 = { ...familyBeds[0] };

      const setValueSpy = jest.spyOn(
        bed1Accessory
          .getService('')!
          .getCharacteristic(platform.Characteristic.OccupancyDetected)!,
        'setValue');
      when(familyStatusSpy).calledWith().mockResolvedValue([bed1]);
      when(bedPauseModeSpy).calledWith('bed1').mockResolvedValue(PauseMode_e.Off);
      bed1.leftSide['alertDetailedMessage'] = 'Data Out of Sync';
      bed1.rightSide['alertDetailedMessage'] = 'Data Out of Sync';

      platform.configureAccessory(bed1Accessory);

      platform.accessories[0].context.bedFeatures.leftSide.occupancySensor = true;
      platform.accessories[0].context.bedFeatures.rightSide.occupancySensor = true;

      platform.updateInterval = 1000;
      await platform.poll();
      await jest.runOnlyPendingTimersAsync();

      expect(familyStatusSpy).toHaveBeenCalledTimes(2);
      expect(bedPauseModeSpy).toHaveBeenCalledTimes(1);
      expect(updateCharacteristicSpy).toHaveBeenCalledTimes(0);
      expect(setValueSpy).toHaveBeenCalledTimes(2);
      expect(setValueSpy).toHaveBeenCalledWith(0);
      expect(setValueSpy).toHaveBeenCalledWith(0);
      expect(logDebugSpy).toHaveBeenCalledTimes(1);
      expect(logWarnSpy).toHaveBeenCalledTimes(2);
      expect(logWarnSpy).toHaveBeenCalledWith('[Polling][bed1][leftSide] Polling data out of sync. Devices not updated');
      expect(logWarnSpy).toHaveBeenCalledWith('[Polling][bed1][rightSide] Polling data out of sync. Devices not updated');
    });

    test('should update occupancy and number control characteristics', async () => {
      const logDebugSpy = jest.spyOn(platform.log, 'debug');
      const familyStatusSpy = jest.spyOn(platform.snapi, 'familyStatus');
      const bedPauseModeSpy = jest.spyOn(platform.snapi, 'bedPauseMode');

      const bed1 = { ...familyBeds[0] };
      bed1.leftSide['isInBed'] = true;
      bed1.leftSide['sleepNumber'] = 50;

      when(familyStatusSpy).calledWith().mockResolvedValue([bed1]);
      when(bedPauseModeSpy).calledWith('bed1').mockResolvedValue(PauseMode_e.Off);

      platform.configureAccessory(bed1Accessory);

      platform.accessories[0].context.bedFeatures.anySide.occupancySensor = true;
      platform.accessories[0].context.bedFeatures.leftSide.numberControl = true;

      platform.updateInterval = 1000;
      await platform.poll();
      await jest.runOnlyPendingTimersAsync();

      expect(familyStatusSpy).toHaveBeenCalledTimes(2);
      expect(bedPauseModeSpy).toHaveBeenCalledTimes(1);
      expect(logDebugSpy).toHaveBeenCalledTimes(3);
      expect(logDebugSpy).toHaveBeenCalledWith('[Polling][bed1] Get Privacy Mode -> false');
      expect(logDebugSpy).toHaveBeenCalledWith('[Polling][bed1][anySide] Get Occupancy -> true');
      expect(logDebugSpy).toHaveBeenCalledWith('[Polling][bed1][leftSide] Get Number -> 50');
    });

    test('should handle privacy mode enabled', async () => {
      const logDebugSpy = jest.spyOn(platform.log, 'debug');
      const familyStatusSpy = jest.spyOn(platform.snapi, 'familyStatus');
      const bedPauseModeSpy = jest.spyOn(platform.snapi, 'bedPauseMode');
      const updateCharacteristicSpy = jest.spyOn(bed1Accessory.getService('Privacy Switch')!, 'updateCharacteristic');

      when(familyStatusSpy).calledWith().mockResolvedValue(familyBeds);
      when(bedPauseModeSpy).calledWith('bed1').mockResolvedValue(PauseMode_e.On);
      when(bedPauseModeSpy).calledWith('bed2').mockResolvedValue(PauseMode_e.Off);

      platform.configureAccessory(bed1Accessory);
      platform.configureAccessory(bed2Accessory);

      platform.updateInterval = 1000;
      await platform.poll();
      await jest.runOnlyPendingTimersAsync();

      expect(familyStatusSpy).toHaveBeenCalledTimes(2);
      expect(bedPauseModeSpy).toHaveBeenCalledTimes(2);
      expect(updateCharacteristicSpy).toHaveBeenCalledTimes(0);
      expect(logDebugSpy).toHaveBeenCalledTimes(3);
      expect(logDebugSpy).toHaveBeenCalledWith('[Polling][bed1] Get Privacy Mode -> true');
      expect(logDebugSpy).toHaveBeenCalledWith('[Polling][bed2] Get Privacy Mode -> false');
      expect(logDebugSpy).toHaveBeenCalledWith('[Polling][bed1] Privacy mode enabled, skipping polling updates');
    });
  });
});
