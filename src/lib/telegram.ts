import { Student, Group } from '@/types';
import { db } from './storage';

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const DEFAULT_BOT_TOKEN = '8897471175:AAH__IM1R9Ro2yYdClmtZ_X4TvzFZsr5uUs';
const DEFAULT_ADMIN_CHAT_ID = '6602868710';

function getTelegramCredentials() {
  let botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_ADMIN_CHAT_ID || DEFAULT_ADMIN_CHAT_ID;

  if (typeof window !== 'undefined') {
    try {
      const currentSettings = db.getSettings();
      if (currentSettings.telegramBotToken) botToken = currentSettings.telegramBotToken;
      if (currentSettings.telegramAdminChatId) chatId = currentSettings.telegramAdminChatId;
    } catch {}
  }
  return { botToken, chatId };
}

export async function sendTelegramMessage(text: string, replyMarkup?: any): Promise<boolean> {
  const { botToken, chatId } = getTelegramCredentials();

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
    const result = await res.json();
    return result.ok;
  } catch (error) {
    console.error('Telegram notification error:', error);
    return false;
  }
}

export async function sendTelegramPhoto(photoBase64: string, caption: string, replyMarkup?: any): Promise<boolean> {
  const { botToken, chatId } = getTelegramCredentials();

  try {
    // If it's a data URL, convert to Blob
    if (photoBase64.startsWith('data:image/')) {
      const parts = photoBase64.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });

      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, 'student_photo.jpg');
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
      if (replyMarkup) {
        formData.append('reply_markup', JSON.stringify(replyMarkup));
      }

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.ok) return true;
    }
  } catch (err) {
    console.warn('sendPhoto failed, falling back to message:', err);
  }

  // Fallback to regular text message
  return sendTelegramMessage(caption, replyMarkup);
}

export async function notifyNewStudentRegistration(student: Student, group?: Group | null) {
  const groupName = group ? group.name : 'غير محدد';
  const cleanParentPhone = student.parentPhone.replace(/\D/g, '').replace(/^0/, '20');

  const safeStudentName = escapeHtml(student.name);
  const safeStudentCode = escapeHtml(student.code);
  const safeStudentPhone = escapeHtml(student.phone);
  const safeParentName = escapeHtml(student.parentName);
  const safeParentPhone = escapeHtml(student.parentPhone);
  const safeAddress = escapeHtml(student.address || 'غير مسجل');
  const safeBirthDate = escapeHtml(student.birthDate || 'غير مسجل');
  const safeGroupName = escapeHtml(groupName);

  const messageText = `
🌸 <b>طلب تسجيل طالب جديد في الأكاديمية!</b> 🌸

👤 <b>اسم الطالب:</b> ${safeStudentName}
🔢 <b>الكود المقترح:</b> <code>#${safeStudentCode}</code>
🎂 <b>تاريخ الميلاد:</b> <code>${safeBirthDate}</code>
📞 <b>هاتف الطالب:</b> <code>${safeStudentPhone}</code>
👨‍👦 <b>ولي الأمر:</b> ${safeParentName} (<code>${safeParentPhone}</code>)
📍 <b>العنوان:</b> ${safeAddress}
⏰ <b>المجموعة:</b> ${safeGroupName}
📅 <b>تاريخ التقديم:</b> ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}

💵 <b>الاشتراك الشهري:</b> 250 جنيه مصري
`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '✅ قبول الطالب وتفعيل الكود',
          callback_data: `approve:${student.id}:${student.code}`,
        },
        {
          text: '❌ رفض الطلب',
          callback_data: `reject:${student.id}:${student.code}`,
        },
      ],
      [
        {
          text: '💬 واتساب ولي الأمر',
          url: `https://wa.me/${cleanParentPhone}?text=${encodeURIComponent(
            `أهلاً بحضرتك أستاذ ${student.parentName}، بخصوص طلب تسجيل الطالب (${student.name}) في أكاديمية مس نشوى للعلوم المتكاملة 🌸`
          )}`,
        },
      ],
    ],
  };

  if (student.photoUrl) {
    return sendTelegramPhoto(student.photoUrl, messageText, inlineKeyboard);
  }

  return sendTelegramMessage(messageText, inlineKeyboard);
}

export async function notifyStudentProfileUpdate(
  student: Student,
  group?: Group | null
) {
  const groupName = group ? group.name : 'غير محدد';
  const cleanParentPhone = student.parentPhone.replace(/\D/g, '').replace(/^0/, '20');

  const safeStudentName = escapeHtml(student.name);
  const safeStudentCode = escapeHtml(student.code);
  const safeStudentPhone = escapeHtml(student.phone);
  const safeParentName = escapeHtml(student.parentName);
  const safeParentPhone = escapeHtml(student.parentPhone);
  const safeAddress = escapeHtml(student.address || 'غير مسجل');
  const safeBirthDate = escapeHtml(student.birthDate || 'غير مسجل');
  const safeGroupName = escapeHtml(groupName);

  const messageText = `
✏️ <b>إشعار تحديث بيانات طالب (#${safeStudentCode})</b> 🌸

👤 <b>اسم الطالب:</b> ${safeStudentName}
🔢 <b>كود الطالب:</b> <code>#${safeStudentCode}</code>
🎂 <b>تاريخ الميلاد:</b> <code>${safeBirthDate}</code>
📞 <b>هاتف الطالب:</b> <code>${safeStudentPhone}</code>
👨‍👦 <b>ولي الأمر:</b> ${safeParentName} (<code>${safeParentPhone}</code>)
📍 <b>العنوان:</b> ${safeAddress}
⏰ <b>المجموعة:</b> ${safeGroupName}
🕒 <b>وقت التعديل:</b> ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}
`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: '📂 فتح لوحة تحكم الطلاب',
          url: 'https://nashwa-academy.vercel.app/dashboard/students',
        },
        {
          text: '💬 واتساب ولي الأمر',
          url: `https://wa.me/${cleanParentPhone}?text=${encodeURIComponent(
            `أهلاً بحضرتك أستاذ ${student.parentName}، تم استلام تحديث بيانات الطالب (${student.name}) في أكاديمية مس نشوى 🌸`
          )}`,
        },
      ],
    ],
  };

  if (student.photoUrl) {
    return sendTelegramPhoto(student.photoUrl, messageText, inlineKeyboard);
  }

  return sendTelegramMessage(messageText, inlineKeyboard);
}

