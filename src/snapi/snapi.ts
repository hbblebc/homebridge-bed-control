/* eslint-disable no-console */
/*
 * To use, launch node in the same directory as this file, then create an
 * object with
 *| > snapi = require('./snapi.js')
 *| > api = new snapi('username','password')
 *
 * Each method includes a network request function and a convenience function
 * for extracting the relevant data. The network request functions include a
 * retry wrapper that will handle authenication when necessary.
 */

import { Logger } from 'homebridge';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import './string.extensions';
import {
  loginURL,
  registrationURL,
  familyStatusURL,
  sleeperURL,
  bedURL,
  bedStatusURL,
  bedPauseModeURL,
  sleepNumberURL,
  responsiveAirURL,
  forceIdleURL,
  pumpStatusURL,
  presetURL,
  adjustURL,
  foundationStatusURL,
  outletStatusURL,
  motionURL,
  underbedLightURL,
  footwarmingURL,
  adjustmentURL,
  sleepDataURL,
  sleepSliceDataURL,
} from './constants';
import {
  LoginData,
  RegistrationData,
  FamilyStatusData,
  SleeperData,
  BedData,
  BedStatusData,
  PauseMode_e,
  BedPauseModeData,
  BedSide_e,
  SleepNumberData,
  ResponsiveAirStatusData,
  ResponsiveAirData,
  UnderbedLightStatusData,
  UnderbedLightData,
  FootwarmingStatusData,
  FootwarmingData,
  ForceIdleData,
  PumpStatusData,
  Preset_e,
  PresetData,
  Actuator_e,
  AdjustData,
  FoundationStatusData,
  Outlets_e,
  Outlet_Setting_e,
  OutletStatusData,
  Motion_e,
  MotionData,
  Adjustment_e,
  AdjustmentData,
  SleepDataData,
  SleepSliceDataData,
} from './interfaces';

const jar = new CookieJar();
const client = wrapper(axios.create({ jar, withCredentials: true }));

class snapi {

  protected userId = '';
  protected bedID: string[] = [];
  private key = '';
  protected apiDisabled = false;

  // used in batchRequests
  private _login?: Promise<LoginData> = undefined;

  constructor(
    private readonly username: string,
    private readonly password: string,
    public readonly log?: Logger | Console,
  ) {
    if (log === undefined) {
      this.log = console;
    }
  }


  print_errors(e: Error | AxiosError, caller: string) {
    if (axios.isAxiosError(e)) {
      this.log!.debug(`[snapi][${caller}][API Error]`, e.response?.status, e.response?.statusText, e.response?.data);
    }
  }


  async retry<T>(caller: string, func: () => Promise<T>, count = 0): Promise<T | undefined> {
    if (this.apiDisabled || count === 2) {
      this.log!.debug('[snapi][retry] Reattempt limit reached.');
      return undefined;
    } else {
      try {
        return await func();
      } catch (_e) {
        const e: Error = _e as Error;
        this.print_errors(e, caller);
        if (axios.isAxiosError(e)) {
          if (e.response?.statusText === 'Unauthorized') {
            if (count === 0) {
              this.log!.debug('[snapi][retry] Login expired. Attempting re-authentication.');
              await this.batchLogin();
            }
            this.log!.debug('[snapi][retry] Reattempting failed request, attempt #:', count + 2);
            return await this.retry(caller, func, count + 1);
          } else if (e.response?.statusText === 'Not Found') {
            this.log!.debug('[snapi][retry] Function returned 404 from API.');
            throw e;
          }
        } else {
          this.print_errors(e, 'retry');
          this.log!.error('[snapi][retry] Disabling API. No further requests will be attempted');
          this.apiDisabled = true;
        }
      }
    }
  }


  async login(username: string = this.username, password: string = this.password): Promise<LoginData | undefined> {
    try {
      const res = await client.put<LoginData>(loginURL, {
        login: username,
        password: password,
      });
      const { data } = res;
      this.userId = data.userId;
      this.key = data.key;

      this.log!.debug('[snapi][login]', JSON.stringify(data, null, 2));

      return data;
    } catch (_e) {
      const e: Error = _e as Error;
      this.print_errors(e, 'login');
      this.log!.error('[snapi] Disabling API. No further requests will be attempted');
      this.apiDisabled = true;
    }
  }


