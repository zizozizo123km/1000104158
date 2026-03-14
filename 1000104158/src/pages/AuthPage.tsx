import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ADMIN_EMAIL } from '../context/AppContext';
import { GraduationCap, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const branches = [
  'علوم تجريبية', 'رياضيات', 'آداب وفلسفة',
  'تقني رياضي', 'تسيير واقتصاد', 'لغات أجنبية'
];

interface AuthPageProps {
  mode: 'login' | 'register';
}

export default function AuthPage({ mode }: AuthPageProps) {
  const { login, register, setCurrentPage, isDarkMode } = useApp();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', branch: 'علوم تجريبية', year: '2025'
  });

  const bg = isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-[#12122a] border-white/10' : 'bg-white border-gray-200';
  const inputBg = isDarkMode
    ? 'bg-white/5 border-white/10 text-white placeholder-gray-500'
    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400';
  const text = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const labelText = isDarkMode ? 'text-gray-200' : 'text-gray-700';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(form.email.trim(), form.password);
        const isAdminLogin = form.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
        if (isAdminLogin) {
          toast.success('مرحباً بك أيها المسؤول! 👑');
        } else {
          toast.success('مرحباً بك! 👋');
        }
      } else {
        if (!form.name.trim()) {
          toast.error('يرجى إدخال اسمك الكامل');
          return;
        }
        if (!form.email.trim()) {
          toast.error('يرجى إدخال البريد الإلكتروني');
          return;
        }
        if (form.password.length < 6) {
          toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
          return;
        }
        await register(form);
        toast.success('تم إنشاء حسابك بنجاح! 🎉');
      }
    } catch (err: any) {
      console.error('Auth error:', err.code, err.message);
      let msg = 'حدث خطأ، حاول مجدداً';
      switch (err.code) {
        case 'auth/email-already-in-use':
          msg = 'هذا الإيميل مستخدم بالفعل، جرّب تسجيل الدخول'; break;
        case 'auth/wrong-password':
          msg = 'كلمة المرور غير صحيحة'; break;
        case 'auth/user-not-found':
          msg = 'لا يوجد حساب بهذا الإيميل، قم بإنشاء حساب'; break;
        case 'auth/invalid-credential':
          msg = 'بيانات الدخول غير صحيحة، تحقق من الإيميل وكلمة المرور'; break;
        case 'auth/invalid-email':
          msg = 'البريد الإلكتروني غير صالح'; break;
        case 'auth/weak-password':
          msg = 'كلمة المرور ضعيفة جداً (6 أحرف على الأقل)'; break;
        case 'auth/too-many-requests':
          msg = 'تم تجاوز عدد المحاولات، انتظر قليلاً ثم حاول مجدداً'; break;
        case 'auth/network-request-failed':
          msg = 'تحقق من اتصالك بالإنترنت'; break;
        default:
          msg = err.message || 'حدث خطأ غير متوقع';
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center px-4 py-8 page-enter`} dir="rtl">
      {/* خلفية متحركة */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className={`relative w-full max-w-md border rounded-2xl p-8 ${cardBg} shadow-2xl`}>

        {/* لوغو */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-lg mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 glow-purple">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className={`text-2xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {mode === 'login' ? 'مرحباً بعودتك! 👋' : 'انضم إلى Bac DZ AI 🎓'}
          </h1>
          <p className={`mt-2 text-sm ${text}`}>
            {mode === 'login' ? 'ادخل بياناتك للمتابعة' : 'أنشئ حسابك المجاني وابدأ التعلم'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* اسم المستخدم - للتسجيل فقط */}
          {mode === 'register' && (
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>الاسم الكامل</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="أدخل اسمك الكامل"
                className={`w-full px-4 py-3 rounded-xl border text-sm input-glow transition-all ${inputBg}`}
                required
              />
            </div>
          )}

          {/* البريد الإلكتروني */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>البريد الإلكتروني</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="example@email.com"
              className={`w-full px-4 py-3 rounded-xl border text-sm input-glow transition-all ${inputBg}`}
              required
              dir="ltr"
            />
          </div>

          {/* كلمة المرور */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>كلمة المرور</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm input-glow transition-all ${inputBg}`}
                required
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${text} hover:text-indigo-400 transition-colors`}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* الشعبة والسنة - للتسجيل فقط */}
          {mode === 'register' && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>الشعبة</label>
                <select
                  value={form.branch}
                  onChange={e => setForm(p => ({ ...p, branch: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border text-sm input-glow transition-all ${inputBg}`}
                >
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${labelText}`}>سنة البكالوريا</label>
                <select
                  value={form.year}
                  onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border text-sm input-glow transition-all ${inputBg}`}
                >
                  {['2025', '2026', '2027'].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {/* زر الإرسال */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* رابط التبديل */}
        <div className={`mt-6 text-center text-sm ${text}`}>
          {mode === 'login' ? (
            <>
              ليس لديك حساب؟{' '}
              <button
                onClick={() => setCurrentPage('register')}
                className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
              >
                سجّل الآن
              </button>
            </>
          ) : (
            <>
              لديك حساب بالفعل؟{' '}
              <button
                onClick={() => setCurrentPage('login')}
                className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
              >
                سجّل الدخول
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
