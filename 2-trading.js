const KrakenClient = require('kraken-exchange-api');
const moment = require('moment');
const fs = require('fs');
const _ = require('lodash');
const clc = require('cli-color');
const maxFees = 0.0026;
const key = '9B29SWO5sFX5PaTD3jia4SugBP/NhhlbEppxznAjxD9uFy95MYAoMBV/';
const secret = 'J0t5AqfdGX6mU6gajLKmAMBQSUHq0jmCXNmeR//8Ohq8/06CTqVN7LlqXFrOBbTnFhv1WVNoJNFAb+3+K+6e7g==';
const kraken = new KrakenClient(key, secret);
const seqs = JSON.parse(fs.readFileSync('./sequences.json', 'utf8'));
const minVolume = JSON.parse(fs.readFileSync('./minimum_volumes.json', 'utf8'));

let initVol = 0.00;
let seq = {};

function prompt(question, callback) {
    var stdin = process.stdin,
        stdout = process.stdout;
    stdin.resume();
    stdout.write(question);
    stdin.once('data', function (data) {
        callback(data.toString().trim());
    });
}

async function start() {
    let first = kraken.api('AddOrder', { "pair": seq['pairs'][n], "type": 'buy', "ordertype": 'market', "volume": seq['vols'][n] });

}
    });
}



function orderN(n) {
    kraken.api('AddOrder', { "pair": seq['pairs'][n], "type": 'buy', "ordertype": 'market', "volume": seq['vols'][n] }, function (error, result) {
        if (error) {
            console.log("ErrorAddOrder " + error);
            console.timeEnd('order');
            start();
        } else {
            console.log('Ordre ' + (n + 1) + ' success: ' + result);
            if (n == 2) {
                console.timeEnd('order');
                start();
            } else {
                verifyOrderExec(orderN(n + 1));
            }

        }
    });
}

function verifyOrderExec(callback) {
    console.time('OpenOrder')
    kraken.api('OpenOrders', {}, function (error, data) {
        console.timeEnd('OpenOrder');
        if (error) {
            console.log("ErrorOpenOrders " + error);
            verifyOrderExec();
        } else {
            if (_.isEmpty(data.result.open)) {
                callback();
            } else {
                verifyOrderExec();
            }
        }
    });
}

//start();

function getDeviceFromPair(pair, pos) {
    if (pos === 0) {
        if (pair.length === 8) {
            return pair.substring(0, 4);
        } else {
            return pair.substring(0, 3);
        }
    } else {
        if (pair.length === 8) {
            return pair.substring(4, 8);
        } else {
            return pair.substring(3, 6);
        }
    }
}

function start() {
    seq = {};
    initVol = 0.00;
    console.log('');
    prompt('## Numero de sequence: ', function (input) {
        console.log('');
        seq = seqs[input];
        console.log(seq);
        let initPair = seq['pairs'][0];
        let initDevice = seq['codes'][0] === '1' ? getDeviceFromPair(initPair, 1) : getDeviceFromPair(initPair, 0);
        console.log('Volume minimum: ' + minVolume[initDevice] + ' ' + initDevice);
        console.log('');
        prompt('## Volume initial: ', function (input) {
            initVol = input;
            order(initVol, initDevice, seq);
        });
    });
}

function order(initVol, initDevice, seq) {
    console.time('ticker');
    kraken.api('Ticker', { "pair": 'BCHEUR,BCHUSD,BCHXBT,DASHEUR,DASHUSD,DASHXBT,EOSETH,EOSXBT,GNOETH,GNOXBT,ETCETH,ETCXBT,ETCEUR,ETCUSD,ETHXBT,ETHCAD,ETHEUR,ETHGBP,ETHJPY,ETHUSD,ICNETH,ICNXBT,LTCXBT,LTCEUR,LTCUSD,MLNETH,MLNXBT,REPETH,REPXBT,REPEUR,XBTCAD,XBTEUR,XBTGBP,XBTJPY,XBTUSD,XMRXBT,XMREUR,XMRUSD,XRPXBT,XRPEUR,XRPUSD,ZECXBT,ZECEUR,ZECUSD' }, function (error, response) {
        console.log('');
        console.timeEnd('ticker');
        if (error) {
            console.log('ErrorTicker ' + error);
            start();
        } else {
            console.time('preCalc');
            console.log('');
            console.log('**** EXPECTED VOLUMES ****');

            let vol = [];
            let coeff = [];
            let device = [];
            vol[0] = initVol;
            device[0] = initDevice;
            for (var i = 0; i < 3; i++) {
                coeff[i] = (seq['codes'][i] == '1') ? (1 / parseFloat(response['result'][seq['pairs'][i]]['a'][0])) : parseFloat(response['result'][seq['pairs'][i]]['b'][0]);
                vol[i + 1] = vol[i] * coeff[i] * (1 - maxFees);
                device[i + 1] = i == 2 ? initDevice : (seq['codes'][i + 1] == '1' ? getDeviceFromPair(seq['pairs'][i + 1], 1) : getDeviceFromPair(seq['pairs'][i + 1], 0));
            }
            seq['vols'] = vol;
            seq['devices'] = device;
            seq['coeffs'] = coeff;

            for (var i = 0; i < device.length; i++) {
                let minVol = minVolume[device[i]]
                if (vol[i] < minVol && i < 3) {
                    console.log(clc.red.underline(device[i] + ' - ' + parseFloat(vol[i]).toFixed(4) + '! minVol: ' + minVol));
                } else {
                    console.log(device[i] + ' - ' + parseFloat(vol[i]).toFixed(4));
                }
                // let warning = vol[i] < minVol ? '! minVol: ' + minVol : '';
                // console.log(device[i] + ' - ' + parseFloat(vol[i]).toFixed(4) + ' ' + warning);
            }
            let benef = (vol[3] - vol[0]) / vol[0] * 100;
            console.log('Benefice: ' + parseFloat(benef).toFixed(4) + '%');
            console.timeEnd('preCalc');
            console.log('');

            prompt('Y/N: ', function (input) {
                if (input === 'Y') {
                    console.time('order');
                    orderN(0);
                } else {
                    start();
                }
            });
        }
    });

}


