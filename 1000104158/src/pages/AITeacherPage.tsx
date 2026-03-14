import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Brain, Send, RefreshCw, Loader2, ChevronDown, Sparkles,
  BookOpen, HelpCircle, FileText, ListChecks, Trash2, Copy,
  Check, Mic, MicOff, Volume2, VolumeX
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────
// ✅ Constants — مطابقة للكود المُقدَّم
// ─────────────────────────────────────────────
const API_KEY = 'AIzaSyBey6R_bFCswa5C7NiuZgmSQVtVM8AyS5E';
const MODEL   = 'gemini-3-flash-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SUBJECTS = [
  'رياضيات','فيزياء','كيمياء','علوم طبيعية','فلسفة','لغة عربية',
  'لغة فرنسية','لغة انجليزية','تاريخ وجغرافيا','اقتصاد وتسيير','علوم إسلامية'
];
const BRANCHES = ['علوم تجريبية','رياضيات','آداب وفلسفة','تقني رياضي','تسيير واقتصاد','لغات أجنبية'];
const TERMS    = ['الفصل الأول','الفصل الثاني','الفصل الثالث'];

const MODES = [
  { id: 'explain',   icon: BookOpen,   label: 'شرح الدرس',  color: 'text-blue-400'   },
  { id: 'solve',     icon: HelpCircle, label: 'حل تمرين',   color: 'text-green-400'  },
  { id: 'summarize', icon: FileText,   label: 'تلخيص',      color: 'text-purple-400' },
  { id: 'quiz',      icon: ListChecks, label: 'Quiz ذكي',   color: 'text-orange-400' },
];

// ─────────────────────────────────────────────
// ✅ fetchWithRetry — مطابق للدالة في الكود المُقدَّم
// ─────────────────────────────────────────────
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 5,
  backoff = 1000
): Promise<any> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(r => setTimeout(r, backoff));
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
}

// ─────────────────────────────────────────────
// ✅ sendToAI — نفس دالة sendToAI في الكود المُقدَّم
// ─────────────────────────────────────────────
async function sendToAI(
  text: string,
  systemInstruction: string,
  apiKey: string
): Promise<string> {
  const payload = {
    contents: [{ parts: [{ text }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  };

  const data = await fetchWithRetry(ENDPOINT, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey || API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'لا يوجد رد.';
}

// ─────────────────────────────────────────────
// ✅ generateQuizAI — توليد Quiz JSON
// ─────────────────────────────────────────────
async function generateQuizAI(
  subject: string,
  branch: string,
  term: string,
  apiKey: string
): Promise<{ title: string; questions: { q: string; options: string[]; correct: number }[] }> {
  const prompt = `أنت أستاذ متخصص في البكالوريا الجزائرية.
قم بتوليد اختبار Quiz مكون من 10 أسئلة اختيار متعدد لمادة ${subject} لشعبة ${branch} للفصل ${term} حسب المنهاج الجزائري.
أجب بـ JSON صالح فقط بهذا الهيكل:
{
  "title": "عنوان الاختبار",
  "questions": [
    {
      "q": "نص السؤال",
      "options": ["الخيار أ","الخيار ب","الخيار ج","الخيار د"],
      "correct": 0
    }
  ]
}`;

  const data = await fetchWithRetry(ENDPOINT, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey || API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('فشل تحليل JSON');
  }
}

// ─────────────────────────────────────────────
// ✅ buildSystemInstruction
// ─────────────────────────────────────────────
function buildSystemInstruction(subject: string, mode: string): string {
  const modeDesc: Record<string, string> = {
    explain:   'اشرح بتفصيل مع أمثلة تطبيقية.',
    solve:     'حل التمارين خطوة بخطوة مع شرح كل خطوة.',
    summarize: 'لخّص في نقاط مرتبة وواضحة.',
    quiz:      'أنشئ أسئلة اختبار متنوعة.',
  };
  return `أنت أستاذ متخصص ومتمكن في تدريس مادة ${subject} لتلاميذ البكالوريا الجزائرية.
${modeDesc[mode] || ''}
أجب دائماً باللغة العربية الفصحى مع شرح مبسط ومنظم.
استخدم الترقيم والنقاط لتوضيح الأفكار.
اذكر القوانين والمعادلات بوضوح.
اجعل الشرح تدريجياً من السهل إلى الصعب.
كن مشجعاً وإيجابياً مع التلميذ.`;
}

function buildPrompt(message: string, subject: string, mode: string): string {
  const prompts: Record<string, string> = {
    explain:   `اشرح الموضوع التالي من مادة ${subject} شرحاً تفصيلياً مع أمثلة:\n${message}`,
    solve:     `حل التمرين التالي من مادة ${subject} خطوة بخطوة:\n${message}`,
    summarize: `لخّص الدرس التالي من مادة ${subject} في نقاط:\n${message}`,
    quiz:      `أنشئ 5 أسئلة اختبار حول موضوع ${subject}:\n${message}`,
  };
  return prompts[mode] || prompts['explain'];
}

// ─────────────────────────────────────────────
// ✅ Types
// ─────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface QuizData {
  title: string;
  questions: { q: string; options: string[]; correct: number }[];
}

// ─────────────────────────────────────────────
// ✅ formatContent — تنسيق ردود الأستاذ
// ─────────────────────────────────────────────
function formatContent(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('# '))
      return <p key={i} className="font-bold text-lg mt-4 mb-2 text-indigo-300">{line.replace('# ', '')}</p>;
    if (line.startsWith('## '))
      return <p key={i} className="font-bold mt-3 mb-1 text-indigo-200">{line.replace('## ', '')}</p>;
    if (line.match(/^\*\*(.+)\*\*$/))
      return <p key={i} className="font-bold text-indigo-300 mt-2">{line.replace(/\*\*/g, '')}</p>;
    if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* '))
      return (
        <p key={i} className="mr-4 my-0.5 flex items-start gap-2">
          <span className="text-indigo-400 mt-1">•</span>
          <span>{line.replace(/^[•\-\*] /, '')}</span>
        </p>
      );
    if (/^\d+\./.test(line))
      return <p key={i} className="mr-2 my-0.5 text-gray-200">{line}</p>;
    return <p key={i} className={line === '' ? 'h-2' : 'my-0.5'}>{line}</p>;
  });
}

// ═══════════════════════════════════════════════════════
// ✅ المكوّن الرئيسي — AITeacherPage
// ═══════════════════════════════════════════════════════
export default function AITeacherPage() {
  const { isDarkMode, user, userProfile, settings } = useApp();

  const [messages, setMessages] = useState<Message[]>([{
    id: '0',
    role: 'assistant',
    content: `👋 مرحباً! أنا أستاذك الافتراضي المدعوم بـ **${MODEL}** 🤖\n\nاختر المادة والوضع المناسب، ثم اسألني ما تريد!\n\n✨ يمكنني:\n• 📖 شرح الدروس بالتفصيل\n• 🔢 حل التمارين خطوة بخطوة\n• 📝 تلخيص الدروس في نقاط\n• 🧠 توليد Quiz ذكي للمراجعة\n• 🎙️ الإجابة الصوتية`,
    timestamp: new Date(),
  }]);

  const [input, setInput]           = useState('');
  const [subject, setSubject]       = useState('رياضيات');
  const [mode, setMode]             = useState('explain');
  const [isLoading, setIsLoading]   = useState(false);
  const [copied, setCopied]         = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Quiz state
  const [showQuizModal, setShowQuizModal]     = useState(false);
  const [quizBranch, setQuizBranch]           = useState('علوم تجريبية');
  const [quizTerm, setQuizTerm]               = useState('الفصل الأول');
  const [quizSubject, setQuizSubject]         = useState('رياضيات');
  const [generatingQuiz, setGeneratingQuiz]   = useState(false);
  const [quizData, setQuizData]               = useState<QuizData | null>(null);
  const [quizAnswers, setQuizAnswers]         = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted]     = useState(false);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const recognitionRef  = useRef<any>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);

  // ✅ scroll to bottom عند كل رسالة جديدة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ─────────────────────────────────────────────
  // ✅ Text-to-Speech
  // ─────────────────────────────────────────────
  const speakText = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`]/g, '').replace(/\n+/g, ' ').substring(0, 600);
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang  = 'ar-SA';
    utt.rate  = 0.9;
    utt.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find(v => v.lang.startsWith('ar'));
    if (arVoice) utt.voice = arVoice;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [voiceEnabled]);

  const stopSpeaking = () => { window.speechSynthesis?.cancel(); setIsSpeaking(false); };

  // ─────────────────────────────────────────────
  // ✅ Speech-to-Text
  // ─────────────────────────────────────────────
  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('متصفحك لا يدعم التعرف على الصوت'); return; }
    const rec = new SR();
    rec.lang = 'ar-DZ';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart  = () => setIsListening(true);
    rec.onresult = (e: any) => {
      setInput(p => (p + ' ' + e.results[0][0].transcript).trim());
      setIsListening(false);
    };
    rec.onerror = () => { setIsListening(false); toast.error('فشل التعرف على الصوت'); };
    rec.onend   = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false); };

  // ─────────────────────────────────────────────
  // ✅ حفظ في Firebase
  // ─────────────────────────────────────────────
  const saveHistory = async (userMsg: string, aiMsg: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, `users/${user.uid}/aiHistory`), {
        userMessage: userMsg, aiResponse: aiMsg,
        subject, mode, model: MODEL,
        timestamp: serverTimestamp(),
      });
    } catch {}
  };

  // ─────────────────────────────────────────────
  // ✅ إرسال رسالة — بنفس نمط chatForm.onsubmit في الكود المُقدَّم
  // ─────────────────────────────────────────────
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    // ✅ addMsg(role, text) — نفس دالة addMsg في الكود المُقدَّم
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const prompt   = buildPrompt(userText, subject, mode);
      const sysInstr = buildSystemInstruction(subject, mode);
      const apiKey   = settings.geminiApiKey || API_KEY;

      // ✅ sendToAI — مطابقة للدالة في الكود المُقدَّم
      const response = await sendToAI(prompt, sysInstr, apiKey);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      saveHistory(userText, response);
      if (voiceEnabled) speakText(response);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'فشل الاتصال بالخادم. يرجى المحاولة لاحقاً.',
        timestamp: new Date(),
      }]);
      toast.error('فشل الاتصال بـ Gemini AI');
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // ✅ إعادة توليد آخر إجابة
  // ─────────────────────────────────────────────
  const regenerate = async () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser || isLoading) return;
    setMessages(prev => prev.slice(0, -1));
    setIsLoading(true);
    try {
      const prompt   = buildPrompt(lastUser.content, subject, mode);
      const sysInstr = buildSystemInstruction(subject, mode);
      const apiKey   = settings.geminiApiKey || API_KEY;
      const response = await sendToAI(prompt, sysInstr, apiKey);
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'assistant',
        content: response, timestamp: new Date(),
      }]);
      if (voiceEnabled) speakText(response);
    } catch { toast.error('فشل إعادة التوليد'); }
    finally { setIsLoading(false); }
  };

  // ─────────────────────────────────────────────
  // ✅ توليد Quiz
  // ─────────────────────────────────────────────
  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    setQuizData(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    try {
      const apiKey = settings.geminiApiKey || API_KEY;
      const result = await generateQuizAI(quizSubject, quizBranch, quizTerm, apiKey);
      setQuizData(result);
      toast.success(`🎉 تم توليد ${result.questions?.length || 0} سؤال!`);
    } catch (err: any) {
      toast.error('فشل توليد Quiz: ' + (err.message || ''));
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
    const correct = quizData?.questions.filter((q, i) => quizAnswers[i] === q.correct).length || 0;
    toast.success(`نتيجتك: ${correct}/${quizData?.questions.length} ✅`);
  };

  const copyMsg = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('تم النسخ!');
  };

  const clearChat = () => {
    stopSpeaking();
    setMessages([{
      id: '0', role: 'assistant',
      content: '👋 محادثة جديدة! كيف يمكنني مساعدتك اليوم؟',
      timestamp: new Date(),
    }]);
  };

  // ─────────────────────────────────────────────
  // ✅ Styles
  // ─────────────────────────────────────────────
  const bg       = isDarkMode ? 'bg-[#0a0a1a]'              : 'bg-slate-50';
  const cardBg   = isDarkMode ? 'bg-[#12122a] border-white/10' : 'bg-white border-gray-200';
  const inputBg  = isDarkMode ? 'bg-[#1a1a35] border-white/10' : 'bg-gray-100 border-gray-200';
  const textMain = isDarkMode ? 'text-white'                 : 'text-gray-900';
  const textMuted= isDarkMode ? 'text-gray-400'              : 'text-gray-500';
  const border   = isDarkMode ? 'border-white/10'            : 'border-gray-200';
  const hoverBg  = isDarkMode ? 'hover:bg-white/10'         : 'hover:bg-gray-100';

  return (
    <div className={`flex flex-col h-[calc(100vh-56px)] ${bg} page-enter`} dir="rtl">

      {/* ─── Config Bar ─── */}
      <div className={`flex-shrink-0 px-4 py-3 border-b ${isDarkMode ? 'border-white/10 bg-[#0d0d1f]/90' : 'border-gray-200 bg-white/90'} backdrop-blur-sm`}>
        <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-3">

          {/* Subject selector */}
          <div className="relative">
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className={`px-3 py-2 pr-8 rounded-xl border text-sm font-medium appearance-none cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'}`}
            >
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={14} className={`absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none ${textMuted}`} />
          </div>

          {/* Mode buttons */}
          <div className="flex gap-1.5 flex-wrap">
            {MODES.map(({ id, icon: Icon, label, color }) => (
              <button
                key={id}
                onClick={() => { setMode(id); if (id === 'quiz') setShowQuizModal(true); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  mode === id
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                    : `${border} ${textMuted} ${hoverBg}`
                }`}
              >
                <Icon size={14} className={mode === id ? 'text-indigo-400' : color} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Model badge */}
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
            <Sparkles size={11} />
            <span className="hidden sm:inline">{MODEL}</span>
          </div>

          {/* Voice toggle */}
          <button
            onClick={() => { if (isSpeaking) stopSpeaking(); setVoiceEnabled(p => !p); }}
            className={`p-2 rounded-xl transition-colors ${voiceEnabled ? 'text-indigo-400 bg-indigo-500/20' : `${textMuted} ${hoverBg}`}`}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Clear chat */}
          <button onClick={clearChat} className={`p-2 rounded-xl transition-colors ${textMuted} ${hoverBg}`}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* ─── Messages Area — مثل chatWindow في الكود المُقدَّم ─── */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-5">

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} bubble-in`}
            >
              {/* Avatar */}
              <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                  : 'bg-gradient-to-br from-cyan-500 to-blue-600'
              }`}>
                {msg.role === 'assistant'
                  ? <Brain size={16} className="text-white" />
                  : <span className="text-white text-xs font-bold">{userProfile?.name?.charAt(0) || 'أ'}</span>
                }
              </div>

              {/* Bubble — مثل div.bubble في الكود المُقدَّم */}
              <div className="group max-w-[80%]">
                <div className={`px-5 py-4 rounded-2xl text-sm leading-loose ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tl-sm'
                    : isDarkMode
                      ? 'bg-[#1a1a35] text-gray-100 border border-white/5 rounded-tr-sm shadow-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-tr-sm shadow-sm'
                }`}>
                  {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
                </div>

                {/* Action buttons — تظهر عند hover */}
                {msg.role === 'assistant' && msg.content && (
                  <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyMsg(msg.content, msg.id)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors ${textMuted} ${hoverBg}`}
                    >
                      {copied === msg.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      {copied === msg.id ? 'تم النسخ' : 'نسخ'}
                    </button>
                    <button
                      onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.content)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                        isSpeaking ? 'text-indigo-400 bg-indigo-500/20' : `${textMuted} ${hoverBg}`
                      }`}
                    >
                      {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      {isSpeaking ? 'إيقاف' : 'استمع'}
                    </button>
                    {msg.id === messages[messages.length - 1]?.id && (
                      <button
                        onClick={regenerate}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors ${textMuted} ${hoverBg}`}
                      >
                        <RefreshCw size={12} /> إعادة توليد
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* ✅ Loader — مثل div#loader في الكود المُقدَّم */}
          {isLoading && (
            <div className="flex gap-3 bubble-in">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Brain size={16} className="text-white" />
              </div>
              <div className={`px-5 py-4 rounded-2xl rounded-tr-sm ${isDarkMode ? 'bg-[#1a1a35] border border-white/5' : 'bg-white border border-gray-200 shadow-sm'}`}>
                <div className="flex items-center gap-2">
                  {/* نفس نقاط التحميل في الكود المُقدَّم */}
                  <div className="flex gap-1">
                    <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
                    <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
                  </div>
                  <span className={`text-xs ${textMuted}`}>الأستاذ يفكر...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ─── Voice Speaking Bar ─── */}
      {isSpeaking && (
        <div className={`flex-shrink-0 px-4 py-2 ${isDarkMode ? 'bg-indigo-900/30 border-t border-indigo-500/20' : 'bg-indigo-50 border-t border-indigo-200'}`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 items-end h-5">
                {[3,5,4,6,3,5,4].map((h, i) => (
                  <div key={i} className="w-1 bg-indigo-400 rounded-full animate-pulse" style={{ height: `${h*3}px`, animationDelay: `${i*0.1}s` }} />
                ))}
              </div>
              <span className="text-xs text-indigo-400 font-medium">الأستاذ يتحدث...</span>
            </div>
            <button onClick={stopSpeaking} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <VolumeX size={14} /> إيقاف
            </button>
          </div>
        </div>
      )}

      {/* ─── Input Footer — مثل footer في الكود المُقدَّم ─── */}
      <footer className={`flex-shrink-0 px-4 py-4 border-t ${isDarkMode ? 'border-white/10 bg-[#0d0d1f]' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-4xl mx-auto">

          {/* Quick prompts */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
            {[
              `اشرح لي أهم قانون في ${subject}`,
              `أعطني مثالاً محلولاً في ${subject}`,
              `ما أهم مواضيع ${subject} في البكالوريا؟`,
              `كيف أذاكر ${subject} بطريقة فعّالة؟`,
            ].map(q => (
              <button
                key={q}
                onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  isDarkMode ? 'border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200' : 'border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* ✅ Form — مثل form#chatForm في الكود المُقدَّم */}
          <form onSubmit={handleSend}>
            <div className={`flex items-end gap-2 p-3 rounded-2xl border ${inputBg}`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder={`اسأل في ${subject}... (Enter للإرسال)`}
                rows={2}
                disabled={isLoading}
                className={`flex-1 bg-transparent text-sm resize-none outline-none ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
              />

              {/* Mic button */}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : `${textMuted} ${hoverBg}`
                }`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* ✅ Send button — مثل button[type=submit] في الكود المُقدَّم */}
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white transition-colors flex-shrink-0 shadow-lg shadow-indigo-500/30"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </form>

          {/* Footer label */}
          <p className={`text-center text-xs mt-2 ${textMuted}`}>
            <Sparkles size={10} className="inline ml-1" />
            {MODEL} · x-goog-api-key · retry ×5
          </p>
        </div>
      </footer>

      {/* ─── Quiz Modal ─── */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-2xl border p-6 max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`font-bold text-xl ${textMain}`}>🧠 توليد Quiz بالذكاء الاصطناعي</h2>
              <button
                onClick={() => { setShowQuizModal(false); setMode('explain'); }}
                className={`p-2 rounded-xl ${hoverBg} ${textMuted}`}
              >✕</button>
            </div>

            {!quizData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'المادة',  value: quizSubject, setter: setQuizSubject, options: SUBJECTS },
                    { label: 'الشعبة', value: quizBranch,  setter: setQuizBranch,  options: BRANCHES },
                    { label: 'الفصل',  value: quizTerm,    setter: setQuizTerm,    options: TERMS    },
                  ].map(({ label, value, setter, options }) => (
                    <div key={label}>
                      <label className={`text-sm font-medium mb-2 block ${textMain}`}>{label}</label>
                      <select
                        value={value}
                        onChange={e => setter(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'}`}
                      >
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleGenerateQuiz}
                  disabled={generatingQuiz}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {generatingQuiz
                    ? <><Loader2 size={18} className="animate-spin" />جاري التوليد...</>
                    : <><Sparkles size={18} />توليد Quiz ذكي</>
                  }
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className={`font-bold text-center text-lg ${textMain}`}>{quizData.title}</h3>

                {quizData.questions?.map((q, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                    <p className={`font-medium mb-3 ${textMain}`}>س{i + 1}: {q.q}</p>
                    <div className="space-y-2">
                      {q.options?.map((opt, j) => {
                        let style = isDarkMode ? 'border-white/10 hover:bg-white/10' : 'border-gray-200 hover:bg-gray-100';
                        if (quizSubmitted) {
                          if (j === q.correct) style = 'border-green-500 bg-green-500/20 text-green-400';
                          else if (quizAnswers[i] === j) style = 'border-red-500 bg-red-500/20 text-red-400';
                        } else if (quizAnswers[i] === j) {
                          style = 'border-indigo-500 bg-indigo-500/20 text-indigo-400';
                        }
                        return (
                          <button
                            key={j}
                            onClick={() => !quizSubmitted && setQuizAnswers(p => ({ ...p, [i]: j }))}
                            className={`w-full text-right px-4 py-2.5 rounded-xl border text-sm transition-all ${style}`}
                          >
                            {['أ','ب','ج','د'][j]}) {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {!quizSubmitted ? (
                  <button
                    onClick={submitQuiz}
                    disabled={Object.keys(quizAnswers).length < (quizData.questions?.length || 0)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    تسليم الإجابات
                  </button>
                ) : (
                  <div className={`text-center p-4 rounded-xl ${isDarkMode ? 'bg-green-500/20' : 'bg-green-50'}`}>
                    <p className="text-green-400 font-bold text-2xl">
                      {quizData.questions?.filter((q, i) => quizAnswers[i] === q.correct).length}
                      /{quizData.questions?.length} ✅
                    </p>
                    <p className={`text-sm mt-1 ${textMuted}`}>
                      {Math.round((quizData.questions?.filter((q, i) => quizAnswers[i] === q.correct).length / quizData.questions?.length) * 100)}% نسبة النجاح
                    </p>
                    <button
                      onClick={() => { setQuizData(null); setQuizAnswers({}); setQuizSubmitted(false); }}
                      className="mt-3 text-sm text-indigo-400 hover:underline"
                    >
                      توليد Quiz جديد
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
