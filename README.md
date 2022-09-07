<p align="center">
  <img src="bed_control.png" height="200px">  
</p>
<span align="center">

# Homebridge Bed Control
[![Downloads](https://img.shields.io/npm/dt/homebridge-bed-control)](https://www.npmjs.com/package/homebridge-bed-control)
[![Version](https://img.shields.io/npm/v/homebridge-bed-control)](https://www.npmjs.com/package/homebridge-bed-control)
[![GitHub issues](https://img.shields.io/github/issues/hbblebc/homebridge-bed-control)](https://github.com/hbblebc/homebridge-bed-control/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/hbblebc/homebridge-bed-control)](https://github.com/hbblebc/homebridge-bed-control/pulls)
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![donate with bitcoin](https://img.shields.io/badge/btc-15sPZBv33rFAtED4ZLBDsKiQ8bgVY1cKzv-blue)](15sPZBv33rFAtED4ZLBDsKiQ8bgVY1cKzv)

</span>

## [HomeBridge](https://github.com/nfarina/homebridge) plugin for compatible smart bed platforms
Copyright © 2022 hbblebc. All rights reserved.

<i>This is an independent plugin and not affiliated with any bed platform company or manufacturer. If you have an issue with the plugin, file a ticket here. The bed companies will not provide support for any problems encountered as a result of using this plugin. Use at your own risk.</i>

This repository contains a smart bed control plugin for homebridge that allows you to control various features of your supported beds. For example, sleep number setting (modeled as a lightbulb), head/foot position, outlets, foot warming, massage, etc. It will detect all the beds on your account and add them automatically.

### Supported bed platforms
 - sleep number

# Installation

Install through homebridge-config-ui-x.

# Configuration

Configure in Homebridge UI following config.schema.json

# Usage

The platform supports the following HomeKit devices:

- Inflation numbers and head/foot positions are modeled as a lightbulb in HomeKit. 
  - This allows you to set the value easily. Keep this in mind when telling Siri to turn off all the lights. 
- Occupancy of the bed is a standard occupancy sensor
- Outlets and lights are homekit outlets
- Privacy mode and Responsive Air mode are homekit switches
- Foot warming is modeled as a thermostat (This is a little odd but easy to learn)
  - The thermostat has 4 modes that map to the following temperature controls:
    - Off -> Off
    - Auto -> Low
    - Cool -> Medium
    - Heat -> High
  - The temperature slider for the thermstat allows you to control the foot warming timer. It only has a range of 50-100, so if you want to set the foot warming timer to a different value, you will need to use the bed app, or create an automation to to set the temperature every X minutes. 

All the controls for a single bed will be grouped inside of a single device matching the name of the bed. If you would rather have separate controls, the HomeKit app will let you split the device into separate controls

# Issues/Future Work
None for now