export const config = {
  ws: 'wss://stream.binance.com/stream',
  instruments: ['BTCUSDT', 'BTCUSDC', 'ETHUSDT', 'ETHBTC'],
  traders: [
    {
      username: 'trader_1',
      password: 'qweqwe',
      instruments: ['BTCUSDT', 'BTCUSDC'],
      layersToCopy: 3,
      pRatePercent: 0.1,
      markupPercent: 0.05,
    },
    {
      username: 'trader_3',
      password: 'qweqwe',
      instruments: ['ETHUSDT', 'ETHBTC'],
      layersToCopy: 3,
      pRatePercent: 0.1,
      markupPercent: 0.05,
    },
  ],
  oms: {
    url: 'http://localhost:3000/graphql',
  },
};
