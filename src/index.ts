import axios from 'axios';
import bodyParser from 'body-parser';
import { load } from 'cheerio';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { createStream } from 'rotating-file-stream';

async function getPriceFeed(length?: unknown) {
  try {
    const maxLength = length ? Number(length) : 9;
    const siteUrl = 'https://coinmarketcap.com';
    const { data } = await axios({
      method: 'GET',
      url: siteUrl,
    });
    const $ = load(data);
    const elementSelector = `#__next > div > div.main-content > div.sc-57oli2-0.comDeo.cmc-body-wrapper > div > div > div.h7vnx2-1.bFzXgL > table > tbody > tr`;
    const keys = ['rank', 'name', 'price', '1h', '24h', '7d', 'marketCap', 'volume', 'circulatingSupply'];
    const coinArr: any[] = [];
    $(elementSelector).each((parentIdx, parentElement) => {
      let keyIdx = 0;
      const coinObj: any = {};
      if (parentIdx <= maxLength) {
        $(parentElement)
          .children()
          .each((childIdx, childElement) => {
            let tdValue = $(childElement).text();
            if (keyIdx === 1 || keyIdx === 6) {
              tdValue = $('p:first-child', $(childElement).html()).text();
            }
            if (tdValue) {
              coinObj[keys[keyIdx]] = tdValue;
              keyIdx++;
            }
          });
        coinArr.push(coinObj);
      }
    });

    return coinArr;
  } catch (error) {
    throw error;
  }
}

async function getPrice(code: string) {
  try {
    const siteUrl = 'https://coinmarketcap.com';
    const { data } = await axios({
      method: 'GET',
      url: `https://coinmarketcap.com/currencies/${code}`,
    });
    const $ = load(data);
    const circulatingSupplySelector = `#__next > div > div.main-content > div.sc-57oli2-0.comDeo.cmc-body-wrapper > div > div.sc-16r8icm-0.eMxKgr.container > div.n78udj-0.jskEGI > div > div.sc-16r8icm-0.fggtJu.statsSection > div.hide.statsContainer > div.n78udj-6.dCjIMS > div.sc-16r8icm-0.inUVOz > div.statsValue`;
    const marketCapSelector = `#__next > div > div.main-content > div.sc-57oli2-0.comDeo.cmc-body-wrapper > div > div.sc-16r8icm-0.eMxKgr.container > div.n78udj-0.jskEGI > div > div.sc-16r8icm-0.fggtJu.statsSection > div.hide.statsContainer > div:nth-child(1) > div > div.statsItemRight > div`;
    const maxSupplySelector = `#__next > div > div.main-content > div.sc-57oli2-0.comDeo.cmc-body-wrapper > div > div.sc-16r8icm-0.eMxKgr.container > div.n78udj-0.jskEGI > div > div.sc-16r8icm-0.fggtJu.statsSection > div.hide.statsContainer > div.n78udj-6.dCjIMS > div.sc-16r8icm-0.dwCYJB > div.maxSupplyValue`;
    const nameSelector = `#__next > div > div.main-content > div.sc-57oli2-0.comDeo.cmc-body-wrapper > div > div.sc-16r8icm-0.eMxKgr.container > div.n78udj-0.jskEGI > div > div.sc-16r8icm-0.kDzKwW.nameSection > div.sc-16r8icm-0.gpRPnR.nameHeader > h2`;
    const priceSelector = `#__next > div > div.main-content > div.sc-57oli2-0.comDeo.cmc-body-wrapper > div > div.sc-16r8icm-0.eMxKgr.container > div.n78udj-0.jskEGI > div > div.sc-16r8icm-0.kjciSH.priceSection > div.sc-16r8icm-0.kjciSH.priceTitle > div`;
    const totalSupplySelector = `#__next > div > div.main-content > div.sc-57oli2-0.comDeo.cmc-body-wrapper > div > div.sc-16r8icm-0.eMxKgr.container > div.n78udj-0.jskEGI > div > div.sc-16r8icm-0.fggtJu.statsSection > div.hide.statsContainer > div.n78udj-6.dCjIMS > div.sc-16r8icm-0.hWTiuI > div.maxSupplyValue`;

    const circulatingSupply = $(circulatingSupplySelector).text();
    const marketCap = $(marketCapSelector).text();
    const maxSupply = $(maxSupplySelector).text();
    const name = $(nameSelector).text();
    const price = $(priceSelector).text();
    const totalSupply = $(totalSupplySelector).text();

    return {
      circulatingSupply,
      marketCap,
      maxSupply,
      name,
      price,
      totalSupply,
    };
  } catch (error) {
    throw error;
  }
}

const app = express();

app.use(cors());

// Configuring body parser middleware
// create a write stream (in append mode)
// const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
// create a rotating write stream
const accessLogStream = createStream('access.log', {
  interval: '1d', // rotate daily
  path: path.join(__dirname, 'log'),
});
// setup the logger
const logger = morgan('combined', { stream: accessLogStream });
app.use(logger);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/api/price-feed', async (req, res) => {
  try {
    const priceFeed = await getPriceFeed(req.query.length);

    return res.status(200).json({
      result: priceFeed,
    });
  } catch (error) {
    return res.status(500).json({
      result: String(error),
    });
  }
});
app.get('/api/price/:param', async (req, res) => {
  try {
    const priceFeed = await getPrice(req.params.param);

    return res.status(200).json({
      result: priceFeed,
    });
  } catch (error) {
    return res.status(500).json({
      result: String(error),
    });
  }
});
const port = 5555;
app.listen(port, () => {
  console.log(`⚡️[CMC]: CMC scrapper is running at http://localhost:${port}`);
});
