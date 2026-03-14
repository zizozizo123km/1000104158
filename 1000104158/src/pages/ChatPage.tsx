import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, doc, updateDoc, increment, getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Send, Heart, Image, Smile, Users, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userBranch: string;
  createdAt: any;
  likes: number;
  likedBy: string[];
  imageUrl?: string;
}

const channels = [
  { id: 'general', name: 'عام', icon: '#' },
  { id: 'sciences', name: 'علوم تجريبية', icon: '🔬' },
  { id: 'math', name: 'رياضيات', icon: '📐' },
  { id: 'letters', name: 'آداب وفلسفة', icon: '📚' },
  { id: 'tech', name: 'تقني رياضي', icon: '⚙️' },
  { id: 'eco', name: 'تسيير واقتصاد', icon: '📊' },
];

export default function ChatPage() {
  const { isDarkMode, user, userProfile } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [channel, setChannel] = useState('general');
  const [loading, setLoading] = useState(false);
  const [onlineCount] = useState(Math.floor(Math.random() * 50) + 20);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, `channels/${channel}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsub;
  }, [channel]);

  const sendMessage = async () => {
    if (!text.trim() || !user || !userProfile) return;
    if (!user) { toast.error('يجب تسجيل الدخول أولاً'); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, `channels/${channel}/messages`), {
        text: text.trim(),
        userId: user.uid,
        userName: userProfile.name,
        userBranch: userProfile.branch,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
      });
      setText('');
    } catch {
      toast.error('فشل إرسال الرسالة');
    } finally {
      setLoading(false);
    }
  };

  const likeMessage = async (msgId: string, likedBy: string[]) => {
    if (!user) return;
    const msgRef = doc(db, `channels/${channel}/messages`, msgId);
    const alreadyLiked = likedBy.includes(user.uid);
    await updateDoc(msgRef, {
      likes: increment(alreadyLiked ? -1 : 1),
      likedBy: alreadyLiked
        ? likedBy.filter(id => id !== user.uid)
        : [...likedBy, user.uid]
    });
  };

  const bg = isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50';
  const sidebarBg = isDarkMode ? 'bg-[#0d0d1f]' : 'bg-gray-100';
  const msgAreaBg = isDarkMode ? 'bg-[#11112a]' : 'bg-white';
  const inputBg = isDarkMode ? 'bg-[#1a1a35] border-white/10' : 'bg-gray-100 border-gray-200';
  const text_muted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';

  const branchColors: Record<string, string> = {
    'علوم تجريبية': 'text-green-400',
    'رياضيات': 'text-blue-400',
    'آداب وفلسفة': 'text-purple-400',
    'تقني رياضي': 'text-orange-400',
    'تسيير واقتصاد': 'text-yellow-400',
    'لغات أجنبية': 'text-cyan-400',
  };

  return (
    <div className={`flex h-[calc(100vh-56px)] ${bg} page-enter`} dir="rtl">
      {/* Channels Sidebar */}
      <div className={`w-52 flex-shrink-0 ${sidebarBg} border-l ${isDarkMode ? 'border-white/10' : 'border-gray-200'} flex flex-col`}>
        <div className={`p-3 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full pulse-ring"></div>
            <span className={`text-xs font-medium ${text_muted}`}>{onlineCount} متصل الآن</span>
          </div>
        </div>
        <div className="p-2 flex-1 space-y-0.5">
          <p className={`text-xs font-semibold uppercase px-2 py-1 ${text_muted}`}>القنوات</p>
          {channels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                channel === ch.id
                  ? 'bg-indigo-600/20 text-indigo-300'
                  : `${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`
              }`}
            >
              <span className="text-xs">{ch.icon}</span>
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className={`h-12 flex items-center gap-3 px-4 border-b ${isDarkMode ? 'border-white/10 bg-[#0d0d1f]/80' : 'border-gray-200 bg-white/80'} backdrop-blur-sm flex-shrink-0`}>
          <Hash size={16} className="text-indigo-400" />
          <span className={`font-semibold text-sm ${textMain}`}>
            {channels.find(c => c.id === channel)?.name}
          </span>
          <span className={`text-xs ${text_muted}`}>—</span>
          <span className={`text-xs ${text_muted}`}>تواصل مع زملائك</span>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-1 ${msgAreaBg}`}>
          {messages.length === 0 && (
            <div className="text-center py-16">
              <Users size={40} className="mx-auto text-gray-500 mb-3" />
              <p className={text_muted}>لا توجد رسائل بعد، كن أول من يتكلم! 👋</p>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isOwn = msg.userId === user?.uid;
            const prevMsg = messages[idx - 1];
            const showHeader = !prevMsg || prevMsg.userId !== msg.userId;
            const isLiked = user ? msg.likedBy?.includes(user.uid) : false;
            const timeStr = msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { locale: ar, addSuffix: true }) : '';

            return (
              <div key={msg.id} className={`bubble-in group flex items-start gap-3 ${isOwn ? 'flex-row-reverse' : ''} ${showHeader ? 'mt-4' : 'mt-0.5'}`}>
                {showHeader && (
                  <div className={`w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold`}>
                    {msg.userName?.charAt(0).toUpperCase()}
                  </div>
                )}
                {!showHeader && <div className="w-8 flex-shrink-0" />}

                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {showHeader && (
                    <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{msg.userName}</span>
                      <span className={`text-xs ${branchColors[msg.userBranch] || 'text-gray-400'}`}>{msg.userBranch}</span>
                      <span className={`text-xs ${text_muted}`}>{timeStr}</span>
                    </div>
                  )}
                  <div className={`
                    relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${isOwn
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tl-sm'
                      : isDarkMode
                        ? 'bg-[#1a1a35] text-gray-100 rounded-tr-sm border border-white/5'
                        : 'bg-gray-100 text-gray-800 rounded-tr-sm'
                    }
                  `}>
                    {msg.text}
                    {/* Like button */}
                    <button
                      onClick={() => likeMessage(msg.id, msg.likedBy || [])}
                      className={`absolute -bottom-2 ${isOwn ? 'left-2' : 'right-2'} flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shadow-md transition-all
                        ${isDarkMode ? 'bg-[#0d0d1f] border border-white/10' : 'bg-white border border-gray-200'}
                        ${isLiked ? 'text-red-400' : text_muted}
                        opacity-0 group-hover:opacity-100
                      `}
                    >
                      <Heart size={10} className={isLiked ? 'fill-red-400' : ''} />
                      {msg.likes > 0 && <span>{msg.likes}</span>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-white/10 bg-[#0d0d1f]' : 'border-gray-200 bg-white'}`}>
          {!user && (
            <div className={`mb-3 p-3 rounded-xl text-center text-sm ${isDarkMode ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
              يجب{' '}
              <button className="underline font-medium" onClick={() => {}}>تسجيل الدخول</button>
              {' '}للمشاركة في الدردشة
            </div>
          )}
          <div className={`flex items-end gap-3 p-3 rounded-2xl border ${inputBg}`}>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
            >
              <Image size={18} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="اكتب رسالتك... (Enter للإرسال)"
              rows={1}
              disabled={!user}
              className={`flex-1 bg-transparent text-sm resize-none outline-none ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'} max-h-32`}
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim() || loading || !user}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
