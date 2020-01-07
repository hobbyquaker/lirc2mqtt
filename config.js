const config = require('yargs')
    .usage('Usage: $0 [options]')
    .describe('v', 'possible values: "error", "warn", "info", "debug"')
    .describe('n', 'instance name. used as mqtt client id and as prefix for connected topic')
    .describe('u', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect-using-a-url')
    .describe('c', 'mqtt broker username credential')
    .describe('w', 'mqtt broker password credential')
    .describe('l', 'lircd host')
    .describe('p', 'lircd port')
    .describe('h', 'show help')
    .alias({
        h: 'help',
        n: 'name',
        c: 'username',
        w: 'password',
        u: 'url',
        v: 'verbosity',
        l: 'lirc-host',
        p: 'lirc-port'
    })
    .default({
        u: 'mqtt://127.0.0.1',
        n: 'lirc',
        v: 'info',
        l: '127.0.0.1',
        p: 8765,
        i: 60
    })
    .version()
    .help('help')
    .argv;

module.exports = config;
