import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  GraduationCap, Users, BookOpen, MessageSquare, Brain,
  Sparkles, ArrowRight, Star, Zap, Shield, ChevronRight,
  TrendingUp, Award
} from 'lucide-react';

const branches = [
  { id: 'sciences', name: 'علوم تجريبية', icon: '🔬', color: 'from-green-500 to-emerald-600', students: '15K+' },
  { id: 'math', name: 'رياضيات', icon: '📐', color: 'from-blue-500 to-indigo-600', students: '12K+' },
  { id: 'letters', name: 'آداب وفلسفة', icon: '📚', color: 'from-purple-500 to-violet-600', students: '8K+' },
  { id: 'tech', name: 'تقني رياضي', icon: '⚙️', color: 'from-orange-500 to-red-600', students: '6K+' },
  { id: 'eco', name: 'تسيير واقتصاد', icon: '📊', color: 'from-yellow-500 to-amber-600', students: '10K+' },
  { id: 'langs', name: 'لغات أجنبية', icon: '🌍', color: 'from-cyan-500 to-teal-600', students: '5K+' },
];

const features = [
  { icon: Brain, title: 'أستاذ AI ذكي', desc: 'شرح تفصيلي لكل درس باللهجة الجزائرية أو العربية الفصحى', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { icon: MessageSquare, title: 'دردشة تفاعلية', desc: 'تواصل مع زملائك في بيئة آمنة ومنظمة', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { icon: BookOpen, title: 'منشورات تعليمية', desc: 'شارك دروسك وأسئلتك مع آلاف التلاميذ', color: 'text-green-400', bg: 'bg-green-500/10' },
  { icon: Zap, title: 'تحليل فوري', desc: 'لخّص أي درس أو فيديو في ثوانٍ بالذكاء الاصطناعي', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
];

export default function HomePage() {
  const { isDarkMode, setCurrentPage, user, userProfile } = useApp();
  const [stats, setStats] = useState({ users: 0, posts: 0, messages: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRef = doc(db, 'stats', 'global');
        const statsSnap = await getDoc(statsRef);
        if (statsSnap.exists()) {
          setStats(statsSnap.data() as typeof stats);
        } else {
          await setDoc(statsRef, { users: 1240, posts: 3567, messages: 28900 });
          setStats({ users: 1240, posts: 3567, messages: 28900 });
        }
      } catch {
        setStats({ users: 1240, posts: 3567, messages: 28900 });
      }
    };
    fetchStats();
  }, []);

  const bg = isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-[#12122a]' : 'bg-white';
  const text = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const border = isDarkMode ? 'border-white/10' : 'border-gray-200';

  return (
    <div className={`min-h-screen ${bg} page-enter`} dir="rtl">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 sm:px-8 pt-12 pb-16">
        {/* Background gradient blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-600/20 border border-indigo-500/30 mb-6">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="text-sm text-indigo-300 font-medium">منصة البكالوريا الجزائرية #1</span>
          </div>

          {/* Heading */}
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            تفوّق في{' '}
            <span className="gradient-text">البكالوريا</span>
            <br />مع قوة الذكاء الاصطناعي
          </h1>
          <p className={`text-lg sm:text-xl ${text} max-w-2xl mx-auto mb-8`}>
            منصة تعليمية متكاملة تجمع بين الذكاء الاصطناعي والمجتمع الطلابي، مصممة خصيصاً لتلاميذ البكالوريا الجزائرية 🇩🇿
          </p>

          {/* CTA Buttons */}
          {!user ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setCurrentPage('register')}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all hover:-translate-y-0.5 glow-purple"
              >
                <span>ابدأ مجاناً الآن</span>
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setCurrentPage('ai')}
                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold border transition-all hover:-translate-y-0.5 ${isDarkMode ? 'border-white/20 text-gray-200 hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
              >
                <Brain size={18} />
                <span>جرّب الأستاذ AI</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className={`px-6 py-3 rounded-xl ${isDarkMode ? 'bg-indigo-600/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'} font-medium`}>
                أهلاً بعودتك، {userProfile?.name}! 👋
              </div>
              <button
                onClick={() => setCurrentPage('ai')}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                <Brain size={18} />
                <span>اسأل الأستاذ AI</span>
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { label: 'تلميذ', value: stats.users.toLocaleString() + '+', icon: Users },
              { label: 'منشور', value: stats.posts.toLocaleString() + '+', icon: BookOpen },
              { label: 'رسالة', value: stats.messages.toLocaleString() + '+', icon: MessageSquare },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className={`p-4 rounded-2xl ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'} text-center`}>
                <Icon size={20} className="text-indigo-400 mx-auto mb-1" />
                <p className={`text-xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
                <p className={`text-xs ${text}`}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Branches Section */}
      <section className="px-4 sm:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>اختر شعبتك</h2>
            <p className={`mt-2 ${text}`}>محتوى مخصص لكل شعبة من شعب البكالوريا الجزائرية</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => setCurrentPage(user ? 'posts' : 'register')}
                className={`card-hover p-5 rounded-2xl border text-right group ${isDarkMode ? 'bg-[#12122a] border-white/10 hover:border-indigo-500/50' : 'bg-white border-gray-200 hover:border-indigo-300'}`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${branch.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
                  {branch.icon}
                </div>
                <p className={`font-bold text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{branch.name}</p>
                <p className={`text-xs flex items-center gap-1 ${text}`}>
                  <Users size={11} />
                  {branch.students} تلميذ
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 sm:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>كل ما تحتاجه في مكان واحد</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {features.map(({ icon: Icon, title, desc, color, bg: featureBg }) => (
              <div
                key={title}
                className={`card-hover p-6 rounded-2xl border ${isDarkMode ? 'bg-[#12122a] border-white/10' : 'bg-white border-gray-200'}`}
              >
                <div className={`w-12 h-12 rounded-xl ${featureBg} flex items-center justify-center mb-4`}>
                  <Icon size={22} className={color} />
                </div>
                <h3 className={`font-bold text-base mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                <p className={`text-sm ${text}`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions for logged-in users */}
      {user && (
        <section className="px-4 sm:px-8 py-10">
          <div className="max-w-5xl mx-auto">
            <h2 className={`text-xl font-bold mb-5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>وصول سريع</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'الدردشة', icon: MessageSquare, page: 'chat', color: 'from-blue-600 to-indigo-600' },
                { label: 'الأستاذ AI', icon: Brain, page: 'ai', color: 'from-purple-600 to-pink-600' },
                { label: 'المنشورات', icon: BookOpen, page: 'posts', color: 'from-green-600 to-emerald-600' },
                { label: 'البحث', icon: TrendingUp, page: 'search', color: 'from-orange-600 to-red-600' },
              ].map(({ label, icon: Icon, page, color }) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`flex flex-col items-center gap-2 p-5 rounded-2xl bg-gradient-to-br ${color} text-white font-medium hover:-translate-y-1 transition-all shadow-lg`}
                >
                  <Icon size={24} />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      {!user && (
        <section className="px-4 sm:px-8 py-10">
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-center">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
              <div className="relative">
                <Award size={48} className="mx-auto mb-4 opacity-80" />
                <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">انضم إلى أكثر من 1200 تلميذ</h2>
                <p className="text-indigo-100 mb-6 max-w-xl mx-auto">سجّل مجاناً وابدأ رحلتك نحو التفوق في البكالوريا مع مساعدة الذكاء الاصطناعي</p>
                <button
                  onClick={() => setCurrentPage('register')}
                  className="px-8 py-3.5 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
                >
                  سجّل مجاناً الآن
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
