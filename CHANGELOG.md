# Change Log

All notable changes to this project will be documented in this file.

## v1.2.1 (2022-09-18)

### Bug Fixes

- Fixed bug in API that was creating phantom foundation controls
- Updated sleep number GET function to use API that updates even when privacy mode is enabled
- Updated polling routine to disable if all beds have privacy mode enabled, or to skip individual
  beds with privacy mode enabled. 
  - When privacy mode is enabled, the API request returns whatever the last state of the bed was
    before enabling privacy mode. Skipping the polling updates will prevent HomeKit from getting
    confused on the current state of the bed.
  - Enabling privacy mode will also cause your occupancy sensors to report "Not responding". If
    you keep privacy mode enabled all the time, I recommend disabling polling and hiding the 
    occupancy sensors from your device list using the platform settings. 

## v1.2.0 (2022-09-08)

### Changes

- Improved error handling throughout the API and platform
- Disable the API on caught errors to prevent flooding homebridge

## v1.1.2 (2022-09-07)

### Bug Fixes

- Removed hap-nodejs as a dependency, point to the included homebridge version

## v1.1.1 (2022-09-07)

### Bug Fixes

- Added hap-nodejs as a dependency

## v1.1.0 (2022-09-07)

### Bug Fixes

- Cleaned up some typescript issues

### Changes

- Convert foot warmers from a HeaterCooler to a Thermostat device (see README for more info)

## v1.0.0 (2022-09-07)

- Initial release
