const TelegramBot = require('node-telegram-bot-api');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

class ProxyRotator {
    constructor(proxies) {
        this.proxies = proxies;
        this.currentIndex = 0;
    }

    getNextProxy() {
        const proxy = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        return proxy;
    }
}

function loadProxiesFromFile(filePath) {
    const proxies = fs.readFileSync(filePath, 'utf-8').split('\n');
    console.log(`proxy amount ${proxies.length}`)
    return proxies.map(proxyString => {
        proxyString = proxyString.replace(/\r$/, '');
        const parts = proxyString.split(':');
        return {
            ip: parts[0],
            port: parts[1],
            auth: parts.length === 4 ? { username: parts[2], password: parts[3] } : null
        };
    });
}

const proxies = loadProxiesFromFile('proxy.txt');

const proxyRotator = new ProxyRotator(proxies);


const token = process.env.TELEGRAM_BOT_TOKEN;

const index = new TelegramBot(token, {polling: true});

index.onText(/\/start/, (msg) => {
    index.sendMessage(msg.chat.id, 'Hello!');
});
index.on('message', async (msg) => {

    const chatId = msg.chat.id;
    const ids = msg.text.split('\n'); 

    if (msg.text.toString().toLowerCase() === '/start') {
        return;
    }

    let responses = ids.map(async (id) => {
        try {
            const proxy = proxyRotator.getNextProxy();
            const agent = proxy.auth ? new HttpsProxyAgent({ 
                host: proxy.ip, 
                port: proxy.port, 
                auth: proxy.auth 
            }) : new HttpsProxyAgent({ 
                host: proxy.ip, 
                port: proxy.port 
            });
            
            const headers = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6,zh-TW;q=0.5,zh;q=0.4',
                'Cache-Control': 'max-age=0',
                'Cookie': '_ga=GA1.1.312900917.1702740536; viewmode=grid; nick=76561198073224584; currency=USD; PHPSESSID=1pos7j5p9rh27gfmmp8f55hk26; _ga_GKQE8YS29T=GS1.1.1703360874.4.1.1703360890.0.0.0; sc_is_visitor_unique=rx9950433.1703360890.F3CAF9CBF7C74F54C0480578DD1FBBEA.3.2.2.2.2.2.2.2.2',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            };
            const response = await axios.get(`https://csgobackpack.net/index.php?nick=${id}`, {
                httpAgent: agent,
                headers: headers
            });

            const $ = cheerio.load(response.data);

            const totalValue = $('h3:contains("In total")').find('p').text().trim();
            const itemsCount = $('h3:contains("Items")').next('p').text().trim();

            return `ID: ${id}\nTotal Value: ${totalValue}\nItems Count: ${itemsCount}`;
        } catch (error) {
            console.error(error);
            return `An error occurred while fetching data for ID: ${id}.`;
        }
    });

    Promise.all(responses).then((completed) => {
        const finalMessage = completed.join('\n______________________________\n');
        index.sendMessage(chatId, finalMessage);
    });
});