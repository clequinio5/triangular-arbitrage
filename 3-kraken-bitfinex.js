const BFX = require('bitfinex-api-node');
const KRK = require('kraken-exchange-api');
const KRK_KEY = '';
const KRK_SECRET = '';
const BFX_KEY = 'I3Z9ponA2bPznJ0hoKMqoynfxcR7IpAwkD1ZRRe0n1V';
const BFX_SECRET = 'y3NjTHZLzlEjJleOuAPl38T0BI4fyDOoCDW5LUEhVPD';

const moment = require('moment');
const requestIntervalTime = 10000;

const opts = {
    version: 2,
    transform: true
}
const bws = new BFX(BFX_KEY, BFX_SECRET, opts).ws
const krkn = new KRK(KRK_KEY, KRK_SECRET);

bws.on('auth', () => {
    console.log('authenticated')
})
bws.on('open', () => {
    bws.subscribeTicker('DSHUSD')
    //bws.subscribeOrderBook('BTCUSD')
    //bws.subscribeTrades('BTCUSD')

    // authenticate
    // bws.auth()
})

let startClockFct = setInterval(krkTicker, requestIntervalTime);

function krkTicker() {
    krkn.api('Ticker', { "pair": 'DASHUSD' }, function (error, response) {
        let time = moment().format('DD/MM/YYYY HH:mm:ss ' + '(ZZ UTC)');
        if (error) {
            console.log('ErrorTicker ' + error);
        } else {
            let data = response.result;
            console.log('KRK (DSHUSD): ' + parseFloat(data.DASHUSD.a[0]).toFixed(2) + '/' + parseFloat(data.DASHUSD.b[0]).toFixed(2) + ' - ' + time);
        }
    });
}


bws.on('ticker', (pair, response) => {
    let time = moment().format('DD/MM/YYYY HH:mm:ss ' + '(ZZ UTC)');
    console.log('BFX (DSHUSD): ' + response.ASK + '/' + response.BID + ' - ' + time);
})

bws.on('error', console.error)