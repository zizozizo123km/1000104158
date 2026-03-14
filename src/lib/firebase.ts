import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  type User
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase, ref, set } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAmPFwV1ld4H6CWukHtEoKPg9E2tHWkyxE",
  authDomain: "not-b25f1.firebaseapp.com",
  databaseURL: "https://not-b25f1-default-rtdb.firebaseio.com",
  projectId: "not-b25f1",
  storageBucket: "not-b25f1.firebasestorage.app",
  messagingSenderId: "554877315906",
  appId: "1:554877315906:web:234309f8a149e60afd36db",
  measurementId: "G-9PLRDRTYND"
};

const app = initializeApp(firebaseConfig);

let analytics: any = null;
try { analytics = getAnalytics(app); } catch {}

const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

// ✅ Local persistence
setPersistence(auth, browserLocalPersistence).catch(() => {});

// ✅ waitForAuth — انتظر حتى يُحدَّد حالة Auth بشكل نهائي
export const waitForAuth = (): Promise<User | null> => {
  return new Promise((resolve) => {
    // إذا كان Auth جاهزاً مسبقاً
    if (auth.currentUser !== undefined) {
      resolve(auth.currentUser);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
};

// ✅ getAuthUser — يرجع المستخدم الحالي مع force refresh للـ token
export const getAuthUser = async (): Promise<User | null> => {
  const user = await waitForAuth();
  if (!user) return null;
  try {
    await user.getIdToken(true); // force refresh
  } catch (e) {
    console.warn('Token refresh failed:', e);
  }
  return user;
};

// ✅ testRTDBWrite — اختبار الكتابة للـ RTDB
export const testRTDBWrite = async (): Promise<boolean> => {
  try {
    const user = await waitForAuth();
    if (!user) return false;
    const testRef = ref(rtdb, `_test/${user.uid}`);
    await set(testRef, { ts: Date.now() });
    return true;
  } catch (e: any) {
    console.error('RTDB test write failed:', e?.message);
    return false;
  }
};

export { app, analytics, auth, db, rtdb, storage };
