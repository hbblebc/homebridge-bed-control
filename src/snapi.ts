/*
 * The following is my documentation of the available API requests that have 
 * been discovered. I pulled these from 
 *  - https://github.com/technicalpickles/sleepyq, 
 *  - https://github.com/erichelgeson/sleepiq, and 
 *  - https://github.com/natecj/sleepiq-php, 
 * removing the request links that no longer work. 
 * 
 * As of December 2018, I have discovered the additional API requests 
 * needed to control the pressure of the bed
 * 
 * If anybody discovers other features of the API, let me know!
 * 
 * To use, launch node in the same directory as this file, then create an
 * object with
 *| > snapi = require('./snapi.js') 
 *| > api = new snapi('username','password')
 * 
 * List of class methods:
 * - api.login()           : required first
 * - api.genURL()          : allows for passing any url extension in
 * - api.registration()    : 
 * - api.familyStatus()    : where the useful homekit information is
 * - api.sleeper()         : 
 * - api.bed()             : 
 * 
 * The next five require familyStatus() or bed() to be called first to get a bedID
 * - api.bedStatus()       : 
 * - api.bedPauseMode()    : Reads the privacy mode setting of the bed
 * - api.setBedPauseMode() : Sets the privacy mode setting of the bed
 * - api.sleepNumber()     : Used to set the sleep number for a side
 * - api.forceIdle()       : Stops the pump
 * - api.pumpStatus()      : 
 *
 * The last two provide bulk sleep data. Could be fun to import into a spreadsheet
 * - api.sleeperData()     : 
 * - api.sleepSliceData()  : 
 */

import axios from 'axios';
axios.defaults.withCredentials = true;

const loginURL = 'https://api.sleepiq.sleepnumber.com/rest/login';

class snapi {

  protected userId: String = '';
  protected bedID: String = '';
  protected key: String = '';
  public defaultBed: Number = 0;

  constructor(
    private readonly username: String,
    private readonly password: String
  ) {

    this.login(username, password, (res) => console.log(res));

  }

  login(
    username: String,
    password: String,
    callback?: (payload) => void
  ) {
    axios.put(loginURL, {
      'login': username,
      'password': password
    }).then(res => {
      this.userId = res.data.userId;
      this.key = res.data.key;
      if (callback) callback(res.data);
    })
    .catch(err => {
      if (callback) callback(err);
    })
  }

  debug() {
    console.log(`userId: ${this.userId}, bedID: ${this.bedID}, key: ${this.key}`);
  }
}

export default snapi;