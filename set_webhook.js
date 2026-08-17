const https = require('https');

const token = '8897471175:AAH__IM1R9Ro2yYdClmtZ_X4TvzFZsr5uUs';
const webhookUrl = 'https://nashwa-academy.vercel.app/api/telegram';

https.get(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`, (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => {
    console.log('Webhook set result:', JSON.parse(data));
  });
});
