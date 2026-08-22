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
    console.warn('AI Chat fallback activated:', err);
    return 'أهلاً بك يا بطل! أنا المساعد الذكي لمس نشوى. يبدو أن هناك ضغطاً مؤقتاً على خادم الذكاء الاصطناعي، لكن لا تقلق، اسألني مجدداً وسأكون معك لشرح أي جزء في منهج العلوم المتكاملة! 🌸🔬';
  }
}

// --- Smart Local Fallbacks ---
function generateFallbackRecommendation(p: StudentRecommendationParams): string {
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

function generateFallbackQuiz(p: { topic: string; questionCount: number; difficulty: string }): GeneratedQuizResult {
  const sampleQuestions: GeneratedQuizQuestion[] = [
    {
      questionNumber: 1,
      questionText: `أي من العناصر التالية يلعب الدور الرئيسي في تنظيم العمليات الحيوية ونقل الطاقة داخل الخلية الحية؟`,
      options: ['أ) جزيئات ATP', 'ب) النيتروجين الجوي', 'ج) الهيليوم', 'د) كلوريد الصوديوم'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) جزيئات ATP',
      explanation: 'تعتبر جزيئات أدينوسين ثلاثي الفوسفات (ATP) هي عملة الطاقة الرئيسية في جميع الخلايا الحية.',
    },
    {
      questionNumber: 2,
      questionText: `ما هو الترتيب الصحيح لمستويات التنظيم البيئي من الأصغر إلى الأكبر؟`,
      options: [
        'أ) الفرد -> الجماعة -> المجتمع الحيوي -> النظام البيئي',
        'ب) النظام البيئي -> الفرد -> الجماعة',
        'ج) المجتمع الحيوي -> الفرد -> الغلاف الحيوي',
        'د) الجماعة -> الفرد -> النظام البيئي',
      ],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) الفرد -> الجماعة -> المجتمع الحيوي -> النظام البيئي',
      explanation: 'يبدأ التنظيم بالفرد ثم جماعة من نفس النوع ثم مجتمع حيوي من أنواع مختلفة ثم نظام بيئي يشمل العوامل الحية وغير الحية.',
    },
    {
      questionNumber: 3,
      questionText: `تتميز المياه بظاهرة الشذوذ المائي وارتفاع حرارتها النوعية، ما الفائدة البيئية الأبرز لهذه الخاصية؟`,
      options: [
        'أ) حماية الكائنات المائية من التجمد التام في المناطق القطبية',
        'ب) زيادة ملوحة البحار والمحيطات',
        'ج) تسريع عملية التبخر العشوائي',
        'د) منع وصول ضوء الشمس للأعماق',
      ],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) حماية الكائنات المائية من التجمد التام في المناطق القطبية',
      explanation: 'تمدد الماء عند درجة 4 مئوية يجعله أقل كثافة فيطفو الجليد على السطح ليعزل الماء السفلي ويحمي الحياة المائية.',
    },
    {
      questionNumber: 4,
      questionText: `أي التفاعلات الكيميائية الآتية تمثل العملية الأساسية لإنتاج الغذاء في النظم البيئية الأرضية؟`,
      options: ['أ) البناء الضوئي', 'ب) التخمر اللاهوائي', 'ج) الصدأ الكيميائي', 'د) الاحتراق الكامل'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) البناء الضوئي',
      explanation: 'عملية البناء الضوئي تحول الطاقة الضوئية إلى طاقة كيميائية مخزنة في الروابط العضوية لغذاء النبات.',
    },
    {
      questionNumber: 5,
      questionText: `عند انتقال الطاقة عبر المستويات الغذائية في السلسلة، ما النسبة التقريبية للطاقة التي تفقد كحرارة؟`,
      options: ['أ) حوالي 90%', 'ب) حوالي 10%', 'ج) حوالي 50%', 'د) لا تفقد أي طاقة'],
      correctOptionIndex: 0,
      correctAnswerText: 'أ) حوالي 90%',
      explanation: 'وفق قانون كفاءة الطاقة البيئية، ينتقل فقط نحو 10% من الطاقة إلى المستوى التالي ويفقد الباقي على هيئة حرارة ونشاط حيوي.',
    },
  ];

  return {
    title: `اختبار مادة العلوم المتكاملة: ${p.topic || 'المفاهيم العامة'}`,
    topic: p.topic || 'العلوم المتكاملة - الصف الأول الثانوي',
    academicYear: 'الصف الأول الثانوي',
    totalQuestions: Math.min(p.questionCount, sampleQuestions.length),
    maxScore: Math.min(p.questionCount, sampleQuestions.length) * 4,
    questions: sampleQuestions.slice(0, p.questionCount),
  };
}
