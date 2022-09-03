import { AxiosResponse } from 'axios';
import { Brightness } from 'hap-nodejs/dist/lib/definitions';
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { BedControlPlatform } from './platform';
import { BedSide_e, BedStatusData, FamilyStatusData, PauseMode_e } from './snapi/interfaces';
import Snapi from './snapi/snapi';


export class BedAccessory {

  protected bedId: string;
  protected bedName: string;
  private _p?: Promise<any> = undefined;

  constructor(
    private readonly platform: BedControlPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly snapi: Snapi
  ) {
    this.bedId = accessory.context.bedStats.bedId;
    this.bedName = accessory.context.bedStats.name;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
    .setCharacteristic(this.platform.Characteristic.Manufacturer, this.accessory.context.bedFeatures.Manufacturer)
    .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.bedFeatures.Model)
    .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.bedFeatures.SerialNumber);

    // Set up privacy switch
    const privacySwitch = this.accessory.getService('Privacy Switch') ||
    this.accessory.addService(this.platform.Service.Switch, 'Privacy Switch', this.bedId + 'privacySwitch');

    privacySwitch.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setPrivacy.bind(this))
      .onGet(this.getPrivacy.bind(this));


    // Set up each bed side
    ['leftSide', 'rightSide'].forEach((side) => {

      // Set up occupancy sensor
      const occupancySensor = this.accessory.getService(`${side} Occupancy Sensor`) ||
      this.accessory.addService(this.platform.Service.OccupancySensor, `${side} Occupancy Sensor`, this.bedId + 'occupancySensor')

      occupancySensor.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .onGet(((side: string) => this.getOccupancy(side)).bind(this));

      // Set up number control
      const numberControl = this.accessory.getService(`${side} Number Control`) ||
      this.accessory.addService(this.platform.Service.Lightbulb, `${side} Number Control`, this.bedId + 'numberControl')

      numberControl.getCharacteristic(this.platform.Characteristic.On)
      .onSet(async () => null)
      .onGet(async () => true);
      numberControl.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet((async (value) => this.setNumber(side, value)).bind(this))
      .onGet((async () => this.getNumber(side)).bind(this));

    })
  }


  async setPrivacy(value: CharacteristicValue) {
    this.platform.log.debug(`[${this.bedName}] Set Privacy Mode -> ${value}`);
    this.snapi.setBedPauseMode(this.bedId, value ? PauseMode_e.On : PauseMode_e.Off);
  }


  async getPrivacy(): Promise<CharacteristicValue> {
    const isOnPromise = this.snapi.getBedPauseMode(this.bedId)
    .then(res => {
      const { data } = res;
      const isOn = (data.pauseMode === PauseMode_e.On);

      this.platform.log.debug(`[${this.bedName}] Get Privacy Mode -> ${isOn}`);
      return isOn;
    })

    return isOnPromise;
  }


  async setNumber(side: string, value: number) {
    this.platform.log.debug(`[${this.bedName}][${side}] Set Number -> ${value}`);
    this.snapi.sleepNumber(this.bedId, side === 'leftSide' ? BedSide_e.Left : BedSide_e.Right, value);
  }


  async getNumber(side: string): Promise<CharacteristicValue> {
    const numberPromise = this.getBedStatus().then(res => {
      const { data } = res;
      const number = data[side].sleepNumber;
      this.platform.log.debug(`[${this.bedName}][${side}] Get Number -> ${number}`);
      return number;
    })

    return numberPromise;
  }


  async getOccupancy(side: string): Promise<CharacteristicValue> {
    const isInBedPromise = this.getBedStatus().then(res => {
      const { data } = res;
      const isInBed = data[side].isInBed ? 1 : 0;
      this.platform.log.debug(`[${this.bedName}][${side}] Get Occupancy -> ${isInBed}`);
      return isInBed;
    })

    return isInBedPromise;
  }


  getBedStatus() {
    return this.batchRequests<AxiosResponse<BedStatusData, any>>(this.snapi.getBedStatus);
  }

  batchRequests<T>(func: (...args: any[]) => Promise<T>): Promise<T> {
    if (this._p !== undefined) return this._p;
    this._p = func();
    this._p!.then(() => { this._p = undefined;},
                 () => { this._p = undefined;});
    return this._p;  
  }

  debounce(func: (...args: any[]) => any, timeout = 300): any {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }
}