import { Menu, Bell, Search, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Navbar() {
  const { isDarkMode, sidebarOpen, setSidebarOpen, currentPage, userProfile, user, setCurrentPage } = useApp();

  const pageTitles: Record<string, { ar: string; en: string }> = {
    home: { ar: 'الرئيسية', en: 'Home' },
    chat: { ar: 'الدردشة العامة', en: 'Community Chat' },
    posts: { ar: 'المنشورات', en: 'Posts' },
    ai: { ar: 'الأستاذ الافتراضي AI', en: 'AI Teacher' },
    analyzer: { ar: 'تحليل الدروس', en: 'Lesson Analyzer' },
    youtube: { ar: 'تحليل فيديو يوتيوب', en: 'YouTube Analyzer' },
    search: { ar: 'البحث', en: 'Search' },
    login: { ar: 'تسجيل الدخول', en: 'Login' },
    register: { ar: 'إنشاء حساب', en: 'Register' },
    profile: { ar: 'الملف الشخصي', en: 'Profile' },
  };

  const title = pageTitles[currentPage] || { ar: 'Bac DZ AI', en: '' };

  const navBg = isDarkMode
    ? 'bg-[#0d0d1f]/80 border-white/10'
    : 'bg-white/80 border-gray-200';

  return (
    <header className={`
      sticky top-0 z-30 h-14 flex items-center px-4 gap-4 border-b
      backdrop-blur-xl ${navBg}
    `}>
      {/* Menu toggle (mobile) */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`lg:hidden p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="flex-1">
        <h1 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {title.ar}
        </h1>
        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{title.en}</p>
      </div>

      {/* AI Badge */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30">
        <Sparkles size={12} className="text-indigo-400" />
        <span className="text-xs text-indigo-400 font-medium">Powered by AI</span>
      </div>

      {/* Search button */}
      <button
        onClick={() => setCurrentPage('search')}
        className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}
      >
        <Search size={18} />
      </button>

      {/* Notifications */}
      <button className={`relative p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}>
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
      </button>

      {/* User avatar */}
      {user && userProfile ? (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer" onClick={() => setCurrentPage('profile')}>
          {userProfile.name?.charAt(0).toUpperCase()}
        </div>
      ) : (
        <button
          onClick={() => setCurrentPage('login')}
          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          دخول
        </button>
      )}
    </header>
  );
}
