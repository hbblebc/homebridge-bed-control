import { TargetHeaterCoolerState } from 'hap-nodejs/dist/lib/definitions';
import { PlatformAccessory, CharacteristicValue } from 'homebridge';

import { BedControlPlatform } from './platform';
import {
  Actuator_e,
  BedSide_e,
  BedSideKey_e,
  BedStatusData,
  FootwarmingStatusData,
  Footwarming_e,
  FoundationStatusData,
  Outlets_e,
  Outlet_Setting_e,
  PauseMode_e,
  ResponsiveAirStatusData,
  Services,
} from './snapi/interfaces';
import Snapi from './snapi/snapi';


export class BedAccessory {

  protected bedId: string;
  protected bedName: string;

  // used in batchRequests
  private _bed?: Promise<BedStatusData> = undefined;
  private _responsiveAir?: Promise<ResponsiveAirStatusData> = undefined;
  private _foundation?: Promise<FoundationStatusData> = undefined;
  private _footwarming?: Promise<FootwarmingStatusData> = undefined;

  private setSleepNumber: (...args: [string, BedSide_e, number]) => void;
  private adjustActuator: (...args: [string, BedSide_e, number, Actuator_e]) => void;

  public services: Services = {};

  constructor(
    private readonly platform: BedControlPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly snapi: Snapi,
  ) {
    this.bedId = accessory.context.bedStats.bedId;
    this.bedName = accessory.context.bedStats.name;
    this.setSleepNumber = this.debounce(this.snapi.sleepNumber, this.accessory.context.sendDelay);
    this.adjustActuator = this.debounce(this.snapi.adjust, this.accessory.context.sendDelay);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.accessory.context.bedFeatures.Manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.bedFeatures.Model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.bedFeatures.SerialNumber);