  batchLogin() {
    return this.batchRequests<LoginData | undefined>('_login', () => this.login(this.username, this.password));
  }


  getRegistration() {
    return this.retry<AxiosResponse<RegistrationData>>('getRegistration', () => {
      return client.get<RegistrationData>(registrationURL, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async registration() {
    const res = await this.getRegistration();
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][registration]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  getFamilyStatus() {
    return this.retry<AxiosResponse<FamilyStatusData>>('getFamilyStatus', () => {
      return client.get<FamilyStatusData>(familyStatusURL, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async familyStatus() {
    const res = await this.getFamilyStatus();
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][familyStatus', JSON.stringify(data, null, 2));
      return data.beds;
    }
  }


  getSleeper() {
    return this.retry<AxiosResponse<SleeperData>>('getSleeper', () => {
      return client.get<SleeperData>(sleeperURL, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async sleeper() {
    const res = await this.getSleeper();
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][sleeper]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  getBed() {
    return this.retry<AxiosResponse<BedData>>('getBed()', () => {
      return client.get<BedData>(bedURL, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async bed() {
    const res = await this.getBed();
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][bed]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  getBedStatus(bedId: string) {
    return this.retry<AxiosResponse<BedStatusData>>('getBedStatus', () => {
      return client.get<BedStatusData>(bedStatusURL.format(bedId), {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async bedStatus(bedId: string) {
    const res = await this.getBedStatus(bedId);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][bedStatus]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  getBedPauseMode(bedId: string) {
    return this.retry<AxiosResponse<BedPauseModeData>>('getBedPauseMode', () => {
      return client.get<BedPauseModeData>(bedPauseModeURL.format(bedId), {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async bedPauseMode(bedId: string) {
    const res = await this.getBedPauseMode(bedId);
    if (res !== undefined) {
      const { data } = res;
      const pauseMode = data.pauseMode;

      this.log!.debug('[snapi][bedPauseMode]', JSON.stringify(data, null, 2));
      return pauseMode;
    }
  }


  putBedPauseMode(bedId: string, mode: PauseMode_e) {
    return this.retry<AxiosResponse<BedPauseModeData>>('putBedPauseMode', () => {
      return client.put<BedPauseModeData>(bedPauseModeURL.format(bedId), null, {
        params: {
          _k: this.key,
          mode: mode,
        },
      });
    });
  }


  async setBedPauseMode(bedId: string, mode: PauseMode_e) {
    const res = await this.putBedPauseMode(bedId, mode);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][setBedPauseMode]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  putSleepNumber(bedId: string, side: BedSide_e, num: number) {
    return this.retry<AxiosResponse<SleepNumberData>>('putSleepNumber', () => {
      return client.put<SleepNumberData>(sleepNumberURL.format(bedId), {
        side: side,
        sleepNumber: num,
      }, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async sleepNumber(bedId: string, side: BedSide_e, num: number) {
    num = Math.round(num);
    if (num < 5) {
      num = 5;
    }
    if (num > 100) {
      num = 100;
    }
    num = (num - (num % 5));

    const res = await this.putSleepNumber(bedId, side, num);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][sleepNumber]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  getResponsiveAirStatus(bedId: string) {
    return this.retry<AxiosResponse<ResponsiveAirStatusData>>('getResponsiveAirStatus', () => {
      return client.get<ResponsiveAirStatusData>(responsiveAirURL.format(bedId), {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async responsiveAirStatus(bedId: string) {
    const res = await this.getResponsiveAirStatus(bedId);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][responsiveAirStatus]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  putResponsiveAir(bedId: string, left?: boolean, right?: boolean) {
    return this.retry<AxiosResponse<ResponsiveAirData>>('putResponsiveAir', () => {
      return client.put<ResponsiveAirData>(responsiveAirURL.format(bedId), {
        leftSideEnabled: left,
        rightSideEnabled: right,
      }, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async responsiveAir(bedId: string, left?: boolean, right?: boolean) {
    const res = await this.putResponsiveAir(bedId, left, right);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][responsiveAir]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  putForceIdle(bedId: string) {
    return this.retry<AxiosResponse<ForceIdleData>>('putForceIdle', () => {
      return client.put<ForceIdleData>(forceIdleURL.format(bedId), null, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  // Forces the pump to stop if it is in the middle of an action
  async forceIdle(bedId: string) {
    const res = await this.putForceIdle(bedId);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][forceIdle]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  getPumpStatus(bedId: string) {
    return this.retry<AxiosResponse<PumpStatusData>>('getPumpStatus', () => {
      return client.get<PumpStatusData>(pumpStatusURL.format(bedId), {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async pumpStatus(bedId: string) {
    const res = await this.getPumpStatus(bedId);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][pumpStatus]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  putPreset(bedId: string, side: BedSide_e, preset: Preset_e) {
    return this.retry<AxiosResponse<PresetData>>('putPreset', () => {
      return client.put<PresetData>(presetURL.format(bedId), {
        speed: 0, // TODO: check this value
        side: side,
        preset: preset,
      }, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async preset(bedId: string, side: BedSide_e, preset: Preset_e) {
    const res = await this.putPreset(bedId, side, preset);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][preset]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  putAdjust(bedId: string, side: BedSide_e, position: number, actuator: Actuator_e) {
    return this.retry<AxiosResponse<AdjustData>>('putAdjust', () => {
      return client.put<AdjustData>(adjustURL.format(bedId), {
        speed: 0, // TODO: check this value
        side: side,
        position: position,
        actuator: actuator,
      }, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async adjust(bedId: string, side: BedSide_e, position: number, actuator: Actuator_e) {
    position = Math.round(position);
    if (position < 0) {
      position = 0;
    }
    if (position > 100) {
      position = 100;
    }

    const res = await this.putAdjust(bedId, side, position, actuator);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][adjust]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  getFoundationStatus(bedId: string) {
    return this.retry<AxiosResponse<FoundationStatusData>>('getFoundationStatus', () => {
      return client.get<FoundationStatusData>(foundationStatusURL.format(bedId), {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async foundationStatus(bedId: string) {
    const res = await this.getFoundationStatus(bedId);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][foundationStatus]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  getOutletStatus(bedId: string, outletId: Outlets_e) {
    return this.retry<AxiosResponse<OutletStatusData>>('getOutletStatus', () => {
      return client.get<OutletStatusData>(outletStatusURL.format(bedId), {
        params: {
          _k: this.key,
          outletId: outletId,
        },
      });
    });
  }


  async outletStatus(bedId: string, outletId: Outlets_e) {
    const res = await this.getOutletStatus(bedId, outletId);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][outletStatus]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  putOutlet(bedId: string, outletId: Outlets_e, setting: Outlet_Setting_e) {
    return this.retry<AxiosResponse<OutletStatusData>>('putOutlet', () => {
      return client.put<OutletStatusData>(outletStatusURL.format(bedId), {
        timer: 0,
        outletId: outletId,
        setting: setting,
      }, {
        params: {
          _k: this.key
        },
      });
    });
  }


  async outlet(bedId: string, outletId: Outlets_e, setting: Outlet_Setting_e) {
    const res = await this.putOutlet(bedId, outletId, setting);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][outlet]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  putMotion(bedId: string, side: BedSide_e, head: Motion_e, massage: Motion_e, foot: Motion_e) {
    return this.retry<AxiosResponse<MotionData>>('putMotion', () => {
      return client.put<MotionData>(motionURL.format(bedId), {
        side: side,
        headMotion: head,
        massageMotion: massage,
        footMotion: foot,
      }, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async motion(bedId: string, side: BedSide_e, head: Motion_e, massage: Motion_e, foot: Motion_e) {
    const res = await this.putMotion(bedId, side, head, massage, foot);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][motion]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  getUnderbedLightStatus(bedId: string) {
    return this.retry<AxiosResponse<UnderbedLightStatusData>>('getUnderbedLightStatus', () => {
      return client.get<UnderbedLightStatusData>(underbedLightURL.format(bedId), {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async underbedLightStatus(bedId: string) {
    const res = await this.getUnderbedLightStatus(bedId);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][underbedLightStatus]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  putUnderbedLight(bedId: string, enableAuto: boolean) {
    return this.retry<AxiosResponse<UnderbedLightData>>('putUnderbedLight', () => {
      return client.put<UnderbedLightData>(underbedLightURL.format(bedId), {
        enableAuto: enableAuto,
      }, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async underbedLight(bedId: string, enableAuto: boolean) {
    const res = await this.putUnderbedLight(bedId, enableAuto);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][underbedLight]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  getFootwarmingStatus(bedId: string) {
    return this.retry<AxiosResponse<FootwarmingStatusData>>('getFootwarmingStatus', () => {
      return client.get<FootwarmingStatusData>(footwarmingURL.format(bedId), {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async footwarmingStatus(bedId: string) {
    const res = await this.getFootwarmingStatus(bedId);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][footwarmingStatus]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  putFootwarming(bedId: string, left?: number, right?: number, timerLeft?: number, timerRight?: number) {
    if (timerLeft != undefined) {
      timerLeft = Math.round(timerLeft);
      if (timerLeft <= 0) {
        timerLeft = 1;
      }
      if (timerLeft >= 600) {
        timerLeft = 600;
      }
    }
    if (timerRight != undefined) {
      timerRight = Math.round(timerRight);
      if (timerRight <= 0) {
        timerRight = 1;
      }
      if (timerRight >= 600) {
        timerRight = 600;
      }
    }
    
    return this.retry<AxiosResponse<FootwarmingData>>('putFootwarming', () => {
      return client.put<FootwarmingData>(footwarmingURL.format(bedId), {
        footWarmingTempLeft: left,
        footWarmingTempRight: right,
        footWarmingTimerLeft: timerLeft,
        footWarmingTimerRight: timerRight,
      }, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async footwarming(bedId: string, left?: number, right?: number, timerLeft?: number, timerRight?: number) {
    const res = await this.putFootwarming(bedId, left, right, timerLeft, timerRight);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][footWarming]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  putAdjustment(bedId: string, side: BedSide_e, head: Adjustment_e, waveMode: Adjustment_e, foot: Adjustment_e, timer = 15) {
    return this.retry<AxiosResponse<AdjustmentData>>('putAdjustment', () => {
      return client.put<AdjustmentData>(adjustmentURL.format(bedId), {
        side: side,
        headMassageMotor: head,
        massageWaveMode: waveMode,
        footMassageMotor: foot,
        massageTimer: timer,
      }, {
        params: {
          _k: this.key,
        },
      });
    });
  }


  async adjustment(bedId: string, side: BedSide_e, head: Adjustment_e, waveMode: Adjustment_e, foot: Adjustment_e, timer = 15) {
    const res = await this.putAdjustment(bedId, side, head, waveMode, foot, timer);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][adjustment]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  getSleepData(data_date: string, interval: string, sleeper: string = this.userId) {
    return this.retry<AxiosResponse<SleepDataData>>('getSleepData', () => {
      return client.get<SleepDataData>(sleepDataURL, {
        params: {
          _k: this.key,
          date: data_date,
          interval: interval,
          sleeper: sleeper,
        },
      });
    });
  }


  async sleepData(data_date: string, interval: string, sleeper: string = this.userId) {
    // data_date format: 'YYYY-MM-DD'
    // interval format: 'D1' (1 day), 'M1' (1 month), etc.
    const res = await this.getSleepData(data_date, interval, sleeper);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][sleepData]', JSON.stringify(data, null, 2));
      return data;
    }
  }


  getSleepSliceData(data_date: string, sleeper: string = this.userId, format?: string) {
    return this.retry<AxiosResponse<SleepSliceDataData>>('getSleepSliceData', () => {
      return client.get<SleepSliceDataData>(sleepSliceDataURL, {
        params: {
          _k: this.key,
          date: data_date,
          sleeper: sleeper,
          format: format,
        },
      });
    });
  }


  async sleepSliceData(data_date: string, sleeper: string = this.userId, format?: string) {
    // data_date format: 'YYYY-MM-DD'
    // can optionally add a format:'csv' argument to get back a csv version of the data
    const res = await this.getSleepSliceData(data_date, sleeper, format);
    if (res !== undefined) {
      const { data } = res;

      this.log!.debug('[snapi][sleepSliceData]', JSON.stringify(data, null, 2));
      return data;
    }
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

}


export default snapi;