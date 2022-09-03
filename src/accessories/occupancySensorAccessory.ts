import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { BedControlPlatform } from '../platform';
import { BedSide_e, PauseMode_e } from '../snapi/interfaces';
import Snapi from '../snapi/snapi';

export class OccupancySensorAccessory {
  private service: Service;

  constructor(
    private readonly platform: BedControlPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly snapi: Snapi,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.accessory.context.Manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.Model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.SerialNumber);

    // Grab the switch service if it exists, otherwise create a new one
    this.service = this.accessory.getService(this.platform.Service.OccupancySensor) || this.accessory.addService(this.platform.Service.OccupancySensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.name);

    // register handlers for the Occupancy Detected Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .on('get', this.handleOnGet.bind(this))

    // Update on the interval selected in the configuration settings if enabled
    if (this.accessory.context.updateInterval > 0) { 
      setInterval(async () => {
        const isInBed = await this.handleOnGet();
        this.service.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, isInBed);
        this.platform.log.debug('Triggering occupancy detected:', isInBed);
      }, this.accessory.context.updateInterval)
    }
  }

  async handleOnGet(): Promise<CharacteristicValue> {
    // Check API for occupancy state
    this.snapi.bedStatus(this.accessory.context.bedId);

    if (this.snapi.bedStatusData!.bedId !== this.accessory.context.bedId) {
      // Bed ID doesn't match, throw error
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    } else {
      const isInBed = this.snapi.bedStatusData!.bedStatusData[this.accessory.context.side === BedSide_e.Left ? 'leftSide' : 'rightSide'].isInBed ? 1 : 0;

      this.platform.log.debug(`Get ${this.accessory.context.name} ${this.accessory.context.side} Occupancy ->`, isInBed);
  
      return isInBed;
    }
  }
}