// ✅ Gemini API — direct fetch بنفس نمط curl المُقدَّم تماماً
// curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent"
//   -H "x-goog-api-key: $GEMINI_API_KEY"
//   -H 'Content-Type: application/json'
//   -X POST

export const geminiModel = "gemini-3-flash-preview";

const DEFAULT_KEY = "AIzaSyBey6R_bFCswa5C7NiuZgmSQVtVM8AyS5E";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_SYSTEM = `أنت أستاذ افتراضي ذكي ومتخصص لمساعدة تلاميذ البكالوريا في الجزائر.
أجب دائماً باللغة العربية الفصحى الواضحة.
استخدم الترقيم والنقاط لتوضيح الأفكار.
اذكر القوانين والمعادلات بوضوح.
كن مشجعاً وإيجابياً مع التلميذ.
اجعل الشرح تدريجياً من السهل إلى الصعب.`;

// ✅ بناء headers بنفس نمط curl: x-goog-api-key
function buildHeaders(apiKey?: string) {
  return {
    "x-goog-api-key": apiKey || DEFAULT_KEY,
    "Content-Type": "application/json",
  };
}

// ✅ بناء payload بنفس هيكل curl
function buildPayload(
  prompt: string,
  systemInstruction?: string,
  config?: Record<string, unknown>
) {
  return {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction || DEFAULT_SYSTEM }],
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 8192,
      ...config,
    },
  };
}

// ✅ Retry مع backoff تصاعدي (مثل fetchWithRetry في الكود المُقدَّم)
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 4,
  backoff = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }
    return response;
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((r) => setTimeout(r, backoff));
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
}

// ============================================================
// ✅ askGemini — استدعاء عادي (non-streaming) بنمط curl
// ============================================================
export async function askGemini(
  prompt: string,
  systemInstruction?: string,
  _useSearch = false,
  apiKey?: string
): Promise<string> {
  try {
    const url = `${BASE_URL}/${geminiModel}:generateContent`;
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: buildHeaders(apiKey),
      body: JSON.stringify(buildPayload(prompt, systemInstruction)),
    });
    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "عذراً، لم أتمكن من توليد إجابة."
    );
  } catch (error: unknown) {
    console.error("Gemini API Error:", error);
    return "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي. يرجى المحاولة لاحقاً.";
  }
}

// ============================================================
// ✅ askGeminiStream — streaming بنمط SSE
// ============================================================
export async function* askGeminiStream(
  prompt: string,
  systemInstruction?: string,
  _useSearch = false,
  apiKey?: string
): AsyncGenerator<string> {
  try {
    // ✅ استخدام streamGenerateContent endpoint للـ streaming
    const url = `${BASE_URL}/${geminiModel}:streamGenerateContent?alt=sse`;
    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(apiKey),
      body: JSON.stringify(buildPayload(prompt, systemInstruction)),
    });

    if (!response.ok) {
      // fallback لـ non-streaming عند فشل streaming
      const fallback = await askGemini(prompt, systemInstruction, false, apiKey);
      yield fallback;
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) {
      yield "عذراً، فشل الاتصال.";
      return;
    }

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
          const text =
            json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch {
          // تجاهل أسطر غير صالحة
        }
      }
    }
  } catch (error: unknown) {
    console.error("Gemini Stream Error:", error);
    // fallback لـ non-streaming
    try {
      const fallback = await askGemini(prompt, systemInstruction, false, apiKey);
      yield fallback;
    } catch {
      yield "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي.";
    }
  }
}

// ============================================================
// ✅ generateQuiz — توليد Quiz JSON
// ============================================================
export async function generateQuiz(
  subject: string,
  branch: string,
  term: string,
  apiKey?: string
): Promise<{
  title: string;
  questions: { q: string; options: string[]; correct: number }[];
}> {
  const prompt = `أنت أستاذ متخصص في البكالوريا الجزائرية.
قم بتوليد اختبار Quiz مكون من 10 أسئلة اختيار متعدد لمادة ${subject} لشعبة ${branch} للفصل ${term} حسب المنهاج الجزائري.
يجب أن تكون الأسئلة متنوعة وشاملة لأهم مواضيع الفصل.

أجب بـ JSON صالح فقط بهذا الهيكل:
{
  "title": "عنوان الاختبار",
  "questions": [
    {
      "q": "نص السؤال",
      "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
      "correct": 0
    }
  ]
}`;

  try {
    const url = `${BASE_URL}/${geminiModel}:generateContent`;
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // ✅ parse JSON مع fallback
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error("فشل تحليل JSON للـ Quiz");
    }
  } catch (error: unknown) {
    console.error("Quiz Generation Error:", error);
    throw error;
  }
}

// ============================================================
// ✅ analyzeLesson — تحليل درس وإرجاع JSON مهيكل
// ============================================================
export async function analyzeLesson(
  text: string,
  apiKey?: string
): Promise<{
  summary: string;
  keyPoints: string[];
  mindMap: {
    center: string;
    branches: { topic: string; details: string[] }[];
  };
  studyTips: string[];
}> {
  const prompt = `أنت أستاذ متخصص في البكالوريا الجزائرية. حلّل هذا الدرس التعليمي تحليلاً شاملاً:

"${text.substring(0, 4000)}"

أجب بـ JSON صالح فقط بهذا الهيكل بالضبط:
{
  "summary": "ملخص شامل في 4-5 جمل يغطي أهم أفكار الدرس",
  "keyPoints": ["النقطة الأولى المهمة", "النقطة الثانية", "النقطة الثالثة", "النقطة الرابعة", "النقطة الخامسة", "النقطة السادسة"],
  "mindMap": {
    "center": "الموضوع الرئيسي للدرس",
    "branches": [
      { "topic": "المحور الأول", "details": ["تفصيل 1", "تفصيل 2"] },
      { "topic": "المحور الثاني", "details": ["تفصيل 1", "تفصيل 2"] },
      { "topic": "المحور الثالث", "details": ["تفصيل 1", "تفصيل 2"] },
      { "topic": "المحور الرابع", "details": ["تفصيل 1", "تفصيل 2"] }
    ]
  },
  "studyTips": ["نصيحة 1", "نصيحة 2", "نصيحة 3", "نصيحة 4"]
}`;

  const url = `${BASE_URL}/${geminiModel}:generateContent`;
  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [{ text: "أجب بصيغة JSON فقط بدون أي نص إضافي. الإجابة يجب أن تكون JSON صالح." }],
      },
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  const data = await response.json();
  const responseText =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  try {
    return JSON.parse(responseText);
  } catch {
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("فشل تحليل الدرس");
  }
}

// ============================================================
// ✅ analyzeYouTubeVideo — تحليل فيديو يوتيوب
// ============================================================
export async function analyzeYouTubeVideo(
  title: string,
  channel: string,
  description: string,
  duration: string,
  apiKey?: string
): Promise<{
  summary: string;
  keyPoints: string[];
  reviewQuestions: string[];
}> {
  const prompt = `أنت أستاذ متخصص في البكالوريا الجزائرية. حلّل هذا الفيديو التعليمي:

العنوان: ${title}
القناة: ${channel}
الوصف: ${description}
المدة: ${duration}

أجب بـ JSON صالح فقط:
{
  "summary": "ملخص شامل للمحتوى التعليمي في 3-4 جمل",
  "keyPoints": ["نقطة 1", "نقطة 2", "نقطة 3", "نقطة 4", "نقطة 5", "نقطة 6"],
  "reviewQuestions": ["سؤال 1", "سؤال 2", "سؤال 3", "سؤال 4", "سؤال 5"]
}`;

  const url = `${BASE_URL}/${geminiModel}:generateContent`;
  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [{ text: "أجب بصيغة JSON فقط بالعربية بدون أي نص إضافي." }],
      },
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    }),
  });

  const data = await response.json();
  const responseText =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  try {
    return JSON.parse(responseText);
  } catch {
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("فشل تحليل الفيديو");
  }
}

// ============================================================
// ✅ testApiKey — اختبار سريع للمفتاح
// ============================================================
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const url = `${BASE_URL}/${geminiModel}:generateContent`;
    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        contents: [{ parts: [{ text: "مرحبا" }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
