// ✅ OpenRouter — يستخدم fetch مباشرة (متوافق 100% مع المتصفح)
// بنفس نمط الكود المُقدَّم بالضبط

export const DEFAULT_OPENROUTER_KEY = "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";

// ✅ النموذج الافتراضي
export const OPENROUTER_MODEL = "openai/gpt-oss-120b:free";

// ✅ نماذج متاحة للاختيار في Admin
export const OPENROUTER_MODELS = [
  { id: "openai/gpt-oss-120b:free",                  label: "GPT-OSS 120B (مجاني) ⚡",          free: true },
  { id: "google/gemini-2.5-flash-preview:free",       label: "Gemini 2.5 Flash (مجاني) 🔥",      free: true },
  { id: "google/gemini-2.5-pro-preview:free",         label: "Gemini 2.5 Pro (مجاني) 🧠",        free: true },
  { id: "meta-llama/llama-4-maverick:free",           label: "Llama 4 Maverick (مجاني) 🦙",      free: true },
  { id: "deepseek/deepseek-r1:free",                  label: "DeepSeek R1 (مجاني) 🔍",           free: true },
  { id: "microsoft/mai-ds-r1:free",                   label: "Microsoft MAI DS R1 (مجاني) 💠",   free: true },
];

// ✅ System instruction افتراضية بالعربية للأستاذ الجزائري
const DEFAULT_SYSTEM = `أنت أستاذ افتراضي ذكي ومتخصص لمساعدة تلاميذ البكالوريا في الجزائر.
أجب دائماً باللغة العربية الفصحى الواضحة.
استخدم الترقيم والنقاط لتوضيح الأفكار.
اذكر القوانين والمعادلات بوضوح.
كن مشجعاً وإيجابياً مع التلميذ.
اجعل الشرح تدريجياً من السهل إلى الصعب.`;

const OR_BASE = "https://openrouter.ai/api/v1";

function getHeaders(apiKey?: string) {
  return {
    "Authorization": `Bearer ${apiKey || DEFAULT_OPENROUTER_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://bac-dz-ai.app",
    "X-Title": "Bac DZ AI",
  };
}

// ✅ Streaming — رد تدريجي حرف بحرف (بنفس نمط الكود المُقدَّم)
export async function* askOpenRouterStream(
  prompt: string,
  systemInstruction?: string,
  apiKey?: string,
  model?: string
): AsyncGenerator<string> {
  try {
    const response = await fetch(`${OR_BASE}/chat/completions`, {
      method: "POST",
      headers: getHeaders(apiKey),
      body: JSON.stringify({
        model: model || OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemInstruction || DEFAULT_SYSTEM },
          { role: "user",   content: prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter Error ${response.status}: ${errText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error("لا يوجد body في الاستجابة");

    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // تجاهل أي سطر غير صالح
        }
      }
    }
  } catch (error: any) {
    console.error("OpenRouter Stream Error:", error);
    yield `عذراً، حدث خطأ في الاتصال: ${error?.message || "فشل الاتصال بـ OpenRouter"}`;
  }
}

// ✅ رد كامل (non-streaming)
export async function askOpenRouter(
  prompt: string,
  systemInstruction?: string,
  apiKey?: string,
  model?: string
): Promise<string> {
  try {
    const response = await fetch(`${OR_BASE}/chat/completions`, {
      method: "POST",
      headers: getHeaders(apiKey),
      body: JSON.stringify({
        model: model || OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemInstruction || DEFAULT_SYSTEM },
          { role: "user",   content: prompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "عذراً، لم أتمكن من توليد إجابة.";
  } catch (error: any) {
    console.error("OpenRouter Error:", error);
    return `عذراً، حدث خطأ: ${error?.message || "فشل الاتصال"}`;
  }
}

// ✅ تحليل درس (JSON) بـ OpenRouter
export async function analyzeLessonOpenRouter(
  text: string,
  apiKey?: string,
  model?: string
): Promise<{
  summary: string;
  keyPoints: string[];
  mindMap: { center: string; branches: { topic: string; details: string[] }[] };
  studyTips: string[];
}> {
  const prompt = `أنت أستاذ متخصص في البكالوريا الجزائرية. حلّل هذا الدرس:

"${text.substring(0, 4000)}"

أجب بـ JSON فقط بدون نص خارجه:
{
  "summary": "ملخص 4-5 جمل",
  "keyPoints": ["نقطة 1","نقطة 2","نقطة 3","نقطة 4","نقطة 5"],
  "mindMap": {
    "center": "الموضوع الرئيسي",
    "branches": [
      { "topic": "محور 1", "details": ["تفصيل 1","تفصيل 2"] },
      { "topic": "محور 2", "details": ["تفصيل 1","تفصيل 2"] },
      { "topic": "محور 3", "details": ["تفصيل 1","تفصيل 2"] }
    ]
  },
  "studyTips": ["نصيحة 1","نصيحة 2","نصيحة 3"]
}`;

  const result = await askOpenRouter(prompt, "أجب بـ JSON فقط بدون أي نص إضافي.", apiKey, model);
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }
  throw new Error("فشل تحليل الدرس");
}

// ✅ تحليل فيديو يوتيوب بـ OpenRouter
export async function analyzeYouTubeOpenRouter(
  title: string,
  channel: string,
  description: string,
  duration: string,
  apiKey?: string,
  model?: string
): Promise<{ summary: string; keyPoints: string[]; reviewQuestions: string[] }> {
  const prompt = `حلّل هذا الفيديو التعليمي للبكالوريا الجزائرية:
العنوان: ${title}
القناة: ${channel}
الوصف: ${description}
المدة: ${duration}

أجب بـ JSON فقط:
{
  "summary": "ملخص 3-4 جمل",
  "keyPoints": ["نقطة 1","نقطة 2","نقطة 3","نقطة 4","نقطة 5"],
  "reviewQuestions": ["سؤال 1","سؤال 2","سؤال 3","سؤال 4","سؤال 5"]
}`;

  const result = await askOpenRouter(prompt, "أجب بـ JSON فقط بالعربية.", apiKey, model);
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }
  throw new Error("فشل تحليل الفيديو");
}

// ✅ توليد Quiz بـ OpenRouter
export async function generateQuizOpenRouter(
  subject: string,
  branch: string,
  term: string,
  apiKey?: string,
  model?: string
): Promise<{ title: string; questions: { q: string; options: string[]; correct: number }[] }> {
  const prompt = `اختبار Quiz من 10 أسئلة لمادة ${subject} لشعبة ${branch} للفصل ${term} حسب المنهاج الجزائري.

أجب بـ JSON فقط:
{
  "title": "عنوان الاختبار",
  "questions": [
    { "q": "نص السؤال", "options": ["أ","ب","ج","د"], "correct": 0 }
  ]
}`;

  const result = await askOpenRouter(prompt, "أجب بـ JSON صالح فقط.", apiKey, model);
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }
  throw new Error("فشل توليد Quiz");
}
