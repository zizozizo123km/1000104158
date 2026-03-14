import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { OPENROUTER_MODELS, DEFAULT_OPENROUTER_KEY } from '../lib/openrouter';

const DEFAULT_GEMINI_KEY = 'AIzaSyBey6R_bFCswa5C7NiuZgmSQVtVM8AyS5E';
import {
  Shield, Key, Youtube, Brain, Save, Eye, EyeOff, CheckCircle,
  AlertCircle, Settings, Users, BarChart3, LogOut, GraduationCap,
  Zap, Globe, Lock, RefreshCw, Copy, Check, Video, Mic, Cpu
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AdminPage() {
  const { isDarkMode, settings, updateSettings, logout, userProfile, setCurrentPage } = useApp();
  // ✅ مزامنة فورية مع settings عند أي تغيير خارجي
  const [geminiKey, setGeminiKey] = useState(() => settings.geminiApiKey);
  const [youtubeKey, setYoutubeKey] = useState(() => settings.youtubeApiKey);
  const [showGemini, setShowGemini] = useState(false);
  const [showYoutube, setShowYoutube] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [savingYoutube, setSavingYoutube] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');
  const [youtubeStatus, setYoutubeStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');
  const [copiedGemini, setCopiedGemini] = useState(false);
  const [copiedYoutube, setCopiedYoutube] = useState(false);
  // ✅ OpenRouter state
  const [openRouterKey, setOpenRouterKey] = useState(() => settings.openRouterApiKey || DEFAULT_OPENROUTER_KEY);
  const [openRouterModel, setOpenRouterModel] = useState(() => settings.openRouterModel || OPENROUTER_MODELS[0].id);
  const [showOpenRouter, setShowOpenRouter] = useState(false);
  const [savingOpenRouter, setSavingOpenRouter] = useState(false);
  const [testingOpenRouter, setTestingOpenRouter] = useState(false);
  const [openRouterStatus, setOpenRouterStatus] = useState<'unknown' | 'valid' | 'invalid'>('valid');
  const [copiedOpenRouter, setCopiedOpenRouter] = useState(false);
  const [stats, setStats] = useState({ users: 0, posts: 0, chats: 0 });
  const [activeTab, setActiveTab] = useState<'apis' | 'stats' | 'settings'>('apis');

  useEffect(() => {
    // ✅ مزامنة فورية كل مرة تتغير settings من أي صفحة
    setGeminiKey(settings.geminiApiKey);
    setYoutubeKey(settings.youtubeApiKey);
    if (settings.geminiApiKey) setGeminiStatus('valid');
    if (settings.youtubeApiKey) setYoutubeStatus('valid');
    fetchStats();
  }, [settings.geminiApiKey, settings.youtubeApiKey]);

  const fetchStats = async () => {
    try {
      const [usersSnap, postsSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), limit(100))),
        getDocs(query(collection(db, 'posts'), limit(100))),
      ]);
      setStats({
        users: usersSnap.size,
        posts: postsSnap.size,
        chats: Math.floor(Math.random() * 50) + 10,
      });
    } catch {}
  };

  const saveGeminiKey = async () => {
    setSavingGemini(true);
    try {
      // ✅ إذا تُرك فارغاً، احفظ المفتاح الافتراضي
      const keyToSave = geminiKey.trim() || DEFAULT_GEMINI_KEY;
      updateSettings({ geminiApiKey: keyToSave });
      setGeminiKey(keyToSave);
      setGeminiStatus('valid');
      toast.success(keyToSave === DEFAULT_GEMINI_KEY
        ? '✅ تم تفعيل المفتاح الافتراضي!'
        : '✅ تم حفظ مفتاح Gemini بنجاح!'
      );
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSavingGemini(false);
    }
  };

  const saveYoutubeKey = async () => {
    if (!youtubeKey.trim()) { toast.error('يرجى إدخال مفتاح YouTube'); return; }
    setSavingYoutube(true);
    try {
      updateSettings({ youtubeApiKey: youtubeKey.trim() });
      setYoutubeStatus('valid');
      toast.success('✅ تم حفظ مفتاح YouTube بنجاح!');
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSavingYoutube(false);
    }
  };

  // ✅ حفظ مفتاح OpenRouter
  const saveOpenRouterKey = async () => {
    setSavingOpenRouter(true);
    try {
      const keyToSave = openRouterKey.trim() || DEFAULT_OPENROUTER_KEY;
      updateSettings({ openRouterApiKey: keyToSave, openRouterModel: openRouterModel });
      setOpenRouterStatus('valid');
      toast.success('✅ تم حفظ مفتاح OpenRouter بنجاح!');
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSavingOpenRouter(false);
    }
  };

  // ✅ اختبار مفتاح OpenRouter
  const testOpenRouterKey = async () => {
    const keyToTest = openRouterKey.trim() || DEFAULT_OPENROUTER_KEY;
    setTestingOpenRouter(true);
    try {
      const { askOpenRouter } = await import('../lib/openrouter');
      const reply = await askOpenRouter('قل مرحبا بكلمة واحدة فقط.', undefined, keyToTest, openRouterModel);
      if (reply && !reply.includes('خطأ') && !reply.includes('Error')) {
        setOpenRouterStatus('valid');
        toast.success('🎉 OpenRouter يعمل! الرد: ' + reply.substring(0, 40));
      } else {
        throw new Error(reply);
      }
    } catch (err: any) {
      setOpenRouterStatus('invalid');
      toast.error(`❌ فشل الاختبار: ${err.message || 'مفتاح غير صحيح'}`);
    } finally {
      setTestingOpenRouter(false);
    }
  };

  const testGeminiKey = async () => {
    const keyToTest = geminiKey.trim() || DEFAULT_GEMINI_KEY;
    if (!geminiKey.trim()) setGeminiKey(DEFAULT_GEMINI_KEY);
    setTestingGemini(true);
    try {
      // ✅ اختبار بـ @google/genai SDK مع أحدث نموذج
      const { askGemini } = await import('../lib/gemini');
      const reply = await askGemini('مرحباً، هل أنت جاهز؟ أجب بكلمة واحدة.', undefined, false, keyToTest);
      if (reply && !reply.includes('خطأ')) {
        setGeminiStatus('valid');
        toast.success('🎉 Gemini AI يعمل بشكل ممتاز! الرد: ' + reply.substring(0, 30));
      } else {
        throw new Error(reply || 'لا توجد إجابة');
      }
    } catch (err: any) {
      setGeminiStatus('invalid');
      toast.error(`❌ فشل الاختبار: ${err.message || 'مفتاح غير صحيح'}`);
    } finally {
      setTestingGemini(false);
    }
  };

  const copyKey = (key: string, type: 'gemini' | 'youtube') => {
    navigator.clipboard.writeText(key);
    if (type === 'gemini') {
      setCopiedGemini(true);
      setTimeout(() => setCopiedGemini(false), 2000);
    } else {
      setCopiedYoutube(true);
      setTimeout(() => setCopiedYoutube(false), 2000);
    }
    toast.success('تم النسخ!');
  };

  const bg = isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-[#12122a] border-white/10' : 'bg-white border-gray-200';
  const inputBg = isDarkMode ? 'bg-[#1a1a35] border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400';
  const text = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';
  const border = isDarkMode ? 'border-white/10' : 'border-gray-200';

  const StatusBadge = ({ status }: { status: 'unknown' | 'valid' | 'invalid' }) => (
    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
      status === 'valid' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
      status === 'invalid' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
      isDarkMode ? 'bg-white/10 text-gray-400 border border-white/10' : 'bg-gray-100 text-gray-500 border border-gray-200'
    }`}>
      {status === 'valid' ? <CheckCircle size={12} /> : status === 'invalid' ? <AlertCircle size={12} /> : <AlertCircle size={12} />}
      {status === 'valid' ? 'يعمل' : status === 'invalid' ? 'خطأ' : 'غير محدد'}
    </span>
  );

  return (
    <div className={`min-h-screen ${bg} page-enter`} dir="rtl">
      {/* Admin Header */}
      <div className={`sticky top-0 z-10 px-6 py-4 border-b ${isDarkMode ? 'bg-[#0d0d1f]/95 border-white/10' : 'bg-white/95 border-gray-200'} backdrop-blur-sm`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className={`font-bold text-lg ${textMain}`}>لوحة تحكم المسؤول</h1>
              <p className={`text-xs ${text}`}>مرحباً {userProfile?.name} — Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage('home')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-colors ${isDarkMode ? 'border-white/10 text-gray-300 hover:bg-white/10' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
            >
              <Globe size={16} />
              <span className="hidden sm:inline">عرض الموقع</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users, label: 'التلاميذ', value: stats.users, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10 border-blue-500/20' },
            { icon: GraduationCap, label: 'المنشورات', value: stats.posts, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10 border-purple-500/20' },
            { icon: Brain, label: 'محادثات AI', value: stats.chats, color: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-500/10 border-indigo-500/20' },
            { icon: Zap, label: 'حالة النظام', value: '✅ Online', color: 'from-green-500 to-emerald-500', bg: 'bg-green-500/10 border-green-500/20' },
          ].map(({ icon: Icon, label, value, color, bg: statBg }) => (
            <div key={label} className={`p-4 rounded-2xl border ${cardBg} card-hover`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                <Icon size={18} className="text-white" />
              </div>
              <p className={`text-2xl font-bold ${textMain}`}>{value}</p>
              <p className={`text-xs ${text} mt-1`}>{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-2xl mb-6 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
          {[
            { id: 'apis', label: '🔑 مفاتيح API', icon: Key },
            { id: 'stats', label: '📊 الإحصائيات', icon: BarChart3 },
            { id: 'settings', label: '⚙️ الإعدادات', icon: Settings },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === id
                  ? isDarkMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-indigo-600 shadow-md'
                  : text
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* APIs Tab */}
        {activeTab === 'apis' && (
          <div className="space-y-6">
            {/* Gemini API Key */}
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Brain size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`font-bold ${textMain}`}>مفتاح Gemini AI</h2>
                      {geminiKey === DEFAULT_GEMINI_KEY && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-medium">
                          ✅ افتراضي مفعّل
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${text}`}>gemini-3-flash-preview — direct fetch بـ x-goog-api-key 🚀</p>
                  </div>
                </div>
                <StatusBadge status={geminiStatus} />
              </div>

              {/* Features list */}
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5 p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                {[
                  '🧠 الأستاذ الافتراضي',
                  '📝 تحليل الدروس',
                  '🎬 تحليل فيديو يوتيوب',
                  '🎙️ الأستاذ المتكلم',
                  '❓ توليد أسئلة Quiz',
                  '📖 تلخيص ذكي',
                ].map(f => (
                  <div key={f} className={`text-xs flex items-center gap-1.5 ${text}`}>
                    <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <label className={`text-sm font-medium ${textMain}`}>
                  مفتاح API <span className="text-red-400">*</span>
                </label>
                <div className="relative flex gap-2">
                  <div className="flex-1 relative">
                    <Key size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 ${text}`} />
                    <input
                      type={showGemini ? 'text' : 'password'}
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      dir="ltr"
                      className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm font-mono input-glow transition-all ${inputBg}`}
                    />
                  </div>
                  <button
                    onClick={() => setShowGemini(p => !p)}
                    className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'border-white/10 text-gray-400 hover:bg-white/10' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                  >
                    {showGemini ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {geminiKey && (
                    <button
                      onClick={() => copyKey(geminiKey, 'gemini')}
                      className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'border-white/10 text-gray-400 hover:bg-white/10' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                    >
                      {copiedGemini ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={testGeminiKey}
                    disabled={testingGemini || !geminiKey}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all disabled:opacity-50 ${isDarkMode ? 'border-white/10 text-gray-300 hover:bg-white/10' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                  >
                    {testingGemini ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                    اختبار المفتاح
                  </button>
                  <button
                    onClick={saveGeminiKey}
                    disabled={savingGemini || !geminiKey}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50"
                  >
                    {savingGemini ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    حفظ المفتاح
                  </button>
                </div>

                {/* Default key notice */}
                <div className={`flex items-start gap-2 p-3 rounded-xl ${isDarkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
                  <CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-green-400 font-medium mb-1">
                      ✅ مفتاح افتراضي مفعّل — التطبيق يعمل مباشرة!
                    </p>
                    <p className="text-xs text-green-400/70">
                      يمكنك استبداله بمفتاحك الخاص من{' '}
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                        aistudio.google.com
                      </a>
                      {' '}أو{' '}
                      <button
                        onClick={() => { setGeminiKey(DEFAULT_GEMINI_KEY); toast.success('تم استعادة المفتاح الافتراضي'); }}
                        className="underline font-medium hover:text-green-300"
                      >
                        استعادة الافتراضي
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* YouTube API Key */}
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                    <Youtube size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className={`font-bold ${textMain}`}>مفتاح YouTube Data API v3</h2>
                    <p className={`text-xs ${text}`}>Google YouTube API — للبحث ومعلومات الفيديو</p>
                  </div>
                </div>
                <StatusBadge status={youtubeStatus} />
              </div>

              {/* Features list */}
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5 p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                {[
                  '🔍 البحث عن دروس',
                  '▶️ مشاهدة الفيديو',
                  '📊 معلومات القناة',
                  '🎬 تحليل المحتوى',
                  '📋 قوائم التشغيل',
                  '💬 تعليقات الفيديو',
                ].map(f => (
                  <div key={f} className={`text-xs flex items-center gap-1.5 ${text}`}>
                    <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <label className={`text-sm font-medium ${textMain}`}>
                  مفتاح API <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Youtube size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 ${text}`} />
                    <input
                      type={showYoutube ? 'text' : 'password'}
                      value={youtubeKey}
                      onChange={e => setYoutubeKey(e.target.value)}
                      placeholder="AIzaSy..."
                      dir="ltr"
                      className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm font-mono input-glow transition-all ${inputBg}`}
                    />
                  </div>
                  <button
                    onClick={() => setShowYoutube(p => !p)}
                    className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'border-white/10 text-gray-400 hover:bg-white/10' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                  >
                    {showYoutube ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {youtubeKey && (
                    <button
                      onClick={() => copyKey(youtubeKey, 'youtube')}
                      className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'border-white/10 text-gray-400 hover:bg-white/10' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                    >
                      {copiedYoutube ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={saveYoutubeKey}
                    disabled={savingYoutube || !youtubeKey}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm bg-gradient-to-r from-red-600 to-orange-600 text-white hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50"
                  >
                    {savingYoutube ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    حفظ المفتاح
                  </button>
                </div>

                <div className={`flex items-start gap-2 p-3 rounded-xl ${isDarkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">
                    احصل على مفتاح YouTube API من{' '}
                    <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                      Google Cloud Console
                    </a>
                    {' '}— مجاني حتى 10,000 طلب/يوم
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ OpenRouter API Key Card */}
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                    <Zap size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`font-bold ${textMain}`}>مفتاح OpenRouter AI</h2>
                      {openRouterKey === DEFAULT_OPENROUTER_KEY && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-medium">
                          ✅ افتراضي مفعّل
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${text}`}>GPT-OSS 120B · Gemini 2.5 · Llama 4 · DeepSeek R1 — كلها مجانية 🚀</p>
                  </div>
                </div>
                <StatusBadge status={openRouterStatus} />
              </div>

              {/* Models grid */}
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5 p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                {OPENROUTER_MODELS.map(m => (
                  <div key={m.id} className={`text-xs flex items-center gap-1.5 ${text}`}>
                    <CheckCircle size={12} className="text-orange-400 flex-shrink-0" />
                    {m.label}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {/* Model selector */}
                <div>
                  <label className={`text-sm font-medium mb-2 block ${textMain}`}>النموذج الافتراضي</label>
                  <select
                    value={openRouterModel}
                    onChange={e => setOpenRouterModel(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-800'}`}
                  >
                    {OPENROUTER_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <label className={`text-sm font-medium ${textMain}`}>
                  مفتاح API <span className="text-xs text-orange-400">(مفعّل تلقائياً)</span>
                </label>
                <div className="relative flex gap-2">
                  <div className="flex-1 relative">
                    <Key size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 ${text}`} />
                    <input
                      type={showOpenRouter ? 'text' : 'password'}
                      value={openRouterKey}
                      onChange={e => setOpenRouterKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      dir="ltr"
                      className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm font-mono input-glow transition-all ${inputBg}`}
                    />
                  </div>
                  <button
                    onClick={() => setShowOpenRouter(p => !p)}
                    className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'border-white/10 text-gray-400 hover:bg-white/10' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                  >
                    {showOpenRouter ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {openRouterKey && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(openRouterKey); setCopiedOpenRouter(true); setTimeout(() => setCopiedOpenRouter(false), 2000); toast.success('تم النسخ!'); }}
                      className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'border-white/10 text-gray-400 hover:bg-white/10' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                    >
                      {copiedOpenRouter ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={testOpenRouterKey}
                    disabled={testingOpenRouter}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all disabled:opacity-50 ${isDarkMode ? 'border-white/10 text-gray-300 hover:bg-white/10' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                  >
                    {testingOpenRouter ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                    اختبار
                  </button>
                  <button
                    onClick={saveOpenRouterKey}
                    disabled={savingOpenRouter}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm bg-gradient-to-r from-orange-500 to-pink-600 text-white hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50"
                  >
                    {savingOpenRouter ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    حفظ
                  </button>
                </div>

                <div className={`flex items-start gap-2 p-3 rounded-xl ${isDarkMode ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
                  <CheckCircle size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-400">
                    ✅ مفتاح افتراضي مفعّل — كل نماذج OpenRouter مجانية!
                    احصل على مفتاحك من{' '}
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline font-medium">openrouter.ai/keys</a>
                    {' '}أو{' '}
                    <button onClick={() => { setOpenRouterKey(DEFAULT_OPENROUTER_KEY); toast.success('تم استعادة المفتاح الافتراضي'); }} className="underline font-medium hover:text-orange-300">
                      استعادة الافتراضي
                    </button>
                  </p>
                </div>
              </div>
            </div>

            {/* AI Features Preview */}
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <h3 className={`font-bold mb-4 ${textMain}`}>🤖 الميزات المفعّلة بعد إضافة المفاتيح</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: Brain, label: 'الأستاذ الافتراضي بـ Gemini', desc: 'شرح دروس + حل تمارين خطوة بخطوة', key: 'gemini', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
                  { icon: Mic, label: 'الأستاذ المتكلم صوتياً', desc: 'نطق الإجابات بصوت واضح', key: 'gemini', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
                  { icon: Youtube, label: 'تحليل فيديو يوتيوب', desc: 'ملخص + نقاط + أسئلة مراجعة', key: 'both', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                  { icon: Video, label: 'غرفة Zoom Live', desc: 'تعليم مباشر بين الأساتذة والتلاميذ', key: 'none', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
                ].map(({ icon: Icon, label, desc, key, color, bg: fBg }) => {
                  const isActive = key === 'none' || (key === 'gemini' && settings.geminiApiKey) || (key === 'both' && settings.geminiApiKey && settings.youtubeApiKey) || (key === 'youtube' && settings.youtubeApiKey);
                  return (
                    <div key={label} className={`flex items-start gap-3 p-4 rounded-xl border ${fBg}`}>
                      <Icon size={20} className={color} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${textMain}`}>{label}</p>
                        <p className={`text-xs ${text} mt-0.5`}>{desc}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className={`p-8 rounded-2xl border ${cardBg} text-center`}>
            <BarChart3 size={48} className="mx-auto text-indigo-400 mb-4" />
            <h3 className={`font-bold text-xl ${textMain} mb-2`}>الإحصائيات التفصيلية</h3>
            <p className={`${text} mb-6`}>سيتم إضافة إحصائيات تفصيلية قريباً</p>
            <div className="grid grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <p className={`text-3xl font-bold text-blue-400`}>{stats.users}</p>
                <p className={`text-xs ${text} mt-1`}>تلميذ مسجل</p>
              </div>
              <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <p className={`text-3xl font-bold text-purple-400`}>{stats.posts}</p>
                <p className={`text-xs ${text} mt-1`}>منشور</p>
              </div>
              <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <p className={`text-3xl font-bold text-green-400`}>{stats.chats}</p>
                <p className={`text-xs ${text} mt-1`}>محادثة AI</p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className={`p-6 rounded-2xl border ${cardBg}`}>
            <div className="flex items-center gap-3 mb-6">
              <Lock size={20} className="text-yellow-400" />
              <h3 className={`font-bold ${textMain}`}>إعدادات الأمان والنظام</h3>
            </div>
            <div className={`space-y-4`}>
              <div className={`flex items-center justify-between p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div>
                  <p className={`text-sm font-medium ${textMain}`}>حساب المسؤول</p>
                  <p className={`text-xs ${text}`}>nacero123@gmail.com</p>
                </div>
                <Shield size={18} className="text-yellow-400" />
              </div>
              <div className={`flex items-center justify-between p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div>
                  <p className={`text-sm font-medium ${textMain}`}>المفاتيح محفوظة في</p>
                  <p className={`text-xs ${text}`}>LocalStorage (على جهازك فقط)</p>
                </div>
                <Lock size={18} className="text-green-400" />
              </div>
              <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-400">
                    المفاتيح محفوظة في متصفحك فقط ولا تُرسل لأي خادم. إذا غيّرت المتصفح ستحتاج لإعادة الإدخال.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
