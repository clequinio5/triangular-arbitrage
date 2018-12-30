// Modules import
const KrakenClient = require('kraken-exchange-api');
const moment = require('moment');
const fs = require('fs');

// Global constants
const key = ''; // API Key
const secret = ''; // API Private Key
const kraken = new KrakenClient(key, secret);
const requestIntervalTime = 3000; // in ms
const maxFee = 0.0026; // max fee per trade (normally average is : 0.16% for maker=seller and 0.26% for taker=buyer for all pairs when < 50k$ except UDTUSDT is 0,2 for taker & maker)
// https://support.kraken.com/hc/en-us/articles/205893708-What-is-the-minimum-order-size-
const volumeMinEUR = 10; // in EUR
const listOfCodedSeq = JSON.parse(fs.readFileSync('./sequences.json', 'utf8'));

console.log('');
console.log('       *** LAUNCHING TRIANGULAR ABRITRAGE ANALYSIS ***');
console.log('');
let startClockFct = setInterval(triangularArbitrage, requestIntervalTime);


function addOrder() {



}

function computeVolumeMin() {
  // take into account the fees : for each trade the initial amount will decrease and must be lower than the minimum volume

  // faire des trades avec tjrs 8eur min (ou équivalent ETH) et choisir tjs les suites avec un départ/fin eur ou eth 

}

function triangularArbitrage() {

  // Get Ticker Info of several asset pairs
  let time = moment().format('DD/MM/YYYY HH:mm:ss ' + '(ZZ UTC)');
  console.log(time);
  console.time('Response');

  kraken.api('Ticker', { "pair": 'BCHEUR,BCHUSD,BCHXBT,DASHEUR,DASHUSD,DASHXBT,EOSETH,EOSXBT,GNOETH,GNOXBT,USDTUSD,ETCETH,ETCXBT,ETCEUR,ETCUSD,ETHXBT,ETHCAD,ETHEUR,ETHGBP,ETHJPY,ETHUSD,ICNETH,ICNXBT,LTCXBT,LTCEUR,LTCUSD,MLNETH,MLNXBT,REPETH,REPXBT,REPEUR,XBTCAD,XBTEUR,XBTGBP,XBTJPY,XBTUSD,XDGXBT,XLMXBT,XMRXBT,XMREUR,XMRUSD,XRPXBT,XRPEUR,XRPUSD,ZECXBT,ZECEUR,ZECUSD' }, function (error, response) {
    console.timeEnd('Response');
    if (error) {
      console.log('ErrorTicker ' + error);
    } else {
      console.time('Computation');

      let listOfCodedSeqProfit = [];
      let compt = 0;
      for (let i = 0; i < listOfCodedSeq.length; i++) {
        let profit = computeTriangularArbitrageProfit(response, listOfCodedSeq[i]);
        if (profit > 0) {
          listOfCodedSeqProfit[compt] = listOfCodedSeq[i];
          listOfCodedSeqProfit[compt]["profit"] = profit;
          listOfCodedSeqProfit[compt]["key"] = i;
          compt++;
        }
      }

      console.timeEnd('Computation');
      console.log('');

      if (listOfCodedSeqProfit.length == 0) {
        return;
      } else {
        console.log("\x07");
      }

      listOfCodedSeqProfit.sort(function (a, b) {
        return (b.profit) - (a.profit);
      });

      for (let i = 0; i < listOfCodedSeqProfit.length; i++) {
        let pair1 = listOfCodedSeqProfit[i]['pairs'][0];
        let pair2 = listOfCodedSeqProfit[i]['pairs'][1];
        let pair3 = listOfCodedSeqProfit[i]['pairs'][2];
        let key = listOfCodedSeqProfit[i]['key'];
        let profit = listOfCodedSeqProfit[i]['profit'].toFixed(2);
        console.log(key + ' - ' + pair1 + '/' + pair2 + '/' + pair3 + ' - ' + profit + '%');
        if (profit > 1) {
          writeFile('\n' + time + ';' + key + ';' + pair1 + ';' + pair2 + ';' + pair3 + ';' + profit);
        }
      }
      console.log('');
      console.log('========================================');
      console.log('');


      // Add triangular orders
      //addOrder();
    }
  });
}

function computeTriangularArbitrageProfit(response, codedSeq) {

  // let seq = ABCA (for example A: EUR, B: XBT, C: ETH ) which got 3 pairs A/B B/C and C/A
  // pairAB can be a fictive pair not available on the Platform Exchange (like EUR/XBT), but pair1 is always available (like XBT/EUR)
  // we use the code '1' or '0' to know if the pair1 must be reverted or not (to be coherent with the given unique sequence)  
  let amountA = 1000; // unit of the amount is asset A 

  let pair1 = codedSeq['pairs'][0];
  let pair2 = codedSeq['pairs'][1];
  let pair3 = codedSeq['pairs'][2];
  // Note: with A/B pair (ex: EUR/XBT), when you buy B from amount A, you take the ASK price (best seller of B asset) | with C/A pair (i.e ETH/EUR), you will take BID price to sell amount C to have A
  // By buying at the ASK price and selling at the BID price, we take into account the SPREAD
  let pricePairAB = (codedSeq['codes'][0] == "1") ? (1 / parseFloat(response['result'][pair1]['a'][0])) : parseFloat(response['result'][pair1]['b'][0]);
  let pricePairBC = (codedSeq['codes'][1] == "1") ? (1 / parseFloat(response['result'][pair2]['a'][0])) : parseFloat(response['result'][pair2]['b'][0]);
  let pricePairCA = (codedSeq['codes'][2] == "1") ? (1 / parseFloat(response['result'][pair3]['a'][0])) : parseFloat(response['result'][pair3]['b'][0]);


  let profit = amountA * pricePairAB * pricePairBC * pricePairCA * Math.pow((1 - maxFee), 3) - amountA;
  let profitPercentage = profit * 100 / amountA;

  //// ALgo java a optimisé pour retourné une list de 174/2 seq (puis ici si c'est + on retourne bien l'ens de pairs au bot pour les trader et si c - , on fera un reverse des pairs du milieu..)
  //// -> non pas besoin car le tps de calcul est très rapide (on va juste pas trier les négatifs) [ A VOIR ..si la liste devient plus longue...]
  // essayer de voir si possible de récup les tps de rép/latence de kraken afin de pas lancer des ordres auto si tt kraken lague}
  // qd je vais programmer les ordres auto, tjs mettre en fee option : choisir le fee base currency (par ex: pr ETH/EUR, CHOISIR ETH: les frais seront appliqué au 100e qu'on a mis et aura dc - de ETH, car si je choisis quote, il faut tjs avoir une réserve à coté de la monnaie "quote" pour payer les fees sans impacter le montant d'achat...)

  //  PRENDRE EN COMPTE LA PROFONDEUR 
  return profitPercentage;
}

function writeFile(text) {
  fs.appendFile("./analysis.csv", text, function (err) {
    if (err) {
      return console.log(err);
    }
    //console.log("analysis.csv written!");
  });
}