import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Mail, BookOpen, Calendar, Copy, Check, Award, LogOut, Edit3, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

const branches = [
  'علوم تجريبية', 'رياضيات', 'آداب وفلسفة',
  'تقني رياضي', 'تسيير واقتصاد', 'لغات أجنبية'
];

export default function ProfilePage() {
  const { isDarkMode, userProfile, logout, updateProfile, setCurrentPage } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: userProfile?.name || '', branch: userProfile?.branch || '' });
  const [codeCopied, setCodeCopied] = useState(false);

  const bg = isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-[#12122a] border-white/10' : 'bg-white border-gray-200';
  const inputBg = isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900';
  const text = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';

  const copyCode = () => {
    if (userProfile?.code) {
      navigator.clipboard.writeText(userProfile.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
      toast.success('تم نسخ الكود!');
    }
  };

  const saveProfile = async () => {
    await updateProfile(form);
    setEditing(false);
    toast.success('تم حفظ التغييرات!');
  };

  if (!userProfile) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <button onClick={() => setCurrentPage('login')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl">تسجيل الدخول</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} page-enter`} dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Card */}
        <div className={`p-6 rounded-2xl border ${cardBg}`}>
          <div className="flex items-start gap-4 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {userProfile.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl border text-sm input-glow ${inputBg}`}
                  />
                  <select
                    value={form.branch}
                    onChange={e => setForm(p => ({ ...p, branch: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`}
                  >
                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={saveProfile} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs">
                      <Save size={13} /> حفظ
                    </button>
                    <button onClick={() => setEditing(false)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border ${isDarkMode ? 'border-white/20 text-gray-300' : 'border-gray-300 text-gray-600'}`}>
                      <X size={13} /> إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className={`text-xl font-bold ${textMain}`}>{userProfile.name}</h1>
                    <button onClick={() => setEditing(true)} className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                      <Edit3 size={14} />
                    </button>
                  </div>
                  <p className={`text-sm ${text}`}>{userProfile.branch}</p>
                  <p className={`text-xs ${text} mt-1`}>سنة البكالوريا: {userProfile.year}</p>
                </>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Mail, label: 'البريد الإلكتروني', value: userProfile.email },
              { icon: BookOpen, label: 'الشعبة', value: userProfile.branch },
              { icon: Calendar, label: 'سنة التسجيل', value: userProfile.createdAt ? new Date(userProfile.createdAt).getFullYear().toString() : '2025' },
              { icon: Award, label: 'المستوى', value: userProfile.level || 'مبتدئ' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className={`p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className="text-indigo-400" />
                  <span className={`text-xs ${text}`}>{label}</span>
                </div>
                <p className={`text-sm font-medium ${textMain} truncate`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Access Code */}
        <div className={`p-5 rounded-2xl border ${cardBg}`}>
          <h3 className={`font-bold mb-3 ${textMain}`}>كودك الخاص</h3>
          <div className={`flex items-center gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
            <code className={`flex-1 text-lg font-mono font-bold text-indigo-400 tracking-widest`}>
              {userProfile.code}
            </code>
            <button onClick={copyCode} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
              {codeCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>
          <p className={`text-xs ${text} mt-2`}>شارك هذا الكود مع زملائك لإضافتك كصديق</p>
        </div>

        {/* Stats */}
        <div className={`p-5 rounded-2xl border ${cardBg}`}>
          <h3 className={`font-bold mb-4 ${textMain}`}>إحصائياتك</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'نقاط', value: userProfile.points || 0, color: 'text-yellow-400' },
              { label: 'منشورات', value: 0, color: 'text-blue-400' },
              { label: 'إجابات', value: 0, color: 'text-green-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className={`text-xs ${text}`}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); setCurrentPage('home'); }}
          className="w-full flex items-center justify-center gap-2 py-3 text-red-400 border border-red-500/30 rounded-2xl hover:bg-red-500/10 transition-colors font-medium"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
