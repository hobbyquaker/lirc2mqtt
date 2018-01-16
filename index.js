#!/usr/bin/env node

const Mqtt = require('mqtt');
const Lirc = require('lirc-client');
const log = require('yalm');
const pkg = require('./package.json');
const config = require('./config.js');

log.setLevel(config.v);

log.info(pkg.name + ' ' + pkg.version + ' starting');

let lircConnected;

log.info('lirc trying to connect on ' + config.lircHost + ':' + config.lircPort);

const lircOptions = config.lircSocket ? {
  path: config.lircSocket,
} : {
    host: config.lircHost,
    port: config.lircPort
};

const lirc = new Lirc({
    host: config.lircHost,
    port: config.lircPort
});

if (typeof config.topic !== 'string') {
    config.topic = '';
}
if (config.topic !== '' && !config.topic.match(/\/$/)) {
    config.topic += '/';
}

let mqttConnected;

log.info('mqtt trying to connect', config.url);
const mqtt = Mqtt.connect(config.url, {will: {topic: config.name + '/connected', payload: '0'}});

mqtt.on('connect', () => {
    mqttConnected = true;
    log.info('mqtt connected ' + config.url);
    mqtt.publish(config.name + '/connected', lircConnected ? '2' : '1');
    log.info('mqtt subscribe', config.name + '/set/#');
    mqtt.subscribe(config.name + '/set/+/+');
});

mqtt.on('close', () => {
    if (mqttConnected) {
        mqttConnected = false;
        log.info('mqtt closed ' + config.url);
    }
});

mqtt.on('error', err => {
    log.error('mqtt', err);
});

lirc.on('connect', () => {
    log.info('lirc connected');
    lircConnected = true;
    mqtt.publish(config.name + '/connected', '2');
});

lirc.on('disconnect', () => {
    if (lircConnected) {
        log.info('lirc connection closed');
        lircConnected = false;
        mqtt.publish(config.name + '/connected', '1');
    }
});

lirc.on('error', err => {
    log.error('lirc', err);
});

lirc.on('receive', (remote, command, repeats) => {
    log.debug('receive', remote, command, repeats);
    const topic = config.n + '/status/' + remote + '/' + command;
    let payload;
    if (config.json) {
        payload = JSON.stringify({
            val: parseInt(repeats, 10)
        });
    } else {
        payload = String(parseInt(repeats, 10));
    }
    log.debug('mqtt >', topic, payload);
    mqtt.publish(topic, payload);
});

mqtt.on('message', (topic, payload) => {
    payload = payload.toString();
    log.debug('mqtt <', topic, payload);

    if (!lircConnected) {
        log.error('lirc disconnected. can\'t send command.');
        return;
    }

    const [, , remote, key] = topic.split('/');
    let repeats = 0;
    let cmd = 'SEND_ONCE';

    if (payload.toUpperCase() === 'START') {
        cmd = 'SEND_START';
    } else if (payload.toUpperCase() === 'STOP') {
        cmd = 'SEND_STOP';
    } else if (payload) {
        repeats = parseInt(payload, 10) || 0;
    }

    if (repeats) {
        lirc.cmd(cmd, remote, key, repeats, () => {
            log.debug('lirc >', cmd, remote, key, repeats);
        });
    } else {
        lirc.cmd(cmd, remote, key, () => {
            log.debug('lirc >', cmd, remote, key);
        });
    }
});
