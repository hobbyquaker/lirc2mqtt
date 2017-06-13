#!/usr/bin/env node

require('should');

const cp = require('child_process');
const path = require('path');
const streamSplitter = require('stream-splitter');
const Mqtt = require('mqtt');
mqtt = Mqtt.connect('mqtt://127.0.0.1');

const simCmd = path.join(__dirname, '/node_modules/lirc-simulator/index.js');
const simArgs = [];
let sim;
let simPipeOut;
let simPipeErr;
const simSubscriptions = {};
const simBuffer = [];

const lircCmd = path.join(__dirname, '/index.js');
const lircArgs = ['-v', 'debug'];
let lirc;
let lircPipeOut;
let lircPipeErr;
const lircSubscriptions = {};
const lircBuffer = [];

let subIndex = 0;

const mqttSubscriptions = {};
function mqttSubscribe(topic, callback) {
    if (mqttSubscriptions[topic]) {
        mqttSubscriptions[topic].push(callback);
    } else {
        mqttSubscriptions[topic] = [callback];
        mqtt.subscribe(topic);
    }
}
mqtt.on('message', (topic, payload) => {
    if (mqttSubscriptions[topic]) {
        mqttSubscriptions[topic].forEach(callback => {
            callback(payload.toString());
        });
    }
});

function subscribe(type, rx, cb) {
    subIndex += 1;
    if (type === 'sim') {
        simSubscriptions[subIndex] = {rx, cb};
    } else if (type === 'lirc') {
        lircSubscriptions[subIndex] = {rx, cb};
    }
    matchSubscriptions(type);
    return subIndex;
}

function unsubscribe(type, subIndex) {
    if (type === 'sim') {
        delete simSubscriptions[subIndex];
    } else if (type === 'lirc') {
        delete lircSubscriptions[subIndex];
    }
}

function matchSubscriptions(type, data) {
    let subs;
    let buf;
    if (type === 'sim') {
        subs = simSubscriptions;
        buf = simBuffer;
    } else if (type === 'lirc') {
        subs = lircSubscriptions;
        buf = lircBuffer;
    }
    if (data) {
        buf.push(data);
    }
    buf.forEach((line, index) => {
        Object.keys(subs).forEach(key => {
            const sub = subs[key];
            if (line.match(sub.rx)) {
                sub.cb(line);
                delete subs[key];
                buf.splice(index, 1);
            }
        });
    });
}

function startLirc() {
    lirc = cp.spawn(lircCmd, lircArgs);
    lircPipeOut = lirc.stdout.pipe(streamSplitter('\n'));
    lircPipeErr = lirc.stderr.pipe(streamSplitter('\n'));
    lircPipeOut.on('token', data => {
        console.log('lirc', data.toString());
        matchSubscriptions('lirc', data.toString());
    });
    lircPipeErr.on('token', data => {
        console.log('lirc', data.toString());
        matchSubscriptions('lirc', data.toString());
    });
}

function startSim() {
    sim = cp.spawn(simCmd, simArgs);
    simPipeOut = sim.stdout.pipe(streamSplitter('\n'));
    simPipeErr = sim.stderr.pipe(streamSplitter('\n'));
    simPipeOut.on('token', data => {
        console.log('sim', data.toString());
        matchSubscriptions('sim', data.toString());
    });
    simPipeErr.on('token', data => {
        console.log('sim', data.toString());
        matchSubscriptions('sim', data.toString());
    });
}

function end(code) {
    if (lirc.kill) {
        lirc.kill();
    }
    if (sim.kill) {
        sim.kill();
    }
    if (typeof code !== 'undefined') {
        process.exit(code);
    }
}

process.on('SIGINT', () => {
    end(1);
});

process.on('exit', () => {
    end();
});

describe('start daemons', () => {
    it('lirc-simulator should start without error', function (done)  {
        this.timeout(20000);
        subscribe('sim', /listening on 127.0.0.1:8765/, () => {
            done();
        });
        startSim();

    });
    it('lirc2mqtt should start without error', function (done) {
        this.timeout(20000);
        subscribe('lirc', /lirc2mqtt [0-9.]+ starting/, () => {
            done();
        });
        startLirc();
    });
});

describe('lirc2mqtt - mqtt connection', () => {
    it('lirc2mqtt should connect to the mqtt broker', function (done) {
        this.timeout(12000);
        subscribe('lirc', /mqtt connected/, () => {
            done();
        });
    });
});

describe('lirc2mqtt - lirc-simulator connection', () => {
    it('lirc2mqtt should connect to the lirc-simulator', function (done) {
        subscribe('lirc', /lirc connected/, () => {
            done();
        });
    });
    it('lirc-simulator should log the connection from lirc2mqtt', function (done) {
        subscribe('sim', /connect/, () => {
            done();
        });
    });
});

describe('lirc-simulator - lirc2mqtt - mqtt', function () {
    this.timeout(15000);
    it('lirc2mqtt should publish on lirc/status/remote1/button1', function (done) {
        mqttSubscribe('lirc/status/remote1/button1', payload => {
            done();
        });
    });
    it('lirc2mqtt should publish 3 times on lirc/status/remote1/button2', function (done) {
        let counter = 0;
        mqttSubscribe('lirc/status/remote1/button2', payload => {
            counter += 1;
            if (counter === 3) {
                done();
            }
        });
    });
});

describe('mqtt - lirc2mqtt - lirc-simulator', function () {
    this.timeout(15000);
    it('lirc-simulator should receive a SEND_ONCE', function (done) {
        subscribe('sim', /SEND_ONCE remote1 button1/, () => {
            done();
        });
        mqtt.publish('lirc/set/remote1/button1', '');
    });
    it('lirc-simulator should receive a SEND_START', function (done) {
        subscribe('sim', /SEND_START remote1 button2/, () => {
            done();
        });
        mqtt.publish('lirc/set/remote1/button2', 'START');
    });
    it('lirc-simulator should receive a SEND_STOP', function (done) {
        subscribe('sim', /SEND_STOP remote1 button2/, () => {
            done();
        });
        mqtt.publish('lirc/set/remote1/button2', 'STOP');
    });
    it('lirc-simulator should receive a SEND_ONCE with repeat count', function (done) {
        subscribe('sim', /SEND_ONCE remote1 button3 3/, () => {
            done();
        });
        mqtt.publish('lirc/set/remote1/button3', '3');
    });

});


describe('disconnect lirc2mqtt - lirc-simulator', () => {
    it('should kill lirc-simulator', () => {
        sim.kill();
    });
    it('should log disconnect', done => {
        subscribe('lirc', /lirc connection closed/, () => {
            done();
        });
    });
    it('lirc2mqtt should log an error when trying to send while disconnected', function (done) {
        subscribe('lirc', /lirc disconnected/, () => {
            done();
        });
        mqtt.publish('lirc/set/remote1/button4', '');
    });
});

/* TODO this breaks istanbul. why?
describe('reconnect lirc2mqtt - lirc-simulator', function () {
    this.timeout(7000);
    it('should reconnect after lirc-simulator is restarted', function (done) {
        subscribe('lirc', /lirc connected/, () => {
            done();
        });
        startSim();
    });
});


describe('cleanup', () => {
    it('should kill lirc2mqtt', () => {
        lirc.kill();
    });
});
 */

setTimeout(() => {
    lirc.kill();
    sim.kill();
    process.exit(1);
}, 30000);