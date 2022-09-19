import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import Snapi from './snapi/snapi';
import { BedFeatures, BedSideKey_e, BedState, Outlets_e, PauseMode_e } from './snapi/interfaces';
import { BedAccessory } from './bedAccessory';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class BedControlPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  public disabled: boolean;
  public username: string;
  public password: string;
  public updateInterval: number;
  public sendDelay: number;
  public platform: string;
  public ignoreList: string[];
  public snapi: Snapi;

  public privacyModeEnabled = {};

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.disabled = false;
    this.username = config['email'];
    this.password = config['password'];
    this.updateInterval = (config['updateInterval'] || 0) * 1000; // update values from the API every # seconds
    this.sendDelay = (config['delay'] || 2) * 1000; // delay updating bed numbers by 2 seconds
    this.platform = config['bedPlatform'];
    this.ignoreList = config['ignore'] || [];

    // if (!this.username || !this.password) {
    //   this.log.warn("Ignoring BedControl setup because username or password was not provided.");
    //   this.disabled = true;
    //   return;
    // }

    this.snapi = new Snapi(this.username, this.password, this.log);

    this.log.debug('Finished initializing platform:', PLATFORM_NAME);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      await this.discoverDevices();
      this.poll();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices() {

    // Attempt to retrieve main dataset
    const beds = await this.snapi.familyStatus();
    const bedsStats = await this.snapi.bed();

    if (beds !== undefined && bedsStats !== undefined) {
      // Loop through each bed
      beds.forEach(async (bed: BedState) => {

        const bedStats = bedsStats.beds.find(b => b.bedId === bed.bedId)!;

        const bedFeatures: BedFeatures = {
          privacy: true,
          foundation: false,
          leftSide: {
            occupancySensor: true,
            numberControl: true,
            responsiveAir: true,
            headControl: false,
            footControl: false,
            outlet: false,
            light: false,
            footwarming: false,
          },
          rightSide: {
            occupancySensor: true,
            numberControl: true,
            responsiveAir: true,
            headControl: false,
            footControl: false,
            outlet: false,
            light: false,
            footwarming: false,
          },
          anySide: {
            occupancySensor: true,
            numberControl: false,
            responsiveAir: false,
            headControl: false,
            footControl: false,
            outlet: false,
            light: false,
            footwarming: false,
          },
          Manufacturer: 'Sleep Number',
          Model: bedStats.model,
          SerialNumber: bedStats.bedId,
        };

        // Set up the accessory
        const uuid = this.api.hap.uuid.generate(bed.bedId);
        let existingBed = this.accessories.find(a => a.UUID === uuid);

        // Check if bed is disabled
        if (this.ignoreList.includes(bed.bedId)) {
          this.log.info(`Ignoring bed: ${bed.bedId}`);
          return;
        }

        const bedIgnoreList = this.ignoreList.filter(s => s.split('.')[0] === bed.bedId);

        // Add entry in privacyModeEnabled
        this.privacyModeEnabled[bed.bedId] = false;

        // Re-set up bed if ignoreList for bed changed
        if (existingBed) {
          if (JSON.stringify(existingBed.context.ignoreList) !== JSON.stringify(bedIgnoreList)) {
            this.log.info(`Ignore list for bed ${bedStats.name} changed. Reloading device`);
            this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingBed]);
            existingBed = undefined;
          }
        }

        if (existingBed) {
          // the bed already exists
          this.log.info('Restoring existing bed from cache:', existingBed.displayName);

          if (existingBed.context.updateInterval !== this.updateInterval ||
          existingBed.context.sendDelay !== this.sendDelay) {
            // Update with new values for updateInterval and sendDelay
            existingBed.context.updateInterval = this.updateInterval;
            existingBed.context.sendDelay = this.sendDelay;

            this.api.updatePlatformAccessories([existingBed]);
          }

          //create the accessory handler for the restored bed
          new BedAccessory(this, existingBed, this.snapi);
        } else {
          // the bed doesn't exist yet, so we need to create it
          this.log.info('Adding new bed:', bedStats.name);


          // Check if there is a foundation attached and update available devices
          try {
            await this.snapi.foundationStatus(bed.bedId);
            this.log.info(`[${bedStats.name}] Foundation detected`);
            bedFeatures.foundation = true,

            // Check if the foundation has head or foot control
            // TODO: add support for flexfit and flexfit 3 bases
            // TODO: add support for integrated base
            bedFeatures.leftSide.headControl = true;
            bedFeatures.rightSide.headControl = true;
            bedFeatures.leftSide.footControl = true;
            bedFeatures.rightSide.footControl = true;

            // Check if the foundation has any outlets (1-2) or lights (3-4)
            try {
              await this.snapi.outletStatus(bed.bedId, Outlets_e.LeftPlug);
              this.log.info(`[${bedStats.name}] Outlet 1 (Left Plug) detected`);
              bedFeatures.leftSide.outlet = true;
            } catch(e) {
              this.log.info(`[${bedStats.name}] Outlet 1 (Left Plug) not detected`);
            }

            try {
              await this.snapi.outletStatus(bed.bedId, Outlets_e.RightPlug);
              this.log.info(`[${bedStats.name}] Outlet 2 (Right Plug) detected`);
              bedFeatures.rightSide.outlet = true;
            } catch(e) {
              this.log.info(`[${bedStats.name}] Outlet 2 (Right Plug) not detected`);
            }

            try {
              await this.snapi.outletStatus(bed.bedId, Outlets_e.LeftLight);
              this.log.info(`[${bedStats.name}] Outlet 3 (Left Light) detected`);
              bedFeatures.leftSide.light = true;
            } catch(e) {
              this.log.info(`[${bedStats.name}] Outlet 3 (Left Light) not detected`);
            }

            try {
              await this.snapi.outletStatus(bed.bedId, Outlets_e.RightLight);
              this.log.info(`[${bedStats.name}] Outlet 4 (Right Light) detected`);
              bedFeatures.rightSide.light = true;
            } catch(e) {
              this.log.info(`[${bedStats.name}] Outlet 4 (Right Light) not detected`);
            }

            // Control both lights or outlets - covers case of a single light as well
            bedFeatures.anySide.outlet = bedFeatures.leftSide.outlet || bedFeatures.rightSide.outlet;
            bedFeatures.anySide.light = bedFeatures.leftSide.light || bedFeatures.rightSide.light;

            try {
              await this.snapi.footwarmingStatus(bed.bedId);
              this.log.info(`[${bedStats.name}] Footwarming detected`);
              bedFeatures.leftSide.footwarming = true;
              bedFeatures.rightSide.footwarming = true;
            } catch(e) {
              this.log.info(`[${bedStats.name}] Footwarming not detected`);
            }
          } catch(e) {
            this.log.info(`[${bedStats.name}] Foundation not detected`);
          }

          bedIgnoreList.forEach(ignoreString => {
            const ignoreVals = ignoreString.split('.');
            if (ignoreVals.length === 2) {
              if (['leftSide', 'rightSide', 'anySide'].includes(ignoreVals[1])) {
                this.log.info(`Ignoring bed ${bedStats.name} ${ignoreVals[1]}`);
                Object.keys(bedFeatures[ignoreVals[1]]).forEach(feature => {
                  bedFeatures[ignoreVals[1]][feature] = false;
                });
              } else if (['privacy', 'foundation'].includes(ignoreVals[1])) {
                this.log.info(`Ignoring bed ${bedStats.name} ${ignoreVals[1]}`);
                bedFeatures[ignoreVals[1]] = false;
              } else {
                this.log.error(`Unknown ignore list value: ${ignoreString}`);
              }
            } else if (ignoreVals.length === 3) {
              if (
                ['leftSide', 'rightSide', 'anySide'].includes(ignoreVals[1]) &&
                [
                  'occupancySensor',
                  'numberControl',
                  'responsiveAir',
                  'headControl',
                  'footControl',
                  'outlet',
                  'light',
                  'footwarming',
                ].includes(ignoreVals[2])
              ) {
                this.log.info(`Ignoring bed ${bedStats.name} ${ignoreVals[1]} ${ignoreVals[2]}`);
                bedFeatures[ignoreVals[1]][ignoreVals[2]] = false;
              } else {
                this.log.error(`Unknown ignore list value: ${ignoreString}`);
              }
            } else {
              this.log.error(`Unknown ignore list value: ${ignoreString}`);
            }
          });


          // create a new bed accessory
          const bedAccessory = new this.api.platformAccessory(bedStats.name, uuid);

          // store a copy of the bed features in the accessory context
          bedAccessory.context.bedFeatures = bedFeatures;
          bedAccessory.context.bedStats = bedStats;
          bedAccessory.context.updateInterval = this.updateInterval;
          bedAccessory.context.sendDelay = this.sendDelay;
          bedAccessory.context.ignoreList = bedIgnoreList;

          // create the accessory handler for the new bed accessory
          new BedAccessory(this, bedAccessory, this.snapi);

          // link the accessory to the platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [bedAccessory]);
        }

      });
    } else {
      this.log.error('Error connecting to API. No beds loaded.');
    }
  }


  async poll() {
    // Set initial privacy status
    const beds = await this.snapi.familyStatus();
    if (beds !== undefined) {
      beds.forEach(async bed => {
        const pauseMode = await this.snapi.bedPauseMode(bed.bedId) === PauseMode_e.On;
        this.privacyModeEnabled[bed.bedId] = pauseMode;

        const bedAccessory = this.accessories.find(a => a.context.bedStats.bedId === bed.bedId);
        if (bedAccessory !== undefined) {
          bedAccessory.getService('Privacy Switch')?.updateCharacteristic(this.Characteristic.On, pauseMode);
          this.log.debug(`[Polling][${bedAccessory.context.bedStats.name}] Get Privacy Mode -> ${pauseMode}`);
        }
      });
    } else {
      this.log.warn('[Polling] No beds found');
    }

    // Start polling routine
    if (this.updateInterval > 0) {
      let disabledMessage = false;

      const pollInterval = setInterval(async () => {
        // Check if all beds have privacy mode enabled
        const allBedsPrivate = Object.values(this.privacyModeEnabled).reduce((prev, cur) => prev && cur, true);

        if (!allBedsPrivate) {
          if (disabledMessage) {
            disabledMessage = false;
          }

          const beds = await this.snapi.familyStatus();
          if (beds !== undefined) {
            beds.forEach(bed => {
              const bedAccessory = this.accessories.find(a => a.context.bedStats.bedId === bed.bedId);
              if (bedAccessory) {
                const name = bedAccessory.context.bedStats.name;

                if (!this.privacyModeEnabled[bed.bedId]) {
                  [BedSideKey_e.LeftSide, BedSideKey_e.RightSide].forEach(side => {
                    if (bed[side].alertDetailedMessage === 'Data Out of Sync') {
                      this.log.warn(`[Polling][${name}][${side}] Polling data out of sync. Devices not updated`);
                      return;
                    } else {
                      if (bedAccessory.context.bedFeatures[side].occupancySensor) {
                        this.log.debug(`[Polling][${name}][${side}] Get Occupancy -> ${bed[side].isInBed}`);
                        bedAccessory.getService(`${side} Occupancy Sensor`)!
                          .updateCharacteristic(this.Characteristic.OccupancyDetected, bed[side].isInBed);
                      }

                      if (bedAccessory.context.bedFeatures[side].numberControl) {
                        this.log.debug(`[Polling][${name}][${side}] Get Number -> ${bed[side].sleepNumber}`);
                        bedAccessory.getService(`${side} Number Control`)!
                          .updateCharacteristic(this.Characteristic.Brightness, bed[side].sleepNumber);
                      }
                    }
                  });
                  if (bedAccessory.context.bedFeatures.anySide.occupancySensor) {
                    if (bed.leftSide.alertDetailedMessage !== 'Data Out of Sync' &&
                        bed.rightSide.alertDetailedMessage !== 'Data Out of Sync') {
                      this.log.debug(`[Polling][${name}][anySide] Get Occupancy -> ${bed.leftSide.isInBed || bed.rightSide.isInBed}`);
                      bedAccessory.getService('anySide Occupancy Sensor')!
                        .updateCharacteristic(this.Characteristic.OccupancyDetected, bed.leftSide.isInBed || bed.rightSide.isInBed);
                    } else {
                      this.log.warn(`[Polling][${name}][anySide] Polling data out of sync. Devices not updated`);
                    }
                  }
                } else {
                  this.log.debug(`[Polling][${name}] Privacy mode enabled, skipping polling updates`);
                }
              }
            });
          } else {
            this.log.error('[Polling] Failed to connect to the API. Disabling polling function...');
            clearInterval(pollInterval);
          }
        } else {
          if (!disabledMessage) {
            this.log.warn('[Polling] All beds have privacy mode enabled. Polling skipped to reduce unneccessary API requests.',
              'Updating privacy mode through the device application will not re-enable polling here until the privacy value is',
              'synced back to homekit by opening the Home app and viewing the privacy switch device. Modifying privacy state',
              'through homekit will immediately reflect here.');
            disabledMessage = true;
          }
        }
      }, this.updateInterval);
    }
  }

}
