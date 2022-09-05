import { HeaterCooler, Lightbulb, OccupancySensor, Outlet, Switch } from "hap-nodejs/dist/lib/definitions"

// login types
export interface LoginData {
  userId: string,
  key: string,
  registrationState: number,
  edpLoginStatus: number,
  edpLoginMessage: string
}

// registration types
export interface RegistrationData {
  accountId: string,
  registrationState: string
}

// family status types
export interface BedSideState {
  isInBed: boolean,
  alertDetailedMessage: string,
  sleepNumber: number,
  alertId: number,
  lastLink: string,
  pressure: number
}

export interface BedState {
  status: number,
  bedId: string,
  leftSide: BedSideState,
  rightSide: BedSideState
}

export interface FamilyStatusData {
  beds: BedState[]
}

// sleeper types
export interface Sleeper {
  firstName: string,
  active: boolean,
  emailValidated: boolean,
  isChild: boolean,
  bedId: string,
  birthYear: string,
  zipCode: string,
  timezone: string,
  isMale: boolean,
  weight: number, // in lbs
  duration: any, // TODO: check type
  sleeperId: string,
  height: number, // in inches
  licenseVersion: number,
  username: string,
  birthMonth: number,
  sleepGoal: number, // in minutes
  isAccountOwner: boolean,
  accountId: string,
  email: string,
  avatar: string,
  lastLogin: string,
  side: number
} 

export interface SleeperData {
  sleepers: Sleeper[];
}

// bed types
export interface BedStats {
  registrationDate: string,
  sleeperRightId: string,
  base: any, // TODO: check type
  returnRequestStatus: number,
  size: string,
  name: string,
  serial: string,
  isKidsBed: boolean,
  dualSleep: boolean,
  bedId: string,
  status: number,
  sleeperLeftId: string,
  version: string,
  accountId: string,
  timezone: string,
  generation: string,
  model: string,
  purchaseDate: string,
  macAddress: string,
  sku: string,
  zipcode: string,
  reference: string
}

export interface BedData {
  beds: BedStats[]
}

// bed status types
export interface BedSideStatus {
  isInBed: boolean,
  alertDetailedMessage: string,
  sleepNumber: number,
  alertId: number,
  lastLink: string,
  pressure: number
}

export interface BedStatusData {
  status: number,
  leftSide: BedSideStatus,
  rightSide: BedSideStatus
}

// bed pause mode types
export enum PauseMode_e {
  Off = 'off',
  On = 'on',
}

export interface BedPauseModeData {
  accountId: string,
  bedId: string,
  pauseMode: PauseMode_e
}

// sleep number types
export enum BedSide_e {
  Left = 'L',
  Right = 'R',
  LeftSide = 'leftSide',
  RightSide = 'rightSide'
}

export interface SleepNumberData {}

// responsive air types
export interface ResponsiveAirStatusData {
  adjustmentThreshold: number,
  inBedTimeout: number,
  leftSideEnabled: boolean,
  outOfBedTimeout: number,
  pollFrequency: number,
  prefSyncState: string,
  rightSideEnabled: boolean
}

export interface ResponsiveAirData {}

// under bed light types
export interface UnderbedLightStatusData {
  enabledAuto: boolean,
  prefSyncState: string
}

export interface UnderbedLightData {}

// foot warming types
export enum Footwarming_e {
  Off = 0,
  Low = 31,
  Med = 57,
  High = 72
}

export interface FootwarmingStatusData {
  footWarmingStatusLeft: number,
  footWarmingStatusRight: number,
  footWarmingTimerLeft: number,
  footWarmingTimerRight: number
}

export interface FootwarmingData {}

// force idle types
export interface ForceIdleData {}

// pump status types
export interface PumpStatusData {
  activeTask: number,
  chamberType: number,
  leftSideSleepNumber: number,
  rightSideSleepNumber: number
}

// preset types
export enum Preset_e {
  Flat = 1,
  Zero_G = 2,
  Snore = 3,
  Partner_Snore = 4,
  Watch_TV = 5,
  Read = 6,
  Favorite = 128
}
export interface PresetData {}

// adjust types
export enum Actuator_e {
  Head = 'H',
  Foot = 'F'
}

export interface AdjustData {}

