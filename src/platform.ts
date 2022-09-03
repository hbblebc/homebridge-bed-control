import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ExamplePlatformAccessory } from './platformAccessory';
import Snapi from './snapi/snapi';
import { BedFeatures, BedSideState, BedState, Outlets_e } from './snapi/interfaces';
import { PrivacySwitchAccessory } from './accessories/privacySwitchAccessory';
import { OccupancySensorAccessory } from './accessories/occupancySensorAccessory';
import { ConfigureBridgedAccessory } from 'hap-nodejs/dist/lib/definitions';
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
  public snapi: Snapi;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.disabled = false;
    this.username = config["email"];
    this.password = config["password"];
    this.updateInterval = (config["updateInterval"] || 0) * 1000; // update values from the API every # seconds
    this.sendDelay = (config["sendDelay"] || 2) * 1000; // delay updating bed numbers by 2 seconds

    // if (!this.username || !this.password) {
    //   this.log.warn("Ignoring BedControl setup because username or password was not provided.");
    //   this.disabled = true;
    //   return;
    // }

    this.snapi = new Snapi(this.username, this.password, this.log);


    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
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
    this.snapi.familyStatus();
    this.snapi.bed();


    // Loop through each bed
    this.snapi.beds.forEach((bed: BedState, bedIdx: number) => {

      const bedStats = this.snapi.bedsStats.find(b => b.bedId === bed.bedId)

      const bedFeatures: BedFeatures = {
        privacy: true,
        foundation: false,
        leftSide: {
          occupancy: true,
          numberControl: true,
          responsiveAir: true,
          headControl: false,
          footControl: false,
          outlet: false,
          light: false,
          footwarming: false
        }, 
        rightSide: {
          occupancy: true,
          numberControl: true,
          responsiveAir: true,
          headControl: false,
          footControl: false,
          outlet: false,
          light: false,
          footwarming: false
        },
        anySide: {
          occupancy: true,
          numberControl: false,
          responsiveAir: false,
          headControl: false,
          footControl: false,
          outlet: false,
          light: false,
          footwarming: false
        },
        Manufacturer: 'Sleep Number',
        Model: bedStats!.model,
        SerialNumber: bedStats!.bedId,
      }
      
      // Check if there is a foundation attached
      this.snapi.foundationStatus(bed.bedId);

      if (this.snapi.foundationData !== undefined) {
        bedFeatures.foundation = true,

        // Check if the foundation has head or foot control
        // TODO: add support for flexfit and flexfit 3 bases
        // TODO: add support for integrated base
        bedFeatures.leftSide.headControl = true;
        bedFeatures.rightSide.headControl = true;
        bedFeatures.leftSide.footControl = true;
        bedFeatures.rightSide.footControl = true;

        // Check if the foundation has any outlets (1-2) or lights (3-4)
        this.snapi.outletStatus(bed.bedId, Outlets_e.Left_plug);
        if (this.snapi.outletData !== undefined) {
          bedFeatures.leftSide.outlet = true;
        }

        this.snapi.outletStatus(bed.bedId, Outlets_e.Right_plug);
        if (this.snapi.outletData !== undefined) {
          bedFeatures.rightSide.outlet = true;
        }

        this.snapi.outletStatus(bed.bedId, Outlets_e.Left_light);
        if (this.snapi.outletData !== undefined) {
          bedFeatures.leftSide.light = true;
        }

        this.snapi.outletStatus(bed.bedId, Outlets_e.Right_light);
        if (this.snapi.outletData !== undefined) {
          bedFeatures.rightSide.outlet = true;
        }

        // Control both lights or outlets - covers case of a single light as well
        bedFeatures.anySide.outlet = bedFeatures.leftSide.outlet || bedFeatures.rightSide.outlet;
        bedFeatures.anySide.light = bedFeatures.leftSide.light || bedFeatures.rightSide.light;

        this.snapi.footwarmingStatus(bed.bedId);
        if (this.snapi.footwarmingData !== undefined) {
          bedFeatures.leftSide.footwarming = true;
          bedFeatures.rightSide.footwarming = true;
        }
      }

      // Set up the accessory
      const uuid = this.api.hap.uuid.generate(bed.bedId);
      const existingBed = this.accessories.find(a => a.UUID === uuid);

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
        this.log.info('Adding new bed:', bedStats!.name);

        // create a new bed accessory
        const bedAccessory = new this.api.platformAccessory(bedStats!.name, uuid);

        // store a copy of the bed features in the accessory context
        bedAccessory.context.bedFeatures = bedFeatures;
        bedAccessory.context.bedStats = bedStats!;
        bedAccessory.context.updateInterval = this.updateInterval;
        bedAccessory.context.sendDelay = this.sendDelay;

        // create the accessory handler for the new bed accessory
        new BedAccessory(this, bedAccessory, this.snapi);

        // link the accessory to the platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [bedAccessory]);
      }
      
    })
  }
    
  authenticate () {
    try {
      this.log.debug('SleepIQ Authenticating...')
      this.snapi.login(this.username, this.password);
    } catch(err) {
      this.log.info("Failed to authenticate with SleepIQ. Please double-check your username and password. Disabling SleepIQ plugin. Error:",err.error);
      this.disabled = true;
    }
  }
}
