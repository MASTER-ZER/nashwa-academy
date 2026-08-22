export interface StudentRecommendationParams {
  studentName: string;
  studentCode: string;
  groupName: string;
  attendanceRate: number;
  attendedSessions: number;
  totalSessions: number;
  academicAverage: number;
  averageGradeLabel: string;
  isSubscriptionPaid: boolean;
  examsList: { title: string; score: number; maxScore: number; percentage: number }[];
}

export interface GeneratedQuizQuestion {
  questionNumber: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  correctAnswerText: string;
  explanation: string;
}

export interface GeneratedQuizResult {
  title: string;
  topic: string;
  academicYear: string;
  totalQuestions: number;
  maxScore: number;
  questions: GeneratedQuizQuestion[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Client helper to call our secure internal /api/ai route
export async function fetchAIRecommendation(params: StudentRecommendationParams): Promise<string> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RECOMMENDATION',
        params,
      }),
    });

    const data = await res.json();
    if (data.success && data.recommendation) {
      return data.recommendation;
    }
    throw new Error(data.error || 'Failed to generate recommendation');
  } catch (err) {
    console.warn('AI Recommendation fallback activated:', err);
    return generateFallbackRecommendation(params);
  }
}

export async function fetchAIQuiz(params: {
  topic: string;
  questionCount: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'CHALLENGE';
  maxScore?: number;
}): Promise<GeneratedQuizResult> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'GENERATE_QUIZ',
        params,
      }),
    });

    const data = await res.json();
    if (data.success && data.quiz) {
      return data.quiz;
    }
    throw new Error(data.error || 'Failed to generate quiz');
  } catch (err) {
    console.warn('AI Quiz generator fallback activated:', err);
    return generateFallbackQuiz(params);
  }
}

export async function fetchStudentAIChat(params: {
  messages: ChatMessage[];
  studentName: string;
}): Promise<string> {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CHAT_TUTOR',
        params,
      }),
    });

    const data = await res.json();
    if (data.success && data.reply) {
      return data.reply;
    }
    throw new Error(data.error || 'Failed to get chat reply');
  } catch (err) {
    return 'أهلاً بك يا بطل! أنا Master AI - المساعد الذكي لمس نشوى. يبدو أن هناك ضغطاً مؤقتاً على خادم الذكاء الاصطناعي، لكن لا تقلق، اسألني مجدداً وسأكون معك لشرح أي جزء في منهج العلوم المتكاملة! 🌸🔬';
  }
}

// --- Smart Local Fallbacks ---
function generateFallbackRecommendation(p: StudentRecommendationParams): string {
  if (!p.examsList || p.examsList.length === 0 || p.academicAverage === 0) {
    return `نرحب بالطالب (${p.studentName}) في بداية دراسة منهج العلوم المتكاملة 🌸. لم تُعقد اختبارات شهرية حتى الآن، ونحثه على الالتزام بحضور الحصص والتفوق في الاختبارات القادمة.`;
  }
  if (p.academicAverage >= 85 && p.attendanceRate >= 80) {
    return `طالب متميز وملتزم للغاية بحضور الحصص ومتابعة التدريبات. أداؤه يعكس فهماً عميقاً لمفاهيم مادة العلوم المتكاملة. نوصي بالاستمرار على هذا المستوى الرائع للمنافسة على المركز الأول.`;
  }
  if (p.academicAverage >= 70) {
    return `مستوى الطالب جيد جداً وهناك استيعاب طيب للمنهج. يحتاج إلى مزيد من التركيز في التطبيقات الحسابية وحل تدريبات الدروس بانتظام لتحقيق الدرجة النهائية.`;
  }
  if (p.attendanceRate < 75) {
    return `يُرجى من ولي الأمر متابعة انتظام حضور الطالب للحصص، حيث يؤثر الغياب على فهم تسلسل الموضوعات العلمية. تم وضع خطة تعويضية لرفع مستواه في الاختبارات القادمة.`;
  }
  return `الطالب يحتاج إلى زيادة ساعات المذاكرة وحل الواجبات الأسبوعية بتركيز أكبر، ونحن حريصون على متابعته خطوة بخطوة للوصول إلى المستوى المطلوب.`;
}

