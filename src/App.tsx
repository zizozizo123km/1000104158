import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import PostsPage from './pages/PostsPage';
import AITeacherPage from './pages/AITeacherPage';
import AnalyzerPage from './pages/AnalyzerPage';
import YouTubePage from './pages/YouTubePage';
import SearchPage from './pages/SearchPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import ZoomRoomPage from './pages/ZoomRoomPage';
import { Loader2, GraduationCap } from 'lucide-react';

function AppContent() {
  const { currentPage, isDarkMode, loading, isAdmin } = useApp();

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50'}`}>
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl pulse-ring">
          <GraduationCap size={32} className="text-white" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 size={20} className="animate-spin text-indigo-400" />
          <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>جاري التحميل...</span>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'login': return <AuthPage mode="login" />;
      case 'register': return <AuthPage mode="register" />;
      case 'chat': return <ChatPage />;
      case 'posts': return <PostsPage />;
      case 'ai': return <AITeacherPage />;
      case 'analyzer': return <AnalyzerPage />;
      case 'youtube': return <YouTubePage />;
      case 'zoom': return <ZoomRoomPage />;
      case 'search': return <SearchPage />;
      case 'profile': return <ProfilePage />;
      case 'admin': return isAdmin ? <AdminPage /> : <HomePage />;
      default: return <HomePage />;
    }
  };

  const fullScreenPages = ['login', 'register'];
  const isFullScreen = fullScreenPages.includes(currentPage);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      {isFullScreen ? (
        // صفحات تسجيل الدخول والتسجيل بدون sidebar
        renderPage()
      ) : (
        // باقي الصفحات (بما فيها Admin) مع Sidebar كامل
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
            <Navbar />
            <main className="flex-1 overflow-y-auto">
              {renderPage()}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1a2e',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontFamily: 'Cairo, Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#6366f1', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: 'white' },
          },
        }}
      />
    </AppProvider>
  );
}
