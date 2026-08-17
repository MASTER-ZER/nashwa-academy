const https = require('https');

const token = '8897471175:AAH__IM1R9Ro2yYdClmtZ_X4TvzFZsr5uUs';
const chatId = '6602868710';

https.get(`https://api.telegram.org/bot${token}/getMe`, (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => {
    console.log('Bot info:', JSON.parse(data));
  });
});
