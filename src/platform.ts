import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ExamplePlatformAccessory } from './platformAccessory';
import Snapi from './snapi/snapi';
import { BedSideState, BedState, Outlets_e } from './snapi/interfaces';
import { PrivacySwitchAccessory } from './accessories/privacySwitchAccessory';
import { OccupancySensorAccessory } from './accessories/occupancySensorAccessory';

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
  public refreshTime: number;
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
    this.refreshTime = (config["refreshTime"] || 0) * 1000; // update values from the API every # seconds
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
      
      // Check if there is a foundation attached
      this.snapi.foundationStatus(bed.bedId);

      if (this.snapi.foundationData !== undefined) {
        // Check if the foundation has any outlets (1-2) or lights (3-4)
        [
          Outlets_e.Left_plug, 
          Outlets_e.Right_plug, 
          Outlets_e.Left_light, 
          Outlets_e.Right_light
        ].forEach((outlet) => {
          this.snapi.outletStatus(bed.bedId, outlet);

          if (this.snapi.outletData !== undefined) {
            // TODO: add outlet device
          }
        })
      }

      // Add privacy mode switch
      const privacyUuid = this.api.hap.uuid.generate(bed.bedId + 'privacy');
      const existingPrivacySwitch = this.accessories.find(a => a.UUID === privacyUuid);

      if (existingPrivacySwitch) {
        // the accessory already exists
        this.log.info('Restoring existing privacy switch from cache:', existingPrivacySwitch.displayName);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new PrivacySwitchAccessory(this, existingPrivacySwitch, this.snapi);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new privacy switch for bed:', bedStats!.name);

        // create a new accessory
        const privacySwitch = new this.api.platformAccessory(`${bedStats!.name} Privacy`, privacyUuid);

        // the `context` property can be used to store any data about the accessory you may need
        privacySwitch.context.name = bedStats!.name;
        privacySwitch.context.bedId = bedStats!.bedId;
        privacySwitch.context.Manufacturer = 'Sleep Number';
        privacySwitch.context.Model = bedStats!.model;
        privacySwitch.context.SerialNumber = bedStats!.bedId;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new PrivacySwitchAccessory(this, privacySwitch, this.snapi);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [privacySwitch]);

      }

      // Register occupancy sensors
      ['leftSide', 'rightSide'].forEach((sideName) => {
        const bedSide: BedSideState = bed[sideName];

        const bedSideUuid = this.api.hap.uuid.generate(bed.bedId + sideName);
        const existingBedSideOccupancy = this.accessories.find(a => a.UUID === bedSideUuid);

        if (existingBedSideOccupancy) {
          this.log.info('Restoring existing occupancy sensor from cache:', existingBedSideOccupancy.displayName);

          new OccupancySensorAccessory(this, existingBedSideOccupancy, this.snapi);
        } else {
          this.log.info(`Adding new occupancy sensor for bed: ${bedStats!.name}, side: ${sideName}`);

          const bedSideOccupancy = new this.api.platformAccessory(`${bedStats!.name} ${sideName} Occupancy`, bedSideUuid);

          bedSideOccupancy.context.name = bedStats!.name;
          bedSideOccupancy.context.bedId = bedStats!.bedId;
          bedSideOccupancy.context.side = sideName;
          bedSideOccupancy.context.updateInterval = this.refreshTime;
          bedSideOccupancy.context.Manufacturer = 'Sleep Number';
          bedSideOccupancy.context.Model = bedStats!.model;
          bedSideOccupancy.context.SerialNumber = bedStats!.bedId;

          new OccupancySensorAccessory(this, bedSideOccupancy, this.snapi);

          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [bedSideOccupancy]);
  
        }
      })
      
      
      // loop through each bed side
      Object.keys(sides).forEach( function (bedside, index) {
        try {
          let sideName = bedName+bedside
          let sideID = bedID+bedside

          // register side occupancy sensor
          if(!this.accessories.has(sideID+'occupancy')) {
            registerOccupancySensor(sideName, sideID);
          } else {
            this.log(sideName + " occupancy already added from cache");
          }
          
          // register side number control
          if (!this.accessories.has(sideID+'number')) {
            this.log("Found BedSide Number Control: ", sideName);
            
            let uuid = UUIDGen.generate(sideID+'number');
            let bedSideNum = new Accessory(sideName+'number', uuid);
            
            bedSideNum.context.side = bedside[0].toUpperCase();
            bedSideNum.context.sideID = sideID+'number';
            bedSideNum.context.sideName = sideName;
            bedSideNum.context.type = 'number';
            
            bedSideNum.addService(Service.Lightbulb, sideName+'Number');
            let numberService = bedSideNum.getService(Service.Lightbulb, sideName+'Number');
            numberService.addCharacteristic(Characteristic.Brightness);
            
            let bedSideNumAccessory = new snNumber(this.log, bedSideNum, this.snapi);
            bedSideNumAccessory.getServices();
            
            this.api.registerPlatformAccessories('homebridge-sleepiq', 'SleepIQ', [bedSideNum])
            this.accessories.set(sideID+'number', bedSideNumAccessory);
          } else {
            this.log(sideName + " number control already added from cache");
          }
          
          // check for foundation
          if (this.hasFoundation) {
            // register side foundation head and foot control units
            if (!this.accessories.has(sideID+'flex')) {
              this.log("Found BedSide Flex Foundation: ", sideName);
              
              let uuid = UUIDGen.generate(sideID+'flex');
              let bedSideFlex = new Accessory(sideName+'flex', uuid);
              
              bedSideFlex.context.side = bedside[0].toUpperCase();
              bedSideFlex.context.sideID = sideID+'flex';
              bedSideFlex.context.sideName = sideName;
              bedSideFlex.context.type = 'flex';
              
              bedSideFlex.addService(Service.Lightbulb, sideName+'FlexHead', 'head')
              .addCharacteristic(Characteristic.Brightness);
              bedSideFlex.addService(Service.Lightbulb, sideName+'FlexFoot', 'foot')
              .addCharacteristic(Characteristic.Brightness);
              
              let bedSideFlexAccessory = new snFlex(this.log, bedSideFlex, this.snapi);
              bedSideFlexAccessory.getServices();
              
              this.api.registerPlatformAccessories('homebridge-sleepiq', 'SleepIQ', [bedSideFlex])
              this.accessories.set(sideID+'flex', bedSideFlexAccessory)
            } else {
              this.log(sideName + " flex foundation already added from cache")
            }

            // register side outlet control
            if (this.hasOutlets) {
              if (!this.accessories.has(sideID+'outlet')) {
                // register outlet
                this.log("Found BedSide Outlet: ", sideName);
        
                let uuid = UUIDGen.generate(sideID+'outlet');
                let bedSideOutlet = new Accessory(sideName+'outlet', uuid);
                
                bedSideOutlet.context.side = bedside[0].toUpperCase();
                bedSideOutlet.context.sideID = sideID+'outlet';
                bedSideOutlet.context.sideName = sideName;
                bedSideOutlet.context.type = 'outlet';
                
                bedSideOutlet.addService(Service.Outlet, sideName+'Outlet')
                
                let bedSideOutletAccessory = new snOutlet(this.log, bedSideOutlet, this.snapi);
                bedSideOutletAccessory.getServices();
                
                this.api.registerPlatformAccessories('homebridge-sleepiq', 'SleepIQ', [bedSideOutlet])
                this.accessories.set(sideID+'outlet', bedSideOutletAccessory)
              } else {
                this.log(sideName + ' outlet already added from cache')
              }
            }

            // register side lightstrip control
            if (this.hasLightstrips) {
              if (!this.accessories.has(sideID+'lightstrip')) {
                // register lightstrip
                this.log("Found BedSide Lightstrip: ", sideName);
        
                let uuid = UUIDGen.generate(sideID+'lightstrip');
                let bedSideOutlet = new Accessory(sideName+'lightstrip', uuid);
                
                bedSideOutlet.context.side = bedside[0].toUpperCase();
                bedSideOutlet.context.sideID = sideID+'lightstrip';
                bedSideOutlet.context.sideName = sideName;
                bedSideOutlet.context.type = 'lightstrip';
                
                bedSideOutlet.addService(Service.Lightbulb, sideName+'Lightstrip')
                
                let bedSideOutletAccessory = new snLightStrip(this.log, bedSideOutlet, this.snapi);
                bedSideOutletAccessory.getServices();
                
                this.api.registerPlatformAccessories('homebridge-sleepiq', 'SleepIQ', [bedSideOutlet])
                this.accessories.set(sideID+'lightstrip', bedSideOutletAccessory)
              } else {
                this.log(sideName + ' lightstrip already added from cache')
              }
            }

            
          }
        } catch (err) {
          this.log('Error when setting up bedsides:',err);
        }
        
      }.bind(this))
      
      // add "anySide" occupancy sensor
      const anySideID = bedID + "anySide";
      const anySideName = bedName + "anySide";
      if(!this.accessories.has(anySideID+'occupancy')) {
        // register 'any' side occupancy sensor
        registerOccupancySensor(anySideName, anySideID);
      } else {
        this.log(anySideName + " occupancy already added from cache");
      }
    }.bind(this))
    
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
