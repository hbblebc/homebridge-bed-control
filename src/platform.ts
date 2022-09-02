import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ExamplePlatformAccessory } from './platformAccessory';
import snapi from './snapi';

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

  public disabled: Boolean;
  public username: String;
  public password: String;
  public refreshTime: Number;
  public sendDelay: Number;
  public snapi: snapi;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.disabled = false;
    this.username = config["email"];
    this.password = config["password"];
    this.refreshTime = (config["refreshTime"] || 60) * 1000; // update values from the API every 60 seconds
    this.sendDelay = (config["sendDelay"] || 2) * 1000; // delay updating bed numbers by 2 seconds

    if (!this.username || !this.password) {
      log.warn("Ignoring BedControl setup because username or password was not provided.");
      this.disabled = true;
      return;
    }

    this.snapi = new snapi(this.username, this.password);


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
    await this.authenticate();
    if (!this.snapi.key) {
      this.disabled = true;
      return;
    }

    // Attempt to retrieve main dataset
    try {
      await this.snapi.familyStatus( (data, err=null) => {
        if (err) {
          this.log.debug(data, err);
        } else {
          this.log.debug("Family Status GET results:", data);
        }
      });
    } catch(err) {
      if (typeof err === 'string')
        err = JSON.parse(err)
      if (!(err.statusCode === 401) && !(err.statusCode === 50002)) {
        this.log.error("Failed to retrieve family status:",JSON.stringify(err));
      }
    }

    // Loop through each bed
    this.snapi.json.beds.forEach( async function (bed, index) {
      let bedName = "bed" + index
      let bedID = bed.bedId
      let sides = JSON.parse(JSON.stringify(bed))
      delete sides.status
      delete sides.bedId
      
      // Check if there is a foundation attached
      try {
        await this.snapi.foundationStatus((async (data, err=null) => {
          if (err) {
            this.log.debug(data, err);
          } else {
            this.log.debug("foundationStatus result:", data);
            let foundationStatus = JSON.parse(data);
            if(foundationStatus.hasOwnProperty('Error')) {
              if (foundationStatus.Error.Code === 404) {
                this.log("No foundation detected");
              } else {
                this.log("Unknown error occurred when checking the foundation status. See previous output for more details. If it persists, please report this incident at https://github.com/DeeeeLAN/homebridge-sleepiq/issues/new");
              }
            } else {
              this.hasFoundation = true;

              // check if the foundation has outlets
              try {
                await this.snapi.outletStatus('1', ((data, err=null) => {
                  if (err) {
                    this.log.debug(data, err);
                  } else {
                    this.log.debug("outletStatus result:", data);
                    let outletStatus = JSON.parse(data);
                    if(outletStatus.hasOwnProperty('Error')) {
                      if (outletStatus.Error.Code === 404) {
                        this.log("No outlet detected");
                      } else {
                        this.log("Unknown error occurred when checking the outlet status. See previous output for more details. If it persists, please report this incident at https://github.com/DeeeeLAN/homebridge-sleepiq/issues/new");
                      }
                    } else {
                      this.hasOutlets = true
                    }
                  }
                }).bind(this));
              } catch(err) {
                if (typeof err === 'string' || err instanceof String)
                  err = JSON.parse(err)
                if (!(err.statusCode === 404)) {
                  this.log("Failed to retrieve outlet status:", JSON.stringify(err));
                }
              }

              // check if the foundation has lightstrips
              try {
                await this.snapi.outletStatus('3', ((data, err=null) => {
                  if (err) {
                    this.log.debug(data, err);
                  } else {
                    this.log.debug("outletStatus result:", data);
                    let outletStatus = JSON.parse(data);
                    if(outletStatus.hasOwnProperty('Error')) {
                      if (outletStatus.Error.Code === 404) {
                        this.log("No lightstrip detected");
                      } else {
                        this.log("Unknown error occurred when checking the lightstrip status. See previous output for more details. If it persists, please report this incident at https://github.com/DeeeeLAN/homebridge-sleepiq/issues/new");
                      }
                    } else {
                      this.hasLightstrips = true
                    }
                  }
                }).bind(this));
              } catch(err) {
                if (typeof err === 'string' || err instanceof String)
                  err = JSON.parse(err)
                if (!(err.statusCode === 404)) {
                  this.log("Failed to retrieve lightstrip status:", JSON.stringify(err));
                }
              }

            }
          }
        }).bind(this));
      } catch(err) {
        if (typeof err === 'string' || err instanceof String)
          err = JSON.parse(err)
        if (!(err.statusCode === 404)) {
          this.log("Failed to retrieve foundation status:", JSON.stringify(err));
        }
      }
      
      // Check if bed has privacy mode
      if(!this.accessories.has(bedID+'privacy')) {
        this.log("Found Bed Privacy Switch: ", bedName);
        
        let uuid = UUIDGen.generate(bedID+'privacy');
        let bedPrivacy = new Accessory(bedName+'privacy', uuid);
        
        bedPrivacy.context.sideID = bedID+'privacy';
        bedPrivacy.context.type = 'privacy';
        
        bedPrivacy.addService(Service.Switch, bedName+'Privacy');
        
        let bedPrivacyAccessory = new snPrivacy(this.log, bedPrivacy, this.snapi);
        bedPrivacyAccessory.getServices();
        
        this.api.registerPlatformAccessories('homebridge-sleepiq', 'SleepIQ', [bedPrivacy]);
        this.accessories.set(bedID+'privacy', bedPrivacyAccessory);
      } else {
        this.log(bedName + " privacy already added from cache");
      }
      
      // function to register an occupancy sensor
      const registerOccupancySensor = (sideName, sideID) => {
        this.log("Found BedSide Occupancy Sensor: ", sideName);
        
        let uuid = UUIDGen.generate(sideID+'occupancy');
        let bedSideOcc = new Accessory(sideName+'occupancy', uuid);
        
        bedSideOcc.context.sideID = sideID+'occupancy';
        bedSideOcc.context.type = 'occupancy';
        
        bedSideOcc.addService(Service.OccupancySensor, sideName+'Occupancy');
        
        let bedSideOccAccessory = new snOccupancy(this.log, bedSideOcc);
        bedSideOccAccessory.getServices();
        
        this.api.registerPlatformAccessories('homebridge-sleepiq', 'SleepIQ', [bedSideOcc]);
        this.accessories.set(sideID+'occupancy', bedSideOccAccessory);
      }
      
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
    
  async authenticate () {
    try {
      this.log.debug('SleepIQ Authenticating...')
      await this.snapi.login((data, err=null) => {
        if (err) {
          this.log.debug(data, err);
        } else {
          this.log.debug("Login result:", data);
        }
      });
    } catch(err) {
      this.log.info("Failed to authenticate with SleepIQ. Please double-check your username and password. Disabling SleepIQ plugin. Error:",err.error);
      this.disabled = true;
    }
  }
}
