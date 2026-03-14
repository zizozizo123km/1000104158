import { useApp } from '../../context/AppContext';
import {
  Home, MessageSquare, BookOpen, Brain, FileText,
  Youtube, Search, LogOut, Sun, Moon, X,
  GraduationCap, ChevronRight, Settings, Sparkles,
  Shield, Video
} from 'lucide-react';

const navItems = [
  { id: 'home', icon: Home, label: 'الرئيسية' },
  { id: 'chat', icon: MessageSquare, label: 'الدردشة' },
  { id: 'posts', icon: BookOpen, label: 'المنشورات' },
  { id: 'ai', icon: Brain, label: 'الأستاذ AI' },
  { id: 'analyzer', icon: FileText, label: 'تحليل الدروس' },
  { id: 'youtube', icon: Youtube, label: 'يوتيوب تعليمي' },
  { id: 'zoom', icon: Video, label: 'غرف مباشرة' },
  { id: 'search', icon: Search, label: 'البحث' },
];

export default function Sidebar() {
  const {
    isDarkMode, toggleDarkMode, sidebarOpen, setSidebarOpen,
    currentPage, setCurrentPage, user, userProfile, logout, isAdmin
  } = useApp();

  const bg = isDarkMode ? 'bg-[#0d0d1f] border-white/10' : 'bg-white border-gray-200';
  const text = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const activeText = isDarkMode ? 'text-white' : 'text-indigo-700';
  const activeBg = isDarkMode ? 'bg-indigo-600/20' : 'bg-indigo-50';
  const hoverBg = isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-100';

  const navigate = (page: string) => {
    if (!user && !['home', 'login', 'register'].includes(page)) {
      setCurrentPage('login');
    } else {
      setCurrentPage(page);
    }
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 sidebar-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 w-64 border-r flex flex-col
        transition-transform duration-300 ease-in-out
        ${bg}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg glow-purple">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm gradient-text">Bac DZ AI</p>
              <p className={`text-xs ${text}`}>منصة البكالوريا</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`lg:hidden p-1.5 rounded-lg ${hoverBg} ${text}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* User Card */}
        {user && userProfile ? (
          <button
            onClick={() => navigate('profile')}
            className={`mx-3 mt-3 p-3 rounded-xl ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} flex items-center gap-3 transition-colors`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${isAdmin ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-gradient-to-br from-indigo-500 to-purple-500'}`}>
              {isAdmin ? <Shield size={16} /> : userProfile.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {userProfile.name}
                {isAdmin && <span className="text-xs text-yellow-400 mr-1">👑</span>}
              </p>
              <p className={`text-xs truncate ${text}`}>{isAdmin ? 'مسؤول النظام' : userProfile.branch}</p>
            </div>
            <ChevronRight size={14} className={text} />
          </button>
        ) : (
          <div className="mx-3 mt-3 flex gap-2">
            <button
              onClick={() => setCurrentPage('login')}
              className="flex-1 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              دخول
            </button>
            <button
              onClick={() => setCurrentPage('register')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg border ${isDarkMode ? 'border-white/20 text-gray-300 hover:bg-white/5' : 'border-gray-300 text-gray-600 hover:bg-gray-50'} transition-colors`}
            >
              تسجيل
            </button>
          </div>
        )}

        {/* Admin button */}
        {isAdmin && (
          <button
            onClick={() => navigate('admin')}
            className={`mx-3 mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentPage === 'admin'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20'
            }`}
          >
            <Shield size={16} />
            <span>لوحة التحكم</span>
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse mr-auto" />
          </button>
        )}

        {/* Nav Items */}
        <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto">
          {navItems.map(({ id, icon: Icon, label }) => {
            const isActive = currentPage === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200 relative group
                  ${isActive ? `${activeBg} ${activeText} sidebar-active` : `${text} ${hoverBg}`}
                `}
              >
                <Icon size={18} className={isActive ? 'text-indigo-400' : ''} />
                <span className="font-cairo">{label}</span>
                {isActive && (
                  <div className="absolute left-3">
                    <Sparkles size={12} className="text-indigo-400" />
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className={`p-3 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'} space-y-1`}>
          <button
            onClick={toggleDarkMode}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${text} ${hoverBg}`}
          >
            {isDarkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-indigo-500" />}
            <span>{isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
          </button>
          {user && (
            <>
              <button
                onClick={() => navigate('profile')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${text} ${hoverBg}`}
              >
                <Settings size={18} />
                <span>الإعدادات</span>
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-red-400 hover:bg-red-500/10"
              >
                <LogOut size={18} />
                <span>خروج</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