    // Set up each bed side
    [BedSideKey_e.LeftSide, BedSideKey_e.RightSide].forEach((side) => {
      this.services[side] = {};

      // Set up number control
      if (this.accessory.context.bedFeatures[side].numberControl) {
        this.services[side]!.numberControl = this.accessory.getService(`${side} Number Control`) ||
        this.accessory.addService(this.platform.Service.Lightbulb, `${side} Number Control`, this.bedId + `${side}NumberControl`);

        this.services[side]!.numberControl!.getCharacteristic(this.platform.Characteristic.On)
          .onSet(async () => null)
          .onGet(async () => true);
        this.services[side]!.numberControl!.getCharacteristic(this.platform.Characteristic.Brightness)
          .onSet((async (value: CharacteristicValue) => this.setNumber(side, value as number)).bind(this))
          .onGet((async () => this.getNumber(side)).bind(this))
          .setProps({ minStep: 5, minValue: 5, maxValue: 100 });
      }


      // Set up occupancy sensor
      if (this.accessory.context.bedFeatures[side].occupancySensor) {
        this.services[side]!.occupancySensor = this.accessory.getService(`${side} Occupancy Sensor`) ||
        this.accessory.addService(this.platform.Service.OccupancySensor, `${side} Occupancy Sensor`, this.bedId + `${side}OccupancySensor`);

        this.services[side]!.occupancySensor!.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
          .onGet((async () => this.getOccupancy(side)).bind(this));
      }


      // Set up foundation
      if (this.accessory.context.bedFeatures.foundation) {

        // Set up head and foot control
        [Actuator_e.Head, Actuator_e.Foot].forEach((actuator) => {
          const actuatorName = actuator === Actuator_e.Head ? 'headControl' : 'footControl';
          const actuatorNameCaps = actuator === Actuator_e.Head ? 'HeadControl' : 'FootControl';
          if (this.accessory.context.bedFeatures[side][actuatorName]) {
            this.services[side]![actuatorName] = this.accessory.getService(`${side} ${actuatorName}`) ||
            this.accessory.addService(this.platform.Service.Lightbulb, `${side} ${actuatorName}`, this.bedId + side + actuatorNameCaps);

            this.services[side]![actuatorName]!.getCharacteristic(this.platform.Characteristic.On)
              .onSet(async () => null)
              .onGet(async () => true);
            this.services[side]![actuatorName]!.getCharacteristic(this.platform.Characteristic.Brightness)
              .onSet((async (value: CharacteristicValue) => this.setActuatorPosition(side, actuator, value as number)).bind(this))
              .onGet((async () => this.getActuatorPosition(side, actuator)).bind(this));
          }
        });

        // Set up outlets and lights
        const outlets = (side === BedSideKey_e.LeftSide) ? {
          outlet: Outlets_e.LeftPlug,
          light: Outlets_e.LeftLight,
        } : {
          outlet: Outlets_e.RightPlug,
          light: Outlets_e.RightLight,
        };

        const outletNames = {
          outlet: 'Outlet',
          light: 'Light',
        };

        Object.entries(outlets).forEach(([outletKey, outlet]) => {
          if (this.accessory.context.bedFeatures[side][outletKey]) {
            // If foundation includes selected outlet
            this.services[side]![outletKey] =
              this.accessory.getService(`${side} ${outletNames[outletKey]} Control`) ||
              this.accessory.addService(
                this.platform.Service.Outlet,
                `${side} ${outletNames[outletKey]} Control`,
                this.bedId + `${side}${outletNames[outletKey]}Control`,
              );

            this.services[side]![outletKey]!.getCharacteristic(this.platform.Characteristic.On)
              .onSet((async (value: CharacteristicValue) => this.setOutlet(outlet, value as boolean)).bind(this))
              .onGet((async () => this.getOutlet(outlet)).bind(this));
          }
        });

        // Set up foot warming
        if (this.accessory.context.bedFeatures[side].footwarming) {
          this.services[side]!.footwarmingControl = this.accessory.getService(`${side} Foot Warming`) ||
          this.accessory.addService(this.platform.Service.HeaterCooler, `${side} Foot Warming`, this.bedId + `${side}FootwarmingControl`);

          this.services[side]!.footwarmingControl!.getCharacteristic(this.platform.Characteristic.Active)
            .onSet((async (value: CharacteristicValue) => this.setFootwarmingActive(side, value as number)).bind(this))
            .onGet((async () => this.getFootwarmingActive(side)).bind(this));
          this.services[side]!.footwarmingControl!.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
            .onGet((async () => this.getFootwarmingState(side)).bind(this));
          this.services[side]!.footwarmingControl!.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
            .onSet(async () => null)
            .onGet(async () => TargetHeaterCoolerState.HEAT);
          this.services[side]!.footwarmingControl!.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
            .onGet((async () => this.getFootwarmingTimeRemaining(side)).bind(this));
          this.services[side]!.footwarmingControl!.getCharacteristic(this.platform.Characteristic.RotationSpeed)
            .onSet((async (value: CharacteristicValue) => this.setFootwarmingValue(side, value as number)).bind(this))
            .onGet((async () => this.getFootwarmingValue(side)).bind(this))
            .setProps({ minStep: 1, minValue: 0, maxValue: 3});
        }

      }

      // Set up responsive air
      if (this.accessory.context.bedFeatures[side].responsiveAir) {
        this.services[side]!.responsiveAir = this.accessory.getService(`${side} Responsive Air`) ||
        this.accessory.addService(this.platform.Service.Switch, `${side} Responsive Air`, this.bedId + `${side}ResponsiveAir`);

        this.services[side]!.responsiveAir!.getCharacteristic(this.platform.Characteristic.On)
          .onSet((async (value: CharacteristicValue) => this.setResponsiveAir(side, value as boolean)).bind(this))
          .onGet((async () => this.getResponsiveAir(side)).bind(this));
      }
    });

