# lirc2mqtt

[![NPM version](https://badge.fury.io/js/lirc2mqtt.svg)](http://badge.fury.io/js/lirc2mqtt)
[![Dependency Status](https://img.shields.io/gemnasium/hobbyquaker/lirc2mqtt.svg)](https://gemnasium.com/github.com/hobbyquaker/lirc2mqtt)
[![Build Status](https://travis-ci.org/hobbyquaker/lirc2mqtt.svg?branch=master)](https://travis-ci.org/hobbyquaker/lirc2mqtt)
[![Coverage Status](https://coveralls.io/repos/github/hobbyquaker/lirc2mqtt/badge.svg?branch=master)](https://coveralls.io/github/hobbyquaker/lirc2mqtt?branch=master)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License][mit-badge]][mit-url]

This is an interface that connects [LIRC](www.lirc.org) to MQTT.


## Getting started

* Prerequisites
    * [Node.js](www.nodejs.org) >= 6. 
    * lircd started with --listen option.

* Install    
`sudo npm install -g lirc2mqtt`


* Start    
`lirc2mqtt --help`


## Topics and Payloads

### Receive

`lirc/status/<remote>/<button>`

Payload is the repeat counter.


### Send

`lirc/set/<remote>/<button>`

Payload can be one of:

* Empty (single button press)
* `START` or `STOP` (start/stop continuous button press)
* An integer number (repeat count)


## License

MIT © [Sebastian Raff](https://github.com/hobbyquaker)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE