# Change Log

All notable changes to this project will be documented in this file.

## v1.3.7 (2024-06-13)

### Bug Fixes

- Merge #7, fix actuator position radix bug

## v1.3.6 (2024-06-13)

### Bug Fixes

- Fix outlet setup bug

## v1.3.5 (2024-06-12)

### Bug Fixes

- Fix StatusActive bug in occupancy sensor

## v1.3.4 (2024-06-12)

### Bug Fixes

- Fix missed logging type change

## v1.3.3 (2024-06-12)

### Bug Fixes

- Fix missing file extensions with migration to ESM

## v1.3.2 (2024-06-11)

### Bug Fixes

- Fix crash with hap-nodejs imports
- Update project configuration to use latest homebridge-recommended template defaults
- Fix many typescript issues

## v1.3.1 (2024-06-09)

### Bug Fixes

- Update eslint config

## v1.3.0 (2024-06-09)

### New Features

- Updated all dependencies to their latest versions
- Added unit tests for the platform, accessory, and API
- Updated the README with `ignoreList` information

### Bug Fixes

- Fixed broken API endpoint URLs
- Fixed broken outlet and footwarming functions
- Fixed typo in interface labels
- Fixed changed `preset` values
- Handle error cases in the proper hap-nodejs recommended way
  - For cases where there is a failure to communicate with the API, throw an error. For all other cases, such as being unable to detect occupancy status due to privacy mode, or the data being out of sync, set occupancy to undetected or set the bed control lightbulb to "off" to indicate an error state

## v1.2.3 (2022-09-24)

### Bug Fixes

- If you controlled both sides of the bed at the same time (like in a routine or trigger of some sort), 
  the debounce function was stepping on itself and making one of the sides not update. Each side now 
  uses its own debounced function, so they should both respond now.
- If you have polling enabled and one of the sides got out of sync, the logs were happy to tell you about it.
  They will be a bit calmer now. Turn on debug mode if you preferred the previous experience.
- Updated all the device characteristics to properly throw an error if they don't get data back from the 
  API like they are expecting. 

## v1.2.2 (2022-09-18)

### Bug Fixes

- Set initial polling privacy mode check to only run if polling is enabled

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
