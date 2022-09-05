import { AxiosResponse } from 'axios';
import { Brightness, OccupancySensor, On, Switch, TargetHeaterCoolerState } from 'hap-nodejs/dist/lib/definitions';
import { PlatformAccessory, CharacteristicValue } from 'homebridge';

import { BedControlPlatform } from './platform';
import { Actuator_e, BedSide_e, BedStatusData, FamilyStatusData, FootwarmingStatusData, Footwarming_e, FoundationStatusData, Outlets_e, Outlet_Setting_e, PauseMode_e, ResponsiveAirStatusData, Services } from './snapi/interfaces';
import Snapi from './snapi/snapi';


export class BedAccessory {

  protected bedId: string;
  protected bedName: string;
  private _p?: Promise<any> = undefined;
  private setSleepNumber: (...args: any[]) => void;
  private adjustActuator: (...args: any[]) => void;

  public services: Services = {};

  constructor(
    private readonly platform: BedControlPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly snapi: Snapi
  ) {
    this.bedId = accessory.context.bedStats.bedId;
    this.bedName = accessory.context.bedStats.name;
    this.setSleepNumber = this.debounce(this.snapi.sleepNumber, this.accessory.context.sendDelay);
    this.adjustActuator = this.debounce(this.snapi.adjust, this.accessory.context.sendDelay);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
    .setCharacteristic(this.platform.Characteristic.Manufacturer, this.accessory.context.bedFeatures.Manufacturer)
    .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.bedFeatures.Model)
    .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.bedFeatures.SerialNumber);

    // Set up privacy switch
    this.services.privacySwitch = this.accessory.getService('Privacy Switch') ||
    this.accessory.addService(this.platform.Service.Switch, 'Privacy Switch', this.bedId + 'privacySwitch');

    this.services.privacySwitch.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setPrivacy.bind(this))
      .onGet(this.getPrivacy.bind(this));


    // Set up each bed side
    [BedSide_e.LeftSide, BedSide_e.RightSide].forEach((side) => {

      // Set up occupancy sensor
      this.services[side].occupancySensor = this.accessory.getService(`${side} Occupancy Sensor`) ||
      this.accessory.addService(this.platform.Service.OccupancySensor, `${side} Occupancy Sensor`, this.bedId + 'occupancySensor')

      this.services[side].occupancySensor.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .onGet((async () => this.getOccupancy(side)).bind(this));

      // Set up number control
      this.services[side].numberControl = this.accessory.getService(`${side} Number Control`) ||
      this.accessory.addService(this.platform.Service.Lightbulb, `${side} Number Control`, this.bedId + 'numberControl')

      this.services[side].numberControl.getCharacteristic(this.platform.Characteristic.On)
      .onSet(async () => null)
      .onGet(async () => true);
      this.services[side].numberControl.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet((async (value: CharacteristicValue) => this.setNumber(side, value as number)).bind(this))
      .onGet((async () => this.getNumber(side)).bind(this));

      // Set up responsive air switch
      this.services[side].responsiveAirSwitch = this.accessory.getService(`${side} Responsive Air Switch`) ||
      this.accessory.addService(this.platform.Service.Switch, `${side} Responsive Air Switch`, this.bedId + 'responsiveAirSwitch');

      this.services[side].responsiveAirSwitch.getCharacteristic(this.platform.Characteristic.On)
        .onSet((async (value: CharacteristicValue) => this.setResponsiveAir(side, value as boolean)).bind(this))
        .onGet((async () => this.getResponsiveAir(side)).bind(this));

      // Set up foundation
      if (this.accessory.context.bedFeatures.foundation) {

        // Set up head and foot control
        [Actuator_e.Head, Actuator_e.Foot].forEach((actuator) => {
          const actuatorName = actuator === Actuator_e.Head ? 'headControl' : 'footControl';
          if (this.accessory.context.bedFeatures[side][actuatorName]) {
            this.services[side][actuatorName] = this.accessory.getService(`${side} ${actuatorName}`) ||
            this.accessory.addService(this.platform.Service.Lightbulb, `${side} ${actuatorName}`, this.bedId + actuatorName);
    
            this.services[side][actuatorName].getCharacteristic(this.platform.Characteristic.On)
            .onSet(async () => null)
            .onGet(async () => true);
            this.services[side][actuatorName].getCharacteristic(this.platform.Characteristic.Brightness)
            .onSet((async (value: CharacteristicValue) => this.setActuatorPosition(side, actuator, value as number)).bind(this))
            .onGet((async () => this.getActuatorPosition(side, actuator)).bind(this));
          }
        })

        // Set up outlets and lights
        [Outlets_e.LeftPlug, Outlets_e.RightPlug, Outlets_e.LeftLight, Outlets_e.RightLight].forEach((outlet: Outlets_e) => {
          const outletSide = [Outlets_e.LeftPlug, Outlets_e.LeftLight].includes(outlet) ? BedSide_e.LeftSide : BedSide_e.RightSide;
          const outletType = [Outlets_e.LeftPlug, Outlets_e.RightPlug].includes(outlet) ? 'outlet' : 'light';
          const outletTypeCaps = [Outlets_e.LeftPlug, Outlets_e.RightPlug].includes(outlet) ? 'Outlet' : 'Light';
          if (this.accessory.context.bedFeatures[outletSide][outletType] && outletSide === side) {
            // If foundation includes selected outlet
            this.services[side]![`${outletSide}${outletTypeCaps}`] = this.accessory.getService(`${outletSide} ${outletTypeCaps} Control`) ||
            this.accessory.addService(this.platform.Service.Outlet, `${outletSide} ${outletTypeCaps} Control`, this.bedId + `${outletSide}${outletTypeCaps}Control`);

            this.services[side]![`${outletSide}${outletTypeCaps}`]!.getCharacteristic(this.platform.Characteristic.On)
            .onSet((async (value: CharacteristicValue) => this.setOutlet(outlet, value as boolean)).bind(this))
            .onGet((async () => this.getOutlet(outlet)).bind(this));
          }
        })

        // Set up foot warming
        if (this.accessory.context.bedFeatures[side].footwarming) {
          this.services[side].footwarmingControl = this.accessory.getService(`${side} Foot Warming`) || 
          this.accessory.addService(this.platform.Service.HeaterCooler, `${side} Foot Warming`, this.bedId + 'footwarmingControl')

          this.services[side].footwarmingControl.getCharacteristic(this.platform.Characteristic.Active)
          .onSet((async (value: CharacteristicValue) => this.setFootwarmingActive(side, value as number)).bind(this))
          .onGet((async () => this.getFootwarmingActive(side)).bind(this));
          this.services[side].footwarmingControl.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
          .onGet((async () => this.getFootwarmingState(side)).bind(this));
          this.services[side].footwarmingControl.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
          .onSet(async () => null)
          .onGet(async () => TargetHeaterCoolerState.HEAT);
          this.services[side].footwarmingControl.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
          .onGet((async () => this.getFootwarmingTimeRemaining(side)).bind(this));
          this.services[side].footwarmingControl.getCharacteristic(this.platform.Characteristic.RotationSpeed)
          .onSet((async (value: CharacteristicValue) => this.setFootwarmingValue(side, value as number)).bind(this))
          .onGet((async () => this.getFootwarmingValue(side)).bind(this))
          .setProps({ minStep: 1, minValue: 0, maxValue: 3});
        }

      }
    })
  }


  async setPrivacy(value: CharacteristicValue) {
    this.platform.log.debug(`[${this.bedName}] Set Privacy Mode -> ${value}`);
    this.snapi.setBedPauseMode(this.bedId, value ? PauseMode_e.On : PauseMode_e.Off);
  }


  async getPrivacy(): Promise<CharacteristicValue> {
    return this.snapi.getBedPauseMode(this.bedId)
    .then(res => {
      const { data } = res;
      const isOn = (data.pauseMode === PauseMode_e.On);

      this.platform.log.debug(`[${this.bedName}] Get Privacy Mode -> ${isOn}`);
      return isOn;
    })
  }


  async setNumber(side: BedSide_e, value: number) {
    this.platform.log.debug(`[${this.bedName}][${side}] Set Number -> ${value}`);
    this.setSleepNumber(this.bedId, side === BedSide_e.LeftSide ? BedSide_e.Left : BedSide_e.Right, value);
  }


  async getNumber(side: BedSide_e): Promise<CharacteristicValue> {
    return this.getBedStatus().then(res => {
      const { data } = res;
      const number = data[side].sleepNumber;
      this.platform.log.debug(`[${this.bedName}][${side}] Get Number -> ${number}`);
      return number;
    })
  }


  async getOccupancy(side: BedSide_e): Promise<CharacteristicValue> {
    return this.getBedStatus().then(res => {
      const { data } = res;
      const isInBed = data[side].isInBed ? 1 : 0;
      this.platform.log.debug(`[${this.bedName}][${side}] Get Occupancy -> ${isInBed}`);
      return isInBed;
    })
  }


  async setResponsiveAir(side: BedSide_e, value: boolean) {
    this.platform.log.debug(`[${this.bedName}][${side}] Set Responsive Air -> ${value}`);
    this.snapi.responsiveAir(this.bedId, side === BedSide_e.LeftSide ? value : undefined, side === BedSide_e.RightSide ? value : undefined);
  }


  async getResponsiveAir(side: BedSide_e): Promise<CharacteristicValue> {
    return this.getResponsiveAirStatus().then(res => {
      const { data } = res;
      const responsiveAirStatus = side === BedSide_e.LeftSide ? data.leftSideEnabled : data.rightSideEnabled;
      this.platform.log.debug(`[${this.bedName}][${side}] Get Responsive Air -> ${responsiveAirStatus}`);
      return responsiveAirStatus;
    })
  }


  async setActuatorPosition(side: BedSide_e, actuator: Actuator_e, value: number) {
    this.platform.log.debug(`[${this.bedName}][${side}][${actuator}] Set Position -> ${value}`);
    this.adjustActuator(this.bedId, side === BedSide_e.LeftSide ? BedSide_e.Left : BedSide_e.Right, value, actuator);
  }


  async getActuatorPosition(side: BedSide_e, actuator: Actuator_e): Promise<CharacteristicValue> {
    return this.getFoundationStatus().then(res => {
      const { data } = res;
      let actuatorPosition: number;
      switch (`${side}${actuator}`) {
        case `${BedSide_e.LeftSide}${Actuator_e.Head}` : actuatorPosition = +data.fsLeftHeadPosition; break;
        case `${BedSide_e.RightSide}${Actuator_e.Head}` : actuatorPosition = +data.fsRightHeadPosition; break;
        case `${BedSide_e.LeftSide}${Actuator_e.Foot}` : actuatorPosition = +data.fsLeftFootPosition; break;
        case `${BedSide_e.RightSide}${Actuator_e.Foot}` : actuatorPosition = +data.fsRightFootPosition; break;
      }
      this.platform.log.debug(`[${this.bedName}][${side}][${actuator}] Get Position -> ${actuatorPosition!}`);
      return actuatorPosition!;
    })
  }

  
  async setOutlet(outlet: Outlets_e, value: boolean) {
    this.platform.log.debug(`[${this.bedName}][${Outlets_e[outlet]}] Set Outlet State -> ${value}`);
    this.snapi.outlet(this.bedId, outlet, value ? Outlet_Setting_e.On : Outlet_Setting_e.Off);
  }


  async getOutlet(outlet: Outlets_e): Promise<CharacteristicValue> {
    return this.snapi.getOutletStatus(this.bedId, outlet).then(res => {
      const { data } = res;
      const outletStatus = data.setting;
      this.platform.log.debug(`[${this.bedName}][${Outlets_e[outlet]}] Get Outlet State -> ${outletStatus}`);
      return outletStatus;
    })
  }


  async setFootwarmingActive(side: BedSide_e, value: number) {
    return this.setFootwarming(side, value ? Footwarming_e.Low : Footwarming_e.Off);
  }


  async getFootwarmingActive(side: BedSide_e): Promise<CharacteristicValue> {
    return this.getFootwarming(side).then(footwarmingStatus => {
      return footwarmingStatus !== Footwarming_e.Off ? 1 : 0;
    })
  }


  async getFootwarmingState(side: BedSide_e): Promise<CharacteristicValue> {
    return this.getFootwarming(side).then(footwarmingStatus => {
      return footwarmingStatus !== Footwarming_e.Off ? 2 : 0;
    })
  }


  async getFootwarmingTimeRemaining(side: BedSide_e): Promise<CharacteristicValue> {
    return this.getFootwarmingStatus().then(res => {
      const { data } = res;
      const footwarmingTimeRemaining = side === BedSide_e.LeftSide ? data.footWarmingTimerLeft : data.footWarmingTimerRight;
      this.platform.log.debug(`[${this.bedName}][${side}] Get Footwarming Timer Remaining -> ${footwarmingTimeRemaining}`);
      return Math.min(footwarmingTimeRemaining, 100);
    })
  }


  async setFootwarmingValue(side: BedSide_e, value: number) {
    let temp = Footwarming_e.Off;
    switch(value) {
      case 1: temp = Footwarming_e.Low; break;
      case 2: temp = Footwarming_e.Med; break;
      case 3: temp = Footwarming_e.High; break;
      default: temp = Footwarming_e.Off; break;
    }
    return this.setFootwarming(side, temp);
  }


  async getFootwarmingValue(side: BedSide_e): Promise<CharacteristicValue> {
    return this.getFootwarming(side).then(footwarmingStatus => {
      let value = 0;
      switch(footwarmingStatus) {
        case Footwarming_e.Low: value = 1; break;
        case Footwarming_e.Med: value = 2; break;
        case Footwarming_e.High: value = 3; break;
        default: value = 0; break;
      }
      return value;
    })
  }

  async setFootwarming(side: BedSide_e, value: Footwarming_e) {
    this.platform.log.debug(`[${this.bedName}][${side}] Set Footwarming -> ${Footwarming_e[value]}`);
    if (side === BedSide_e.LeftSide) {
      this.snapi.footWarming(this.bedId, value, undefined, 120, undefined);
    } else {
      this.snapi.footWarming(this.bedId, undefined, value, undefined, 120);
    }
  }


  async getFootwarming(side: BedSide_e): Promise<CharacteristicValue> {
    return this.getFootwarmingStatus().then(res => {
      const { data } = res;
      const footwarmingStatus = side === BedSide_e.LeftSide ? data.footWarmingStatusLeft : data.footWarmingStatusRight;
      this.platform.log.debug(`[${this.bedName}][${side}] Get Footwarming State -> ${Footwarming_e[footwarmingStatus]}`)
      return footwarmingStatus;
    })
  }


  getBedStatus() {
    return this.batchRequests<AxiosResponse<BedStatusData, any>>(() => this.snapi.getBedStatus(this.bedId));
  }

  getResponsiveAirStatus() {
    return this.batchRequests<AxiosResponse<ResponsiveAirStatusData, any>>(() => this.snapi.getResponsiveAirStatus(this.bedId));
  }

  getFoundationStatus() {
    return this.batchRequests<AxiosResponse<FoundationStatusData, any>>(() => this.snapi.getFoundationStatus(this.bedId));
  }

  getFootwarmingStatus() {
    return this.batchRequests<AxiosResponse<FootwarmingStatusData, any>>(() => this.snapi.getFootwarmingStatus(this.bedId));
  }

  batchRequests<T>(func: (...args: any[]) => Promise<T>): Promise<T> {
    if (this._p !== undefined) return this._p;
    this._p = func();
    this._p!.then(() => { this._p = undefined;},
                 () => { this._p = undefined;});
    return this._p;  
  }

  debounce(func: (...args: any[]) => any, timeout = 300): (...args: any[]) => void {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }
}