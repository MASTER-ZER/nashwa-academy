const https = require('https');

const token = '8897471175:AAH__IM1R9Ro2yYdClmtZ_X4TvzFZsr5uUs';
const chatId = '6602868710';

const message = {
  chat_id: chatId,
  text: `🌸 *أكاديمية مس نشوى - تم تفعيل البوت بنجاح!* 🚀\n\nستصلك كافة استمارات تسجيل الطلاب الجدد هنا مع إمكانية القبول والرفض بنقرة واحدة!`,
  parse_mode: 'Markdown',
};

const data = JSON.stringify(message);

const req = https.request({
  hostname: 'api.telegram.org',
  path: `/bot${token}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
}, (res) => {
  let body = '';
  res.on('data', (c) => body += c);
  res.on('end', () => {
    console.log('Send result:', JSON.parse(body));
  });
});

req.write(data);
req.end();
