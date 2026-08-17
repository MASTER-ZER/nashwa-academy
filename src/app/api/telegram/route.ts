import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8897471175:AAH__IM1R9Ro2yYdClmtZ_X4TvzFZsr5uUs';

async function answerCallbackQuery(callbackQueryId: string, text: string, showAlert: boolean = true) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
  } catch (err) {
    console.error('Error answering callback query', err);
  }
}

async function editMessageText(chatId: number | string, messageId: number, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error('Error editing message', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Handle Callback Queries (Button Clicks)
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const callbackData = callbackQuery.data; // e.g. "approve:std-123:104" or "reject:std-123:104"
      const message = callbackQuery.message;
      const chatId = message.chat.id;
      const messageId = message.message_id;
      const originalText = message.text || '';

      const parts = callbackData.split(':');
      const action = parts[0];
      const studentId = parts[1];
      const studentCode = parts[2] || '';

      if (action === 'approve') {
        // Update Supabase
        if (supabase) {
          await supabase
            .from('students')
            .update({
              status: 'ACTIVE',
              approved_at: new Date().toISOString(),
            })
            .eq('id', studentId);

          // Add October subscription (250 EGP)
          await supabase.from('subscriptions').upsert(
            {
              id: `sub-${studentId}-oct-2026`,
              student_id: studentId,
              month: 'أكتوبر 2026',
              amount: 250.0,
              is_paid: false,
            },
            { onConflict: 'id' }
          );
        }

        await answerCallbackQuery(
          callbackQuery.id,
          `تم قبول الطالب وتفعيل كارت الحضور رقم #${studentCode} بنجاح! 🎉`,
          true
        );

        const updatedText = `${originalText}\n\n✅ <b>تم اعتماد وقبول الطالب بنجاح بواسطة المس نشوى</b> (${new Date().toLocaleTimeString(
          'ar-EG'
        )})`;
        await editMessageText(chatId, messageId, updatedText);

        return NextResponse.json({ ok: true });
      }

      if (action === 'reject') {
        if (supabase) {
          await supabase
            .from('students')
            .update({ status: 'SUSPENDED' })
            .eq('id', studentId);
        }

        await answerCallbackQuery(callbackQuery.id, `تم رفض طلب تسجيل الطالب #${studentCode}`, false);

        const updatedText = `${originalText}\n\n❌ <b>تم رفض طلب الطالب بواسطة المس نشوى</b>`;
        await editMessageText(chatId, messageId, updatedText);

        return NextResponse.json({ ok: true });
      }
    }

    // 2. Handle Direct Messages / Commands
    if (body.message) {
      const message = body.message;
      const text = message.text?.trim() || '';
      const chatId = message.chat.id;

      if (text === '/start') {
        const welcomeText = `
🌸 <b>أهلاً بكِ مس نشوى في بوت الأكاديمية الذكي!</b> 🌸

تم ربط البوت بنجاح بنظام المنصة وقاعدة البيانات السحابية.
📲 ستصلكِ هنا إشعارات فورية بكل طالب يقوم بملء استمارة التقديم مع أزرار للقبول أو الرفض بنقرة واحدة!

💡 <b>الأوامر المتاحة:</b>
• <code>/stats</code> : عرض إحصائيات الطلاب والاشتراكات الحالية.
• <code>/link</code> : رابط المنصة المباشر.
`;
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeText,
            parse_mode: 'HTML',
          }),
        });
        return NextResponse.json({ ok: true });
      }

      if (text === '/stats') {
        let statsText = '📊 <b>إحصائيات المنصة الحالية:</b>\n';
        if (supabase) {
          const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
          const { count: activeCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');
          const { count: pendingCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'PENDING');
          const { count: paidCount } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('is_paid', true);

          statsText += `
• إجمالي الطلاب: <b>${studentCount || 0}</b>
• الطلاب المعتمدين: <b>${activeCount || 0}</b>
• طلبات بانتظار الاعتماد: <b>${pendingCount || 0}</b>
• الاشتراكات المسددة: <b>${paidCount || 0}</b> (قيمة الاشتراك: 250 ج.م)
`;
        }
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: statsText,
            parse_mode: 'HTML',
          }),
        });
        return NextResponse.json({ ok: true });
      }

      if (text === '/link') {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🌐 <b>رابط منصة مس نشوى المباشر:</b>\nhttps://nashwa-academy.vercel.app`,
            parse_mode: 'HTML',
          }),
        });
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram webhook handler error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Telegram Webhook is Active',
    bot: '@MissNashwa_bot',
    timestamp: new Date().toISOString(),
  });
}
