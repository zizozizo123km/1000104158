# 🎓 Bac DZ AI — منصة البكالوريا الجزائرية

<div align="center">

![Bac DZ AI](https://img.shields.io/badge/Bac%20DZ-AI%20Platform-6366f1?style=for-the-badge&logo=react)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?style=for-the-badge&logo=firebase)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel)

منصة تعليمية متكاملة لتلاميذ البكالوريا الجزائرية مدعومة بالذكاء الاصطناعي

</div>

---

## ✨ المميزات

| الصفحة | الوصف |
|--------|-------|
| 🏠 **الرئيسية** | عرض الشعب والإحصائيات والترحيب |
| 🔐 **تسجيل الدخول** | Firebase Auth + LocalStorage |
| 💬 **الدردشة** | دردشة جماعية حية بـ Firebase RTDB |
| 📚 **المنشورات** | نشر دروس وأسئلة مع تعليقات وإعجابات |
| 🧠 **الأستاذ الافتراضي** | Gemini 3 Flash AI + صوت + Quiz |
| 📝 **تحليل الدروس** | تلخيص + نقاط + خريطة ذهنية |
| 🎬 **يوتيوب تعليمي** | بحث + مشاهدة + تحليل AI |
| 🔍 **البحث** | بحث في الدروس والمنشورات |
| 🖥️ **Zoom Live** | مكالمة فيديو WebRTC داخل التطبيق |
| ⚙️ **Admin** | لوحة تحكم كاملة (nacero123@gmail.com) |

---

## 🚀 تشغيل المشروع

```bash
# تثبيت الحزم
npm install

# تشغيل محلي
npm run dev

# بناء للإنتاج
npm run build

# معاينة البناء
npm run preview
```

---

## 📁 هيكل الملفات

```
bac-dz-ai/
├── 📄 index.html
├── 📄 package.json
├── 📄 vite.config.ts
├── 📄 tailwind.config.ts
├── 📄 tsconfig.json
├── 📄 tsconfig.app.json
├── 📄 tsconfig.node.json
├── 📄 postcss.config.js
├── 📄 eslint.config.js
├── 📄 components.json
├── 📄 vercel.json
├── 📄 .gitignore
├── 📄 .env.example
├── 📄 server.js              ← Socket.io server (اختياري)
└── src/
    ├── 📄 main.tsx
    ├── 📄 App.tsx
    ├── 📄 index.css
    ├── context/
    │   └── AppContext.tsx     ← Global state + Firebase
    ├── lib/
    │   ├── firebase.ts        ← Firebase config
    │   ├── gemini.ts          ← Gemini AI functions
    │   ├── openrouter.ts      ← OpenRouter AI
    │   └── socket.ts          ← Socket.io client
    ├── components/
    │   └── layout/
    │       ├── Navbar.tsx
    │       └── Sidebar.tsx
    ├── pages/
    │   ├── HomePage.tsx
    │   ├── AuthPage.tsx
    │   ├── ChatPage.tsx
    │   ├── PostsPage.tsx
    │   ├── AITeacherPage.tsx
    │   ├── AnalyzerPage.tsx
    │   ├── YouTubePage.tsx
    │   ├── SearchPage.tsx
    │   ├── ZoomRoomPage.tsx
    │   ├── ProfilePage.tsx
    │   └── AdminPage.tsx
    └── utils/
        └── cn.ts
```

---

## 🔧 المتغيرات البيئية

أنشئ ملف `.env` من `.env.example`:

```env
# Firebase
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_DATABASE_URL=your_url
VITE_FIREBASE_PROJECT_ID=your_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id

# AI APIs (اختياري — المفاتيح الافتراضية مدمجة)
VITE_GEMINI_API_KEY=your_gemini_key
VITE_YOUTUBE_API_KEY=your_youtube_key
VITE_OPENROUTER_API_KEY=your_openrouter_key
```

---

## 🔥 Firebase Setup

### Firestore Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Realtime Database Rules:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

---

## 🌐 النشر على Vercel

### الطريقة السريعة:
```bash
npm i -g vercel
vercel login
vercel --prod
```

### عبر GitHub:
```
1. ارفع على GitHub
2. vercel.com → New Project
3. اختر الـ repo
4. Deploy ✅
```

---

## 🛠️ التقنيات المستخدمة

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| React | 19 | Frontend Framework |
| TypeScript | 5 | Type Safety |
| Vite | 6 | Build Tool |
| Tailwind CSS | 4 | Styling |
| Firebase | 12 | Auth + DB + RTDB |
| Gemini AI | 3 Flash | AI Teacher |
| WebRTC | Native | Zoom Live |
| Lucide React | Latest | Icons |
| Framer Motion | 12 | Animations |

---

## 👑 Admin Panel

للدخول إلى لوحة التحكم:
- **Email:** `nacero123@gmail.com`
- **Password:** `adminadmin`

---

## 📱 الشعب المدعومة

- 🔬 علوم تجريبية
- ➗ رياضيات
- 📖 آداب وفلسفة
- ⚙️ تقني رياضي
- 💰 تسيير واقتصاد
- 🌍 لغات أجنبية

---

<div align="center">
صُنع بـ ❤️ لتلاميذ الجزائر
</div>