function generateFallbackQuiz(p: { topic: string; questionCount: number; difficulty: string; maxScore?: number }): GeneratedQuizResult {
  const masterMinistryBank: GeneratedQuizQuestion[] = [
    {
      questionNumber: 1,
      questionText: 'أي من الجزيئات البيولوجية التالية تُعد هي العملة الرئيسية لنقل وتخزين الطاقة الحيوية في الخلايا؟',
      options: ['أ) جزيئات ATP', 'ب) النيتروجين الجوي', 'ج) حمض الهيدروكلوريك', 'د) السليلوز النباتي'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) جزيئات ATP',
      explanation: 'أدينوسين ثلاثي الفوسفات (ATP) هو الحامل والموزع الأساسي للطاقة في جميع خلايا الكائنات الحية.',
    },
    {
      questionNumber: 2,
      questionText: 'ما الترتيب الصحيح لمستويات التنظيم في النظام البيئي وفق منهج العلوم المتكاملة؟',
      options: [
        'أ) الكائن الحي ➔ الجماعة الإحيائية ➔ المجتمع الحيوي ➔ النظام البيئي',
        'ب) النظام البيئي ➔ المجتمع الحيوي ➔ الجماعة الإحيائية',
        'ج) الغلاف الحيوي ➔ المجتمع الحيوي ➔ الكائن الحي',
        'د) الجماعة الإحيائية ➔ الكائن الحي ➔ النظام البيئي',
      ],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) الكائن الحي ➔ الجماعة الإحيائية ➔ المجتمع الحيوي ➔ النظام البيئي',
      explanation: 'يبدأ التنظيم بالكائن الفردي، ومجموعة الأفراد من نفس النوع تشكل جماعة، والمجتمعات المتفاعلة تشكل نظاماً بيئياً.',
    },
    {
      questionNumber: 3,
      questionText: 'تتميز المياه بارتفاع حرارتها النوعية وظاهرة الشذوذ المائي، ما الأثر البيئي الحيوي الأهم لذلك؟',
      options: [
        'أ) حماية الكائنات المائية من التجمد الكلي في المسطحات القطبية',
        'ب) تسريع معدل بخر المحيطات في الشتاء',
        'ج) زيادة تركيز الأملاح المعدنية السطحية',
        'د) منع نفاذ أشعة الشمس إلى القاع المائي',
      ],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) حماية الكائنات المائية من التجمد الكلي في المسطحات القطبية',
      explanation: 'عند انخفاض درجة الحرارة دون 4°م تقل كثافة الماء ويطفو الجليد عازلاً الطبقات السفلية السائلة لحفظ الحياة المائية.',
    },
    {
      questionNumber: 4,
      questionText: 'أي من التفاعلات البيوكيميائية التالية تمثل المدخل الأساسي للطاقة في الأنظمة البيئية الحية؟',
      options: ['أ) البناء الضوئي', 'ب) التخمر اللبني', 'ج) أكسدة الحديد', 'د) التحلل العضوي النهائي'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) البناء الضوئي',
      explanation: 'البناء الضوئي يقتنص الطاقة الضوئية من الشمس ويحولها إلى طاقة كيميائية مخزنة بروابط السكريات.',
    },
    {
      questionNumber: 5,
      questionText: 'عند انتقال الطاقة من مستوى غذائي إلى المستوى الذي يليه في هرم الطاقة، ما النسبة المفقودة تقريباً على هيئة حرارة؟',
      options: ['أ) نحو 90%', 'ب) نحو 10%', 'ج) نحو 50%', 'د) لا يوجد أي فقد للطاقة'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) نحو 90%',
      explanation: 'ينتقل نحو 10% فقط من الطاقة للكتلة الحية في المستوى التالي، بينما يفقد الباقي كحرارة ونشاط حيوي.',
    },
    {
      questionNumber: 6,
      questionText: 'ما الوحدة البنائية الأساسية للأحماض النووية (DNA و RNA) المسؤولة عن نقل الصفات الوراثية؟',
      options: ['أ) النيوكليوتيدة', 'ب) الحمض الأميني', 'ج) الجلوكوز', 'د) الحمض الدهني'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) النيوكليوتيدة',
      explanation: 'تتكون الأحماض النووية من ارتباط سلاسل طويلة من النيوكليوتيدات (سكر خماسي، قاعدة نيتروجينية، مجموعة فوسفات).',
    },
    {
      questionNumber: 7,
      questionText: 'أي من الغازات التالية يُعد المسبب الرئيسي لظاهرة الاحتباس الحراري والتغيرات المناخية عند زيادته في الغلاف الجوي؟',
      options: ['أ) ثاني أكسيد الكربون (CO2) والميثان', 'ب) النيتروجين (N2)', 'ج) الأكسجين (O2)', 'د) الأرجون (Ar)'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) ثاني أكسيد الكربون (CO2) والميثان',
      explanation: 'غازات الدفيئة مثل ثاني أكسيد الكربون والميثان تحبس الإشعاع الحراري تحت الحمراء في التروبوسفير مما يرفع حرارة الأرض.',
    },
    {
      questionNumber: 8,
      questionText: 'ما العضية الخلوية المسؤولة عن التنفس الخلوي الهوائي وتوليد الغالبية العظمى من جزيئات ATP؟',
      options: ['أ) الميتوكوندريا', 'ب) الريبوسومات', 'ج) جهاز جولجي', 'د) الجدار الخلوي'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) الميتوكوندريا',
      explanation: 'تعتبر الميتوكوندريا مصانع توليد الطاقة في الخلية لاحتوائها على إنزيمات دورة كريبس وسلسلة نقل الإلكترون.',
    },
    {
      questionNumber: 9,
      questionText: 'تتميز الإنزيمات بكونها عوامل حفازة بيولوجية، فكيف تزيد من سرعة التفاعلات الأيضية داخل الخلية؟',
      options: ['أ) بخفض طاقة التنشيط اللازمة للتفاعل', 'ب) برفع درجة حرارة الخلية', 'ج) بزيادة استهلاك ATP', 'د) بتغيير النواتج النهائية'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) بخفض طاقة التنشيط اللازمة للتفاعل',
      explanation: 'تعمل الإنزيمات على تقليل طاقة التنشيط (Activation Energy) مما يجعل التفاعل الحيوي يتم بسرعة وكفاءة في درجة حرارة الجسم.',
    },
    {
      questionNumber: 10,
      questionText: 'في دورة الكربون البيئية، ما العملية الطبيعية التي تعمل على سحب ثاني أكسيد الكربون من الغلاف الجوي وتثبيته؟',
      options: ['أ) البناء الضوئي بالنباتات والطحالب', 'ب) احتراق الوقود الحفري', 'ج) تنفس الحيوانات', 'د) النشاط البركاني'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) البناء الضوئي بالنباتات والطحالب',
      explanation: 'تقوم الكائنات المنتجة بامتصاص CO2 الجوي وتحويله لمركبات عضوية كربونية عبر عملية البناء الضوئي.',
    },
    {
      questionNumber: 11,
      questionText: 'ما الرابطة الكيميائية التساهمية التي تربط الأحماض الأمينية معاً لتكوين سلاسل عديد الببتيد والبروتينات؟',
      options: ['أ) الرابطة الببتيدية', 'ب) الرابطة الجليكوسيدية', 'ج) الرابطة الهيدروجينية', 'د) الرابطة الفلزية'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) الرابطة الببتيدية',
      explanation: 'تتكون الرابطة الببتيدية بين مجموعة الكربوكسيل لأحد الأحماض الأمينية ومجموعة الأمين للحمض المجاور مع نزع جزيء ماء.',
    },
    {
      questionNumber: 12,
      questionText: 'أي طبقات الغلاف الجوي تحتوي على طبقة الأوزون التي تمتص الأشعة فوق البنفسجية الضارة وتمنع وصولها للأرض؟',
      options: ['أ) الستراتوسفير (Stratosphere)', 'ب) التروبوسفير (Troposphere)', 'ج) الميزوسفير (Mesosphere)', 'د) الثرموسفير (Thermosphere)'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) الستراتوسفير (Stratosphere)',
      explanation: 'تقع طبقة الأوزون في الجزء السفلي من الستراتوسفير (بين 20 و 30 كم تقريباً) وتحمي الحياة من الـ UV-B والـ UV-C.',
    },
  ];

  const count = Number(p.questionCount) || 5;
  const targetMax = Number(p.maxScore) || (count * 4);

  // Pick count questions
  let selected = masterMinistryBank.slice(0, count);
  if (selected.length < count) {
    // Duplicate & adjust numbers if extra needed
    while (selected.length < count) {
      const idx = selected.length % masterMinistryBank.length;
      const base = masterMinistryBank[idx];
      selected.push({
        ...base,
        questionNumber: selected.length + 1,
      });
    }
  }

  // Ensure 1-based sequential question numbering
  selected = selected.map((q, i) => ({ ...q, questionNumber: i + 1 }));

  return {
    title: `اختبار مادة العلوم المتكاملة: ${p.topic || 'المفاهيم العامة'}`,
    topic: p.topic || 'العلوم المتكاملة - الصف الأول الثانوي',
    academicYear: 'الصف الأول الثانوي',
    totalQuestions: count,
    maxScore: targetMax,
    questions: selected,
  };
}

