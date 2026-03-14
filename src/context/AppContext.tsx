import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// ✅ استيراد النموذج والدوال من lib/gemini و lib/openrouter
import { geminiModel } from '../lib/gemini';
import { DEFAULT_OPENROUTER_KEY, OPENROUTER_MODEL } from '../lib/openrouter';

// ✅ إعادة تصدير كل شيء من lib/gemini لاستخدامه في الصفحات
export { geminiModel as GEMINI_MODEL } from '../lib/gemini';
export { askGemini, askGeminiStream, generateQuiz, analyzeLesson, analyzeYouTubeVideo } from '../lib/gemini';

// ✅ إعادة تصدير OpenRouter
export {
  askOpenRouter,
  askOpenRouterStream,
  generateQuizOpenRouter,
  analyzeLessonOpenRouter,
  analyzeYouTubeOpenRouter,
  OPENROUTER_MODEL,
  OPENROUTER_MODELS,
  DEFAULT_OPENROUTER_KEY,
} from '../lib/openrouter';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  branch: string;
  year: string;
  avatar?: string;
  code?: string;
  createdAt?: string;
  points?: number;
  level?: string;
  isAdmin?: boolean;
}

export interface AppSettings {
  geminiApiKey: string;
  youtubeApiKey: string;
  geminiModel: string;
  openRouterApiKey: string;
  openRouterModel: string;
}

interface AppContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  loading: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  isAdmin: boolean;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  branch: string;
  year: string;
}

// ✅ بيانات المسؤول الثابتة
export const ADMIN_EMAIL = 'nacero123@gmail.com';
export const ADMIN_PASSWORD = 'adminadmin';

const AppContext = createContext<AppContextType | undefined>(undefined);

// ✅ المفتاح الافتراضي لـ Gemini API — يعمل مباشرة بدون إعداد
const DEFAULT_GEMINI_API_KEY = 'AIzaSyBey6R_bFCswa5C7NiuZgmSQVtVM8AyS5E';

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: DEFAULT_GEMINI_API_KEY,
  youtubeApiKey: '',
  geminiModel: geminiModel,
  openRouterApiKey: DEFAULT_OPENROUTER_KEY,
  openRouterModel: OPENROUTER_MODEL,
};

// ✅ Storage key ثابت لتحديث فوري عبر كل الصفحات
const SETTINGS_KEY = 'bac_dz_settings';

const loadSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        geminiApiKey: parsed.geminiApiKey && parsed.geminiApiKey.trim() !== ''
          ? parsed.geminiApiKey
          : DEFAULT_GEMINI_API_KEY,
        geminiModel: geminiModel,
      };
    }
  } catch {}
  return DEFAULT_SETTINGS;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  // ✅ مستمع لتغييرات localStorage من أي مكان في التطبيق
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SETTINGS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed, geminiModel: geminiModel });
        } catch {}
      }
    };

    const handleCustomSettingsUpdate = () => {
      setSettings(loadSettings());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bac_settings_updated', handleCustomSettingsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bac_settings_updated', handleCustomSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) setIsDarkMode(savedMode === 'true');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const adminStatus = firebaseUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        setIsAdmin(adminStatus);

        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const profileData = { ...docSnap.data(), isAdmin: adminStatus } as UserProfile;
          setUserProfile(profileData);
        } else if (adminStatus) {
          const adminProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: 'المسؤول',
            email: ADMIN_EMAIL,
            branch: 'إدارة',
            year: '2025',
            code: 'ADMIN001',
            avatar: '',
            createdAt: new Date().toISOString(),
            points: 9999,
            level: 'مسؤول',
            isAdmin: true,
          };
          await setDoc(docRef, adminProfile);
          setUserProfile(adminProfile);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      localStorage.setItem('darkMode', String(!prev));
      return !prev;
    });
  };

  // ✅ updateSettings — يحفظ ويُطلق حدث فوري لتحديث كل الصفحات
  const updateSettings = (s: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = {
        ...prev,
        ...s,
        geminiApiKey: (s.geminiApiKey && s.geminiApiKey.trim() !== '')
          ? s.geminiApiKey.trim()
          : (prev.geminiApiKey || DEFAULT_GEMINI_API_KEY),
        geminiModel: geminiModel,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('bac_settings_updated'));
      return next;
    });
  };

  // ✅ تسجيل الدخول مع دعم إنشاء حساب الأدمن تلقائياً
  const login = async (email: string, password: string) => {
    const isAdminAttempt = email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const adminStatus = cred.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setIsAdmin(adminStatus);

      const docRef = doc(db, 'users', cred.user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile({ ...docSnap.data(), isAdmin: adminStatus } as UserProfile);
      } else if (adminStatus) {
        const adminProfile: UserProfile = {
          uid: cred.user.uid,
          name: 'المسؤول',
          email: ADMIN_EMAIL,
          branch: 'إدارة',
          year: '2025',
          code: 'ADMIN001',
          avatar: '',
          createdAt: new Date().toISOString(),
          points: 9999,
          level: 'مسؤول',
          isAdmin: true,
        };
        await setDoc(docRef, adminProfile);
        setUserProfile(adminProfile);
      }

      if (adminStatus) {
        setCurrentPage('admin');
      } else {
        setCurrentPage('home');
      }
    } catch (err: any) {
      if (isAdminAttempt && (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-email'
      )) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
          const adminProfile: UserProfile = {
            uid: cred.user.uid,
            name: 'المسؤول',
            email: ADMIN_EMAIL,
            branch: 'إدارة',
            year: '2025',
            code: 'ADMIN001',
            avatar: '',
            createdAt: new Date().toISOString(),
            points: 9999,
            level: 'مسؤول',
            isAdmin: true,
          };
          await setDoc(doc(db, 'users', cred.user.uid), adminProfile);
          setUserProfile(adminProfile);
          setIsAdmin(true);
          setCurrentPage('admin');
          return;
        } catch (createErr: any) {
          throw createErr;
        }
      }
      throw err;
    }
  };

  const register = async ({ name, email, password, branch, year }: RegisterData) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const code = 'BAC' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const adminStatus = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const profile: UserProfile = {
      uid: cred.user.uid,
      name,
      email,
      branch,
      year,
      code,
      avatar: '',
      createdAt: new Date().toISOString(),
      points: 0,
      level: 'مبتدئ',
      isAdmin: adminStatus,
    };
    await setDoc(doc(db, 'users', cred.user.uid), profile);
    setUserProfile(profile);
    setIsAdmin(adminStatus);
    if (adminStatus) {
      setCurrentPage('admin');
    } else {
      setCurrentPage('home');
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setIsAdmin(false);
    setCurrentPage('home');
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, data);
    setUserProfile(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <AppContext.Provider value={{
      user, userProfile, isDarkMode, toggleDarkMode, loading,
      sidebarOpen, setSidebarOpen, currentPage, setCurrentPage,
      login, register, logout, updateProfile,
      isAdmin, settings, updateSettings,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ✅ callGeminiAPI — للتوافق مع الكود القديم (تستدعي askGemini من lib/gemini داخلياً)
import { askGemini } from '../lib/gemini';

export const callGeminiAPI = async (
  prompt: string,
  apiKey: string,
  _model?: string,
  systemInstruction?: string
): Promise<string> => {
  return askGemini(prompt, systemInstruction, false, apiKey);
};
