import { HeaterCooler, Lightbulb, OccupancySensor, Outlet, Switch } from 'homebridge/node_modules/hap-nodejs/dist/lib/definitions';
import { BedSideKey_e, Outlets_e } from './snapi/interfaces';


export interface PrivacyMode {
  [bedId: string]: boolean;
}

export interface DelaySleepNumber {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [side: string]: () => any;
}

export interface DelayActuator {
  [side: string]: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [actuator: string]: () => any;
  };
}

export interface OutOfSyncMessages {
  [bedId: string]: {
    [side: string]: boolean;
  };
}

// bedFeatures type
export interface SideFeatures {
  occupancySensor: boolean;
  numberControl: boolean;
  responsiveAir: boolean;
  headControl: boolean;
  footControl: boolean;
  outlet: boolean;
  light: boolean;
  footwarming: boolean;
}

export interface BedFeatures {
  privacy: boolean;
  foundation: boolean;
  leftSide: SideFeatures;
  rightSide: SideFeatures;
  anySide: SideFeatures;
  Manufacturer: string;
  Model: string;
  SerialNumber: string;
}

// services type
export interface SideServices {
  occupancySensor?: OccupancySensor;
  numberControl?: Lightbulb;
  responsiveAir?: Switch;
  headControl?: Lightbulb;
  footControl?: Lightbulb;
  outlet?: Outlet;
  light?: Outlet;
  footwarmingControl?: HeaterCooler;
}

export interface Services {
  privacySwitch?: Switch;
  anySide?: SideServices;
  [BedSideKey_e.LeftSide]?: SideServices;
  [BedSideKey_e.RightSide]?: SideServices;
}

// Outlet types
export interface BedsideOutlets {
  outlet: Outlets_e.LeftPlug | Outlets_e.RightPlug;
  light: Outlets_e.LeftLight | Outlets_e.RightLight;
}

export interface BedOutlets {
  [BedSideKey_e.LeftSide]: BedsideOutlets;
  [BedSideKey_e.RightSide]: BedsideOutlets;
}

export interface OutletSetup {
  outletEnabled: boolean;
  outletService: Outlet | undefined;
  outletName: string;
  outletKey?: (keyof BedsideOutlets);
  outletValue?: Outlets_e;
}
