# lirc2mqtt

This is an interface that connects [LIRC](www.lirc.org) to MQTT.


## Getting started

* Prerequisites
    * [Node.js](www.nodejs.org) >= 0.10 (including npm). 
    * lircd started with --listen option.

* Install    
````sudo npm install -g xyz2mqtt````


* Start    
````lirc2mqtt --help````  


## Topics and Payloads

### Receive

````lirc/status/<remote>/<button>````

Payload is the repeat counter.


#### Send

````lirc/set/<remote>/<button>````

Payload can be one of:

* Empty (single button press)
* "START" or "STOP" (start/stop continuous button press)
* An integer number (repeat count)


## License

MIT © [Sebastian Raff](https://github.com/hobbyquaker)
