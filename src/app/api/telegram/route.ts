import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentMonthLabel } from '@/lib/storage';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8897471175:AAH__IM1R9Ro2yYdClmtZ_X4TvzFZsr5uUs';
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '6602868710';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'nashwa_secret_webhook_token_2026';

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function answerCallbackQuery(callbackQueryId: string, text: string, showAlert: boolean = true) {
  if (!TELEGRAM_BOT_TOKEN) return;
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
  if (!TELEGRAM_BOT_TOKEN) return;
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
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 });
  }

  // Security Check 1: Verify Webhook Secret Token Header if set
  if (TELEGRAM_WEBHOOK_SECRET) {
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
    if (secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
      console.warn('Unauthorized telegram webhook attempt. Invalid secret token.');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const body = await req.json();

    // 1. Handle Callback Queries (Approve / Reject Buttons)
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const callbackData = callbackQuery.data || '';
      const message = callbackQuery.message;
      const chatId = String(message.chat.id);
      const messageId = message.message_id;
      const originalText = message.text || '';

      // Security Check 2: Verify caller is Admin Chat
      if (TELEGRAM_ADMIN_CHAT_ID && chatId !== TELEGRAM_ADMIN_CHAT_ID) {
        console.warn('Unauthorized user clicked callback button:', chatId);
        await answerCallbackQuery(callbackQuery.id, 'عذراً، هذا الإجراء مخصص لمس نشوى فقط 🔒', true);
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      }

      const parts = callbackData.split(':');
      const action = parts[0];
      const studentId = parts[1];
      const studentCode = parts[2] || '';
      const safeCode = escapeHtml(studentCode);

      if (action === 'approve' || action === 'approve_paid' || action === 'approve_unpaid') {
        const isPaid = action === 'approve_paid';
        const currentMonth = getCurrentMonthLabel();

        // Update Supabase
        if (supabase) {
          await supabase
            .from('students')
            .update({
              status: 'ACTIVE',
              approved_at: new Date().toISOString(),
            })
            .eq('id', studentId);

          // Add Month subscription (250 EGP)
          const monthSlug = currentMonth.replace(/\s+/g, '-');
          await supabase.from('subscriptions').upsert(
            {
              id: `sub-${studentId}-${monthSlug}`,
              student_id: studentId,
              month: currentMonth,
              amount: 250.0,
              is_paid: isPaid,
              paid_at: isPaid ? new Date().toISOString() : null,
              received_by: isPaid ? 'مس نشوى' : null,
            },
            { onConflict: 'id' }
          );
        }

        const successText = isPaid
          ? `تم قبول الطالب وتفعيل كارت الحضور رقم #${safeCode} وتأكيد اشتراك ${currentMonth} (مدفوع) بنجاح! 🎉`
          : `تم قبول الطالب وتفعيل كارت الحضور رقم #${safeCode} (الاشتراك معلق لحين الحضور) بنجاح! 🌸`;

        await answerCallbackQuery(callbackQuery.id, successText, true);

        const updatedText = `${originalText}\n\n✅ <b>تم اعتماد وقبول الطالب بواسطة المس نشوى</b> (${isPaid ? 'الاشتراك مدفوع ✅' : 'الاشتراك معلق ⏳'}) - ${new Date().toLocaleTimeString('ar-EG')}`;
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

        await answerCallbackQuery(callbackQuery.id, `تم رفض طلب تسجيل الطالب #${safeCode}`, false);

        const updatedText = `${originalText}\n\n❌ <b>تم رفض طلب الطالب بواسطة المس نشوى</b>`;
        await editMessageText(chatId, messageId, updatedText);

        return NextResponse.json({ ok: true });
      }

      // --- 1.1 Approve Profile Edit Request ---
      if (action === 'approve_edit') {
        const reqId = parts[1];
        if (supabase) {
          // Fetch request details
          const { data: editReq } = await supabase
            .from('profile_edit_requests')
            .select('*')
            .eq('id', reqId)
            .maybeSingle();

          if (editReq && editReq.proposed_data) {
            const proposed = editReq.proposed_data;
            await supabase
              .from('students')
              .update({
                name: proposed.name,
                phone: proposed.phone,
                parent_name: proposed.parentName,
                parent_phone: proposed.parentPhone,
                address: proposed.address,
                birth_date: proposed.birthDate,
                photo_url: proposed.photoUrl,
                group_id: proposed.groupId,
              })
              .eq('id', editReq.student_id);

            await supabase
              .from('profile_edit_requests')
              .update({
                status: 'APPROVED',
                reviewed_at: new Date().toISOString(),
              })
              .eq('id', reqId);
          }
        }

        await answerCallbackQuery(
          callbackQuery.id,
          'تم اعتماد وتحديث بيانات الطالب بنجاح! 🌸✅',
          true
        );

        const updatedText = `${originalText}\n\n✅ <b>تم قبول واعتماد تعديل البيانات بواسطة مس نشوى 🌸</b> (${new Date().toLocaleTimeString('ar-EG')})`;
        await editMessageText(chatId, messageId, updatedText);

        return NextResponse.json({ ok: true });
      }

      // --- 1.2 Reject Profile Edit Request ---
      if (action === 'reject_edit') {
        const reqId = parts[1];
        if (supabase) {
          await supabase
            .from('profile_edit_requests')
            .update({
              status: 'REJECTED',
              reviewed_at: new Date().toISOString(),
            })
            .eq('id', reqId);
        }

        await answerCallbackQuery(
          callbackQuery.id,
          'تم رفض طلب تعديل البيانات ❌',
          false
        );

        const updatedText = `${originalText}\n\n❌ <b>تم رفض طلب تعديل البيانات بواسطة مس نشوى</b>`;
        await editMessageText(chatId, messageId, updatedText);

        return NextResponse.json({ ok: true });
      }
    }

    // 2. Handle Direct Commands (/start, /stats, /link)
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
