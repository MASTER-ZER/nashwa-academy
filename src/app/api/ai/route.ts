import { NextRequest, NextResponse } from 'next/server';

const AI_BASE_URL = process.env.AI_API_BASE_URL || 'https://api.bluesminds.com/v1';
const AI_API_KEY = process.env.AI_API_KEY || 'sk-5tyf1QBli0g53Zxtd7P6EELu3IdVOM5BiEokbv2SnhVf8mYL';

const CHAT_CASCADE_MODELS = [
  'gpt-4o',
  'gpt-5-mini',
  'meta/llama-3.1-8b-instruct',
  'nvidia/nemotron-mini-4b-instruct',
];

const REASONING_CASCADE_MODELS = [
  'gpt-4o',
  'meta/llama-3.1-8b-instruct',
  'gpt-5-mini',
];

async function callOpenAIWithCascade(
  messages: { role: string; content: string }[],
  candidateModels: string[] = CHAT_CASCADE_MODELS,
  temperature = 0.7
) {
  const endpoint = `${AI_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000); // 14s timeout per candidate

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: 1200,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const reply = json.choices?.[0]?.message?.content;
        if (reply && reply.trim().length > 0) {
          return reply.trim();
        }
      } else {
        const errorText = await res.text();
        console.warn(`Model ${model} returned HTTP ${res.status}:`, errorText);
      }
    } catch (err: any) {
      console.warn(`Model ${model} attempt failed (${err.message}), trying next candidate...`);
      lastError = err;
    }
  }

  throw lastError || new Error('All AI candidate models failed to respond');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, params } = body;

    // --- Action 1: Smart Teacher Recommendation for Student Report Card ---
    if (action === 'RECOMMENDATION') {
      const p = params;
      const systemPrompt = `أنت المعلمة مس نشوى، معلمة مادة العلوم المتكاملة للصف الأول الثانوي في مصر.
اكتب تقييماً تربوياً وتوصية واضحة ومباشرة لولي الأمر تعكس مستوى الطالب بدقة بناءً على البيانات التالية:
- اسم الطالب: ${p.studentName} (المجموعة: ${p.groupName})
- نسبة الحضور: ${p.attendanceRate}% (${p.attendedSessions} من أصل ${p.totalSessions} حصص)
- المعدل الأكاديمي العام: ${p.academicAverage}% (${p.averageGradeLabel})
- حالة الاشتراك: ${p.isSubscriptionPaid ? 'مسدد بالكامل' : 'مستحق'}
- تفاصيل الامتحانات: ${JSON.stringify(p.examsList || [])}

التعليمات:
1. اكتب فقرة واحدة موجزة ومؤثرة (بين 2 إلى 4 أسطر فقط).
2. إذا كانت قائمة تفاصيل الامتحانات فارغة أو المعدل الأكاديمي 0 (أي لم تُعقد امتحانات شهرية حتى الآن)، رحب بالطالب بكلمات تشجيعية لبداية دراسة المنهج وحثه على الالتزام والاستعداد للاختبارات القادمة دون ذكر أن مستواه ضعيف.
3. إذا كانت هناك امتحانات مرصودة، امدح نقاط القوة بحرارة إذا كان متميزاً، أو بين مواضع التحسين بلباقة إذا كانت الدرجات منخفضة.
4. لا تضع أي مقدمات فارغة أو عناوين مثل "السيد ولي الأمر"، ابدأ بالتقييم والتوجيه مباشرة.`;

      const recommendation = await callOpenAIWithCascade(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `اكتب توصية التقرير الشهري للطالب ${p.studentName}` },
        ],
        REASONING_CASCADE_MODELS,
        0.7
      );

      return NextResponse.json({ success: true, recommendation });
    }

    // --- Action 2: Science Quiz & Exam Generator ---
    if (action === 'GENERATE_QUIZ') {
      const { topic, questionCount = 5, difficulty = 'MEDIUM' } = params;

      const difficultyMap: Record<string, string> = {
        EASY: 'مباشر وتذكر للمفاهيم الأساسية',
        MEDIUM: 'فهم وتطبيق واستنتاج متوسط',
        HARD: 'مستويات تفكير عليا وحل مشكلات علمية',
        CHALLENGE: 'أسئلة تفوق وتحدي للأوائل',
      };

      const systemPrompt = `أنت موجه أول مادة العلوم المتكاملة للمرحلة الثانوية بوزارة التربية والتعليم في مصر.
المطلوب إنشاء اختبار تفاعلي عالي الجودة للدرس المطلوب.
الموضوع: "${topic}"
عدد الأسئلة: ${questionCount}
مستوى الصعوبة: ${difficultyMap[difficulty] || 'متوسط'}

يجب أن تكون مخرجاتك بتنسيق JSON الصارم فقط (بدون كود markdown خارجي وبدون أي نصوص إضافية) بالهيكل التالي:
{
  "title": "عنوان الاختبار",
  "topic": "${topic}",
  "academicYear": "الصف الأول الثانوي",
  "totalQuestions": ${questionCount},
  "maxScore": ${questionCount * 4},
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "نص السؤال العلمي الواضح",
      "options": ["أ) خيار 1", "ب) خيار 2", "ج) خيار 3", "د) خيار 4"],
      "correctOptionIndex": 0,
      "correctAnswerText": "أ) خيار 1",
      "explanation": "شرح علمي دقيق وموجز لسبب صحة هذه الإجابة"
    }
  ]
}`;

      const rawReply = await callOpenAIWithCascade(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `ولد الاختبار الآن حول: ${topic}` },
        ],
        REASONING_CASCADE_MODELS,
        0.5
      );

      // Clean markdown JSON wrapper if present
      let cleanJson = rawReply;
      if (cleanJson.includes('```json')) {
        cleanJson = cleanJson.replace(/```json\s*|\s*```/g, '');
      } else if (cleanJson.includes('```')) {
        cleanJson = cleanJson.replace(/```\s*|\s*```/g, '');
      }

      const parsedQuiz = JSON.parse(cleanJson.trim());
      return NextResponse.json({ success: true, quiz: parsedQuiz });
    }

    // --- Action 3: Student Science AI Chat Tutor ---
    if (action === 'CHAT_TUTOR') {
      const { messages, studentName } = params;

      const systemPrompt = `أنت "Master AI" (ماستر AI) - المعلم الرقمي والمساعد الذكي لمس نشوى لطلاب مادة "العلوم المتكاملة" للصف الأول الثانوي في مصر.
الطالب الذي يتحدث معك اسمه: ${studentName || 'البطل'}.

سماتك وأسلوبك:
1. أنت ودود، مشجع، محفز للتعلم، وتستخدم لمسات ترحيبية لطيفة باسم مس نشوى 🌸🔬.
2. تتقن منهج العلوم المتكاملة كاملاً: الكيمياء الحيوية، الطاقة وحفظها، المياه والبيئة المائية، الغلاف الجوي والتغيرات، النظم البيئية والتوازن، الخلية وعملياتها الحيوية.
3. تشرح بطريقة سقراطية ممتعة: خطوات منطقية، أمثلة وتطبيقات من واقع الحياة في مصر، واستخدام الرموز التعبيرية الهادفة.
4. إذا سألك الطالب عن حل مسألة، اشرح له القانون والخطوات وأعطه فرصة للتفكير بدلاً من إعطاء الناتج النهائي فوراً.
5. الإجابة تكون باللغة العربية الفصحى المبسطة الواضحة مع تنسيق جميل (نقاط، أرقام، فقرات قصيرة).`;

      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...(messages || []).map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      ];

      const reply = await callOpenAIWithCascade(formattedMessages, CHAT_CASCADE_MODELS, 0.7);
      return NextResponse.json({ success: true, reply });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/ai handler error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal AI Server Error',
      },
      { status: 500 }
    );
  }
}
