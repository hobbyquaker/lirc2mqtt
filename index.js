#!/usr/bin/env node

var pkg = require('./package.json');
var config = require('./config.js');
var log = require('yalm');
log.setLevel(config.v);

log.info(pkg.name + ' ' + pkg.version + ' starting');

var lircConnected;

log.info('lirc trying to connect on ' + config.lircHost + ':' + config.lircPort);

var lirc = require('lirc-client')({
    host: config.lircHost,
    port: config.lircPort
});

lirc.on('connect', function () {
    log.info('lirc connected');
    lircConnected = true;
    mqtt.publish(config.name + '/connected', '2');
});

lirc.on('disconnect', function () {
    log.info('lirc connection closed');
    lircConnected = false;
    mqtt.publish(config.name + '/connected', '1');
});

lirc.on('receive', function (remote, command, repeats) {
    log.debug('receive', remote, command, repeats);
    var topic = config.n + '/status/' + remote + '/' + command;
    var payload;
    if (config.json) {
        payload = JSON.stringify({
            val: parseInt(repeats, 10)
        });
    } else {
        payload = '' + parseInt(repeats, 10);
    }
    log.debug('mqtt >', topic, payload);
    mqtt.publish(topic, payload);
});

var Mqtt = require('mqtt');

if (typeof config.topic !== 'string') config.topic = '';
if (config.topic !== '' && !config.topic.match(/\/$/)) config.topic = config.topic + '/';

var mqttConnected;

log.info('mqtt trying to connect', config.url);
var mqtt = Mqtt.connect(config.url, {will: {topic: config.name + '/connected', payload: '0'}});

mqtt.on('connect', function () {
    mqttConnected = true;
    log.info('mqtt connected ' + config.url);
    mqtt.publish(config.name + '/connected', lircConnected ? '2' : '1');
    log.info('mqtt subscribe', config.name + '/set/#');
    mqtt.subscribe(config.name + '/set/+/+');

});

mqtt.on('close', function () {
    if (mqttConnected) {
        mqttConnected = false;
        log.info('mqtt closed ' + config.url);
    }
});

mqtt.on('error', function () {
    log.error('mqtt error ' + config.url);
});

mqtt.on('message', function (topic, payload) {
    payload = payload.toString();
    log.debug('mqtt <', topic, payload);

    if (!lircConnected) {
        log.error('lirc disconnected. can\'t send command.');
        return;
    }

    var parts = topic.split('/');
    var remote = parts[2];
    var key = parts[3];
    var repeats = 0;
    var cmd = 'SEND_ONCE';

    if (payload.toUpperCase() === 'START') {
        cmd = 'SEND_START';
    } else if (payload.toUpperCase() === 'STOP') {
        cmd = 'SEND_STOP';
    } else if (payload) {
        repeats = parseInt(payload, 10) || 0;
    }

    if (repeats) {
        lirc.cmd(cmd, remote, key, repeats, function () {
            log.debug('lirc >', cmd, remote, key, repeats);
        });
    } else {
        lirc.cmd(cmd, remote, key, function () {
            log.debug('lirc >', cmd, remote, key);
        });
    }

});