    // Set up privacy switch
    if (this.accessory.context.bedFeatures.privacy) {
      this.services.privacySwitch = this.accessory.getService('Privacy Switch') ||
      this.accessory.addService(this.platform.Service.Switch, 'Privacy Switch', this.bedId + 'privacySwitch');

      this.services.privacySwitch.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setPrivacy.bind(this))
        .onGet(this.getPrivacy.bind(this));
    }

    // Set up "any side" sensors
    this.services.anySide = {};

    // Set up occupancy sensor
    if (this.accessory.context.bedFeatures.anySide.occupancySensor) {
      this.services.anySide.occupancySensor = this.accessory.getService('anySide Occupancy Sensor') ||
      this.accessory.addService(this.platform.Service.OccupancySensor, 'anySide Occupancy Sensor', this.bedId + 'anySideOccupancySensor');

      this.services.anySide.occupancySensor.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
        .onGet(this.getAnyOccupancy.bind(this));
    }


    // Set up outlets and lights
    const outlets = {
      outlet: 'Outlet',
      light: 'Light',
    };

    Object.entries(outlets).forEach(([outletKey, outlet]) => {
      if (this.accessory.context.bedFeatures.anySide[outletKey]) {
        // If foundation includes selected outlet
        this.services.anySide![outletKey] =
          this.accessory.getService(`anySide ${outlet} Control`) ||
          this.accessory.addService(
            this.platform.Service.Outlet,
            `anySide ${outlet} Control`,
            this.bedId + `anySide${outlet}Control`,
          );

        this.services.anySide![outletKey]!.getCharacteristic(this.platform.Characteristic.On)
          .onSet((async (value: CharacteristicValue) => this.setAnyOutlet(outletKey, value as boolean)).bind(this))
          .onGet((async () => this.getAnyOutlet(outletKey)).bind(this));
      }
    });
  }


  async setPrivacy(value: CharacteristicValue) {
    this.platform.log.debug(`[${this.bedName}] Set Privacy Mode -> ${value}`);
    this.snapi.setBedPauseMode(this.bedId, value ? PauseMode_e.On : PauseMode_e.Off);
  }


  async getPrivacy(): Promise<CharacteristicValue> {
    const pauseMode = await this.snapi.bedPauseMode(this.bedId);
    const isOn = (pauseMode === PauseMode_e.On);

    this.platform.log.debug(`[${this.bedName}] Get Privacy Mode -> ${isOn}`);
    return isOn;
  }


  async setNumber(side: BedSideKey_e, value: number) {
    this.platform.log.debug(`[${this.bedName}][${side}] Set Number -> ${value}`);
    this.setSleepNumber(this.bedId, BedSide_e[side], value);
  }


  async getNumber(side: BedSideKey_e): Promise<CharacteristicValue> {
    const data = await this.getBedStatus();
    const number = data[side].sleepNumber;
    this.platform.log.debug(`[${this.bedName}][${side}] Get Number -> ${number}`);
    return number;
  }


  async getOccupancy(side: BedSideKey_e): Promise<CharacteristicValue> {
    const data = await this.getBedStatus();
    const isInBed = data[side].isInBed ? 1 : 0;
    this.platform.log.debug(`[${this.bedName}][${side}] Get Occupancy -> ${isInBed}`);
    return isInBed;
  }


  async getAnyOccupancy(): Promise<CharacteristicValue> {
    const data = await this.getBedStatus();
    const isInBed = (data.leftSide.isInBed || data.rightSide.isInBed) ? 1 : 0;
    this.platform.log.debug(`[${this.bedName}][anySide] Get Occupancy -> ${isInBed}`);
    return isInBed;
  }


  async setResponsiveAir(side: BedSideKey_e, value: boolean) {
    this.platform.log.debug(`[${this.bedName}][${side}] Set Responsive Air -> ${value}`);
    this.snapi.responsiveAir(
      this.bedId,
      side === BedSideKey_e.LeftSide ? value : undefined,
      side === BedSideKey_e.RightSide ? value : undefined,
    );
  }


  async getResponsiveAir(side: BedSideKey_e): Promise<CharacteristicValue> {
    const data = await this.getResponsiveAirStatus();
    const responsiveAirStatus = (side === BedSideKey_e.LeftSide) ? data.leftSideEnabled : data.rightSideEnabled;
    this.platform.log.debug(`[${this.bedName}][${side}] Get Responsive Air -> ${responsiveAirStatus}`);
    return responsiveAirStatus;
  }


  async setActuatorPosition(side: BedSideKey_e, actuator: Actuator_e, value: number) {
    this.platform.log.debug(`[${this.bedName}][${side}][${actuator}] Set Position -> ${value}`);
    this.adjustActuator(this.bedId, BedSide_e[side], value, actuator);
  }


  async getActuatorPosition(side: BedSideKey_e, actuator: Actuator_e): Promise<CharacteristicValue> {
    const data = await this.getFoundationStatus();
    let actuatorPosition: number;
    switch (`${side}${actuator}`) {
      case `${BedSideKey_e.LeftSide}${Actuator_e.Head}` : actuatorPosition = +data.fsLeftHeadPosition; break;
      case `${BedSideKey_e.RightSide}${Actuator_e.Head}` : actuatorPosition = +data.fsRightHeadPosition; break;
      case `${BedSideKey_e.LeftSide}${Actuator_e.Foot}` : actuatorPosition = +data.fsLeftFootPosition; break;
      case `${BedSideKey_e.RightSide}${Actuator_e.Foot}` : actuatorPosition = +data.fsRightFootPosition; break;
    }
    this.platform.log.debug(`[${this.bedName}][${side}][${actuator}] Get Position -> ${actuatorPosition!}`);
    return actuatorPosition!;
  }


  async setOutlet(outlet: Outlets_e, value: boolean) {
    this.platform.log.debug(`[${this.bedName}][${Outlets_e[outlet]}] Set Outlet State -> ${value}`);
    this.snapi.outlet(this.bedId, outlet, value ? Outlet_Setting_e.On : Outlet_Setting_e.Off);
  }


  async getOutlet(outlet: Outlets_e): Promise<CharacteristicValue> {
    const data = await this.snapi.outletStatus(this.bedId, outlet);
    const outletStatus = data.setting;
    this.platform.log.debug(`[${this.bedName}][${Outlets_e[outlet]}] Get Outlet State -> ${outletStatus}`);
    return outletStatus;
  }


  async setAnyOutlet(outletKey: string, value: boolean) {
    const outlets = {
      leftSide: {
        outlet: Outlets_e.LeftPlug,
        light: Outlets_e.LeftLight,
      },
      rightSide: {
        outlet: Outlets_e.RightPlug,
        light: Outlets_e.RightLight,
      },
    };

    this.platform.log.debug(`[${this.bedName}][anySide] Set Outlet State -> ${value}`);
    [BedSideKey_e.LeftSide, BedSideKey_e.RightSide].forEach(side => {
      if (this.accessory.context.bedFeatures[side][outletKey]) {
        this.snapi.outlet(this.bedId, outlets[side][outletKey], value ? Outlet_Setting_e.On : Outlet_Setting_e.Off);
      }
    });
  }


  async getAnyOutlet(outletKey: string): Promise<CharacteristicValue> {
    const outlets = {
      leftSide: {
        outlet: Outlets_e.LeftPlug,
        light: Outlets_e.LeftLight,
      },
      rightSide: {
        outlet: Outlets_e.RightPlug,
        light: Outlets_e.RightLight,
      },
    };
    let leftStatus = Outlet_Setting_e.Off;
    let rightStatus = Outlet_Setting_e.Off;

    if (this.accessory.context.bedFeatures.leftSide[outletKey]) {
      leftStatus = (await this.snapi.outletStatus(this.bedId, outlets.leftSide[outletKey])).setting;
    }
    if (this.accessory.context.bedFeatures.rightSide[outletKey]) {
      rightStatus = (await this.snapi.outletStatus(this.bedId, outlets.rightSide[outletKey])).setting;
    }

    const outletStatus = leftStatus || rightStatus;
    this.platform.log.debug(`[${this.bedName}][anySide] Get Outlet State -> ${outletStatus}`);
    return outletStatus;
  }


  async setFootwarmingActive(side: BedSideKey_e, value: number) {
    return this.setFootwarming(side, value ? Footwarming_e.Low : Footwarming_e.Off);
  }


  async getFootwarmingActive(side: BedSideKey_e): Promise<CharacteristicValue> {
    const footwarmingStatus = await this.getFootwarming(side);
    return (footwarmingStatus !== Footwarming_e.Off) ? 1 : 0;
  }


  async getFootwarmingState(side: BedSideKey_e): Promise<CharacteristicValue> {
    const footwarmingStatus = await this.getFootwarming(side);
    return (footwarmingStatus !== Footwarming_e.Off) ? 2 : 0;
  }


  async getFootwarmingTimeRemaining(side: BedSideKey_e): Promise<CharacteristicValue> {
    const data = await this.getFootwarmingStatus();
    const footwarmingTimeRemaining = side === BedSideKey_e.LeftSide ? data.footWarmingTimerLeft : data.footWarmingTimerRight;
    this.platform.log.debug(`[${this.bedName}][${side}] Get Footwarming Timer Remaining -> ${footwarmingTimeRemaining}`);
    return Math.min(footwarmingTimeRemaining, 100);
  }


  async setFootwarmingValue(side: BedSideKey_e, value: number) {
    let temp = Footwarming_e.Off;
    switch(value) {
      case 1: temp = Footwarming_e.Low; break;
      case 2: temp = Footwarming_e.Med; break;
      case 3: temp = Footwarming_e.High; break;
      default: temp = Footwarming_e.Off; break;
    }
    return this.setFootwarming(side, temp);
  }


  async getFootwarmingValue(side: BedSideKey_e): Promise<CharacteristicValue> {
    const footwarmingStatus = await this.getFootwarming(side);
    let value = 0;
    switch(footwarmingStatus) {
      case Footwarming_e.Low: value = 1; break;
      case Footwarming_e.Med: value = 2; break;
      case Footwarming_e.High: value = 3; break;
      default: value = 0; break;
    }
    return value;
  }

  async setFootwarming(side: BedSideKey_e, value: Footwarming_e) {
    this.platform.log.debug(`[${this.bedName}][${side}] Set Footwarming -> ${Footwarming_e[value]}`);
    if (side === BedSideKey_e.LeftSide) {
      this.snapi.footwarming(this.bedId, value, undefined, 100, undefined);
    } else {
      this.snapi.footwarming(this.bedId, undefined, value, undefined, 100);
    }
  }


  async getFootwarming(side: BedSideKey_e): Promise<CharacteristicValue> {
    const data = await this.getFootwarmingStatus();
    const footwarmingStatus = side === BedSideKey_e.LeftSide ? data.footWarmingStatusLeft : data.footWarmingStatusRight;
    this.platform.log.debug(`[${this.bedName}][${side}] Get Footwarming State -> ${Footwarming_e[footwarmingStatus]}`);
    return footwarmingStatus;
  }


  getBedStatus() {
    return this.batchRequests<BedStatusData>('_bed', () => this.snapi.bedStatus(this.bedId));
  }

  getResponsiveAirStatus() {
    return this.batchRequests<ResponsiveAirStatusData>('_responsiveAir', () => this.snapi.responsiveAirStatus(this.bedId));
  }

  getFoundationStatus() {
    return this.batchRequests<FoundationStatusData>('_foundation', () => this.snapi.foundationStatus(this.bedId));
  }

  getFootwarmingStatus() {
    return this.batchRequests<FootwarmingStatusData>('_footwarming', () => this.snapi.footwarmingStatus(this.bedId));
  }

  batchRequests<T>(_p: string, func: () => Promise<T>): Promise<T> {
    if (this[_p] !== undefined) {
      return this[_p];
    }
    this[_p] = func();
    this[_p]!.then(() => {
      this[_p] = undefined;
    },
    () => {
      this[_p] = undefined;
    });
    return this[_p];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debounce(func: (...args: any[]) => any, timeout = 300): (...args: any[]) => void {
    let timer: NodeJS.Timeout;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this.snapi, args);
      }, timeout);
    };
  }
}