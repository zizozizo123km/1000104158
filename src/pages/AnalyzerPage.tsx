import { useState } from 'react';
import { useApp, GEMINI_MODEL } from '../context/AppContext';
import { analyzeLesson } from '../lib/gemini';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  FileText, Sparkles, Loader2, Copy, Check,
  Brain, List, Network, AlertCircle, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  mindMap: { center: string; branches: { topic: string; details: string[] }[] };
  studyTips: string[];
}

// ✅ تحليل محلي بسيط عند عدم توفر Gemini
const analyzeLocally = async (text: string): Promise<AnalysisResult> => {
  await new Promise(r => setTimeout(r, 1500));
  const sentences = text.split(/[.!?،؟]/).filter(s => s.trim().length > 20);
  const words = text.split(' ');
  const stopWords = ['في', 'من', 'إلى', 'على', 'أن', 'ما', 'هو', 'هي', 'التي', 'الذي', 'وهو', 'كما', 'إذ', 'حيث', 'لأن', 'عند', 'ولكن', 'لكن', 'أو', 'بل', 'وقد', 'قد', 'لقد', 'هذا', 'هذه', 'تلك', 'ذلك'];
  const wordFreq: Record<string, number> = {};
  words.forEach(w => {
    const clean = w.replace(/[^a-zA-Z\u0600-\u06FF]/g, '').trim();
    if (clean.length > 3 && !stopWords.includes(clean)) {
      wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    }
  });
  const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word]) => word);
  const summaryPoints = sentences.slice(0, 3).map(s => s.trim()).filter(Boolean);
  return {
    summary: (summaryPoints.join('. ') || text.substring(0, 300)) + '\n\n⚠️ أضف مفتاح Gemini للحصول على تحليل ذكي حقيقي!',
    keyPoints: topWords.slice(0, 6).map((w, i) => `النقطة ${i + 1}: "${w}" — مفهوم محوري في هذا الدرس`),
    mindMap: {
      center: topWords[0] || 'الموضوع الرئيسي',
      branches: [
        { topic: topWords[1] || 'المفهوم الأول', details: [topWords[2] || 'تفصيل', topWords[3] || 'مثال'] },
        { topic: topWords[4] || 'المفهوم الثاني', details: [topWords[5] || 'تفصيل', topWords[6] || 'مثال'] },
        { topic: 'التطبيق', details: ['تمارين', 'أمثلة نموذجية'] },
        { topic: 'المراجعة', details: ['أسئلة', 'ملخص'] },
      ]
    },
    studyTips: [
      'اقرأ الدرس مرتين قبل الحفظ',
      'اكتب النقاط المهمة بيدك',
      'ارسم مخططات ذهنية للربط بين المفاهيم',
      'راجع الدرس بعد 24 ساعة للتثبيت',
    ]
  };
};

export default function AnalyzerPage() {
  const { isDarkMode, user, settings, isAdmin, setCurrentPage } = useApp();
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'points' | 'mindmap' | 'tips'>('summary');
  const [copied, setCopied] = useState(false);

  const bg = isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-[#12122a] border-white/10' : 'bg-white border-gray-200';
  const inputBg = isDarkMode ? 'bg-[#1a1a35] border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400';
  const text = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';
  const border = isDarkMode ? 'border-white/10' : 'border-gray-200';

  const analyze = async () => {
    if (inputText.trim().length < 50) {
      toast.error('يرجى إدخال نص أطول (50 حرف على الأقل)');
      return;
    }
    setLoading(true);
    try {
      let analysis: AnalysisResult;

      if (settings.geminiApiKey) {
        // ✅ استخدام @google/genai SDK مع gemini-2.5-flash-preview
        analysis = await analyzeLesson(inputText, settings.geminiApiKey);
        toast.success(`⚡ تم التحليل بـ ${GEMINI_MODEL}! 🎉`);
      } else {
        analysis = await analyzeLocally(inputText);
        toast.success('تم التحليل المحلي — أضف Gemini لتحليل أذكى!');
      }

      setResult(analysis);

      if (user) {
        await addDoc(collection(db, `users/${user.uid}/analyses`), {
          inputText: inputText.substring(0, 500),
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          usedGemini: !!settings.geminiApiKey,
          geminiModel: settings.geminiApiKey ? GEMINI_MODEL : 'local',
          timestamp: serverTimestamp(),
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل التحليل، تحقق من مفتاح Gemini');
    } finally {
      setLoading(false);
    }
  };

  const copy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('تم النسخ!');
  };

  const tabs = [
    { id: 'summary', label: 'الملخص', icon: FileText },
    { id: 'points', label: 'النقاط المهمة', icon: List },
    { id: 'mindmap', label: 'خريطة ذهنية', icon: Network },
    { id: 'tips', label: 'نصائح الدراسة', icon: Brain },
  ];

  return (
    <div className={`min-h-screen ${bg} page-enter`} dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-600/20 border border-purple-500/30 mb-4">
            <Brain size={14} className="text-purple-400" />
            <span className="text-sm text-purple-300">تحليل ذكي بالـ AI</span>
          </div>
          <h1 className={`text-3xl font-bold ${textMain}`}>تحليل الدروس</h1>
          <p className={`mt-2 ${text}`}>الصق نص درسك وسيقوم الذكاء الاصطناعي بتلخيصه وتحليله</p>

          <div className="flex items-center justify-center gap-3 mt-4">
            {settings.geminiApiKey ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-xs">
                <Zap size={12} />
                <span>⚡ {GEMINI_MODEL} مفعّل</span>
              </div>
            ) : (
              <button
                onClick={() => isAdmin ? setCurrentPage('admin') : toast('اطلب من المسؤول إضافة مفتاح Gemini')}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs hover:bg-orange-500/30 transition-colors"
              >
                <AlertCircle size={12} />
                <span>Gemini غير مفعّل — {isAdmin ? 'أضف المفتاح' : 'تواصل مع المسؤول'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Input Section */}
        <div className={`p-6 rounded-2xl border mb-6 ${cardBg}`}>
          <div className="flex items-center justify-between mb-3">
            <label className={`text-sm font-medium ${textMain}`}>نص الدرس</label>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${text}`}>{inputText.length} حرف</span>
              {settings.geminiApiKey && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {GEMINI_MODEL}
                </span>
              )}
            </div>
          </div>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="الصق هنا نص الدرس الذي تريد تحليله وتلخيصه..."
            rows={8}
            className={`w-full px-4 py-3 rounded-xl border text-sm resize-none input-glow transition-all ${inputBg}`}
          />
          {inputText.length < 50 && inputText.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <AlertCircle size={14} className="text-yellow-400" />
              <span className="text-xs text-yellow-400">النص قصير جداً، يرجى إضافة المزيد</span>
            </div>
          )}
          <button
            onClick={analyze}
            disabled={loading || inputText.length < 50}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 size={20} className="animate-spin" /><span>جاري التحليل بـ {GEMINI_MODEL}...</span></>
            ) : (
              <><Sparkles size={20} /><span>⚡ تحليل ذكي بـ Gemini AI</span></>
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
            <div className={`flex border-b ${border} overflow-x-auto`}>
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === id
                      ? 'border-indigo-500 text-indigo-400'
                      : `border-transparent ${text} hover:text-indigo-400`
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'summary' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-bold ${textMain}`}>⚡ الملخص الذكي بـ Gemini</h3>
                    <button
                      onClick={() => copy(result.summary)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                    >
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      نسخ
                    </button>
                  </div>
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-sm leading-loose ${text}`}>
                    {result.summary}
                  </div>
                </div>
              )}

              {activeTab === 'points' && (
                <div>
                  <h3 className={`font-bold mb-4 ${textMain}`}>النقاط الرئيسية</h3>
                  <div className="space-y-3">
                    {result.keyPoints.map((point, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <p className={`text-sm ${text}`}>{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'mindmap' && (
                <div>
                  <h3 className={`font-bold mb-4 ${textMain}`}>الخريطة الذهنية</h3>
                  <div className="flex flex-col items-center">
                    <div className="w-48 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-lg mb-6 px-4 text-center">
                      {result.mindMap.center}
                    </div>
                    <div className="w-0.5 h-6 bg-indigo-500/50 mb-2" />
                    <div className="grid grid-cols-2 gap-4 w-full">
                      {result.mindMap.branches.map((branch, i) => (
                        <div key={i} className={`p-4 rounded-xl border ${isDarkMode ? 'border-indigo-500/30 bg-indigo-600/10' : 'border-indigo-200 bg-indigo-50'}`}>
                          <p className="font-bold text-sm text-indigo-400 mb-2">{branch.topic}</p>
                          <div className="space-y-1">
                            {branch.details.map((d, j) => (
                              <p key={j} className={`text-xs ${text} flex items-center gap-1`}>
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0" />
                                {d}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tips' && (
                <div>
                  <h3 className={`font-bold mb-4 ${textMain}`}>نصائح الدراسة</h3>
                  <div className="space-y-3">
                    {result.studyTips.map((tip, i) => {
                      const emojis = ['🎯', '✍️', '🗺️', '⏰', '💡', '📖'];
                      return (
                        <div key={i} className={`flex items-center gap-3 p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                          <span className="text-2xl">{emojis[i] || '📌'}</span>
                          <p className={`text-sm ${text}`}>{tip}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
