import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { BedControlPlatform } from '../platform';
import { PauseMode_e } from '../snapi/interfaces';
import Snapi from '../snapi/snapi';

export class PrivacySwitchAccessory {
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
    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.name);

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('get', this.handleOnGet.bind(this))
      .on('set', this.handleOnSet.bind(this));
  }

  async handleOnSet(value: CharacteristicValue) {
    // Send value to the API
    this.snapi.setBedPauseMode(this.accessory.context.bedId, value ? PauseMode_e.On : PauseMode_e.Off);

    this.platform.log.debug('Set Privacy Mode ->', value);
  }

  async handleOnGet(): Promise<CharacteristicValue> {
    // Check API for privacy state
    this.snapi.bedPauseMode(this.accessory.context.bedId);

    if (this.snapi.pauseMode?.bedId !== this.accessory.context.bedId) {
      // Bed ID doesn't match, throw error
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    } else {
      const isOn = (this.snapi.pauseMode!.pauseMode === PauseMode_e.On);
  
      this.platform.log.debug('Get Privacy Mode ->', isOn);
  
      return isOn;
    }
  }
}