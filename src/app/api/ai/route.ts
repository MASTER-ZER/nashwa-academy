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
      const qCount = Number(params.questionCount) || 5;
      const topic = params.topic || 'العلوم المتكاملة';
      const difficulty = params.difficulty || 'MEDIUM';
      const targetMaxScore = Number(params.maxScore) || (qCount * 4);

      const difficultyMap: Record<string, string> = {
        EASY: 'مباشر وتذكر للمفاهيم الأساسية وتطبيقاتها الأولية',
        MEDIUM: 'فهم وتطبيق واستنتاج وربط بين فروع العلوم المتكاملة',
        HARD: 'مستويات تفكير عليا وتحليل وحل مشكلات بيئية وحيوية',
        CHALLENGE: 'أسئلة تفوق وتحدي للأوائل وربط عميق بين الطاقة والمادة',
      };

      const systemPrompt = `أنت الخبير الأول والموجه العام لمادة "العلوم المتكاملة" (Integrated Sciences) للصف الأول الثانوي بوزارة التربية والتعليم المصرية (المنهج الوزاري الحديث المعتمد).

🎯 مهمتك: إنشاء اختبار علمي نموذجي متكامل وعالي الدقة وفق المنهج الوزاري المصري المعتمد حصراً.

📚 مواضيع ومحاور منهج العلوم المتكاملة للصف الأول الثانوي:
1. [المحور الأول: الاستدامة والحياة]:
   - النظام البيئي المائي والأنظمة البيئية (العوامل الحية وغير الحية، التكيف).
   - السلاسل والشبكات الغذائية، تدوير المادة (دورة الكربون والنيتروجين والماء).
   - الغلاف الجوي، التغيرات المناخية، الاحتباس الحراري، التلوث البيئي واستدامة الموارد.
2. [المحور الثاني: الطاقة والمادة في النظم الحية]:
   - الكيمياء الحيوية (الكربوهيدرات، الليبيدات، البروتينات، الأحماض النووية DNA و RNA).
   - الخلية وعضياتها، الأيض الخلوي والإنزيمات، التنفس الخلوي وإنتاج جزيئات ATP.
   - عملية البناء الضوئي في النباتات وتفاعلات الضوء والظلام.
   - قوانين حفظ الطاقة وتطبيقات الديناميكا الحرارية في الكائنات الحية.

⚠️ تعليمات صارمة جداً:
1. عدد الأسئلة المطلوب بالضبط: (${qCount}) أسئلة. يجب أن يحتوي مصفوفة questions على (${qCount}) عنصراً تماماً دون زيادة أو نقصان.
2. الدرجة الكلية للاختبار: (${targetMaxScore}) درجة.
3. التزم حصراً بمنهج الصف الأول الثانوي للعلوم المتكاملة. لا تضع أي أسئلة فيزياء أو كيمياء قديمة ملغاة من مناهج السنوات السابقة.
4. كل سؤال يحتوي على 4 خيارات حصرية وواضحة (أ، ب، ج، د)، مع تحديد الفهرس الصحيح (0 إلى 3) وشرح علمي مبسط وواضح لسبب الإجابة.
5. يجب أن تكون المخرجات JSON صالحاً وصارماً بنسبة 100% بدون أي كود markdown أو نصوص خارج أقواس الـ JSON.

الهيكل المطلوب:
{
  "title": "اختبار مادة العلوم المتكاملة: ${topic}",
  "topic": "${topic}",
  "academicYear": "الصف الأول الثانوي",
  "totalQuestions": ${qCount},
  "maxScore": ${targetMaxScore},
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "نص السؤال الدقيق من المنهج",
      "options": ["أ) خيار 1", "ب) خيار 2", "ج) خيار 3", "د) خيار 4"],
      "correctOptionIndex": 0,
      "correctAnswerText": "أ) خيار 1",
      "explanation": "شرح علمي دقيق لسبب صحة الإجابة"
    }
  ]
}`;

      const rawReply = await callOpenAIWithCascade(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `ولد الاختبار الآن حول موضوع: ${topic} بعدد ${qCount} أسئلة ودرجة كلية ${targetMaxScore}.` },
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
      parsedQuiz.totalQuestions = parsedQuiz.questions?.length || qCount;
      parsedQuiz.maxScore = targetMaxScore;
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