// foundation status types
export interface FoundationStatusData {
  fsCurrentPositionPresetRight: string,
  fsNeedsHoming: boolean,
  fsRightFootPosition: string,
  fsLeftPositionTimerLSB: string,
  fsTimerPositionPresetLeft: string,
  fsCurrentPositionPresetLeft: string,
  fsLeftPositionTimerMSB: string,
  fsRightFootActuatorMotorStatus: string,
  fsCurrentPositionPreset: string,
  fsTimerPositionPresetRight: string,
  fsType: string,
  fsOutletsOn: boolean,
  fsLeftHeadPosition: string,
  fsIsMoving: boolean,
  fsRightHeadActuatorMotorStatus: string,
  fsStatusSummary: string,
  fsTimerPositionPreset: string,
  fsLeftFootPosition: string,
  fsRightPositionTimerLSB: string,
  fsTimedOutletsOn: boolean,
  fsRightHeadPosition: string,
  fsConfigured: boolean,
  fsRightPositionTimerMSB: string,
  fsLeftHeadActuatorMotorStatus: string,
  fsLeftFootActuatorMotorStatus: string
}

// outlet status types
export enum Outlets_e {
  LeftPlug = 1,
  RightPlug = 2,
  LeftLight = 3,
  RightLight = 4
}

export enum Outlet_Setting_e {
  Off,
  On
}

export interface OutletStatusData {
  bedId: string,
  outlet: Outlets_e,
  setting: Outlet_Setting_e,
  timer: any , // TODO: check type
}

// motion types
export enum Motion_e {
  Off,
  On
}

export interface MotionData {}

// adjustment types
export enum Adjustment_e {
  Off,
  On
}

export interface AdjustmentData {}

// sleepData types
export interface Sessions {
  startDate: string,
  longest: boolean,
  sleepIQCalculating: boolean,
  originalStartDate: string,
  restful: number,
  originalEndDate: string,
  sleepNumber: number,
  totalSleepSessionTime: number,
  avgHeartRate: number,
  restless: number,
  avgRespirationRate: number,
  isFinalized: boolean,
  sleepQuotient: number,
  endDate: string,
  outOfBed: number,
  inBed: number
}

export interface SleepData {
  tip: string,
  message: string,
  data: string,
  sessions: Sessions[],
  goalEntry: any, // TODO: check type
  tags: any[] // TODO: check type
}

export interface SleepDataData {
  sleeperId: string,
  message: string,
  tip: string,
  avgHeartRate: number,
  avgRespirationRate: number,
  totalSleepSessionTime: number,
  inBed: number,
  outOfBed: number,
  restful: number,
  restless: number,
  avgSleepIQ: number,
  sleepData: SleepData[]
}

// sleepslicedata types
export interface SliceList {
  outOfBedTime: number,
  restfulTime: number,
  restlessTime: number,
  type: number
}

export interface DaySliceData {
  date: string,
  sliceList: SliceList[]
}

export interface SleeperSliceData {
  days: DaySliceData[],
  sleeperId: string,
  sliceSize: number
}
export interface SleepSliceDataData {
  sleepers: SleeperSliceData[]
}

// bedFeatures type
export interface SideFeatures {
  occupancy: boolean,
  numberControl: boolean,
  responsiveAir: boolean,
  headControl: boolean,
  footControl: boolean,
  outlet: boolean,
  light: boolean,
  footwarming: boolean
}

export interface BedFeatures {
  privacy: boolean,
  foundation: boolean,
  leftSide: SideFeatures,
  rightSide: SideFeatures,
  anySide: SideFeatures,
  Manufacturer: string,
  Model: string,
  SerialNumber: string
}

// services type
export interface SideServices {
  occupancySensor?: OccupancySensor,
  numberControl?: Lightbulb,
  responsiveAir?: Switch,
  headControl?: Lightbulb,
  footControl?: Lightbulb,
  leftSideOutlet?: Outlet,
  rightSideOutlet?: Outlet,
  leftSideLight?: Outlet,
  rightSideLight?: Outlet,
  footwarmingControl?: HeaterCooler
}

export interface Services {
  privacySwitch?: Switch,
  leftSide?: SideServices,
  rightSide?: SideServices
}