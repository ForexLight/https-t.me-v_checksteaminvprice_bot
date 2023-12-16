const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();


// Замініть 'YOUR_TELEGRAM_BOT_TOKEN' на токен вашого бота, який ви отримали від BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Hello!');
});
bot.on('message', async (msg) => {

    const chatId = msg.chat.id;
    const ids = msg.text.split('\n'); // Розділяємо вхідний текст на окремі ID

    if (msg.text.toString().toLowerCase() === '/start') {
        return;
    }

    let responses = ids.map(async (id) => {
        try {
            const response = await axios.get(`https://csgobackpack.net/index.php?nick=${id}&g-recaptcha-response=&action=validate_captcha&currency=USD`);
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
        bot.sendMessage(chatId, finalMessage);
    });
});