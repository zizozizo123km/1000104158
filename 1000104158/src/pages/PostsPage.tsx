import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, doc, updateDoc, increment, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Heart, MessageSquare, Tag, Filter, BookOpen, Send, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Post {
  id: string;
  title: string;
  content: string;
  userId: string;
  userName: string;
  userBranch: string;
  tags: string[];
  createdAt: any;
  likes: number;
  likedBy: string[];
  commentsCount: number;
  type: 'lesson' | 'question' | 'tip';
}

const TAGS = ['رياضيات', 'فيزياء', 'كيمياء', 'فلسفة', 'عربية', 'فرنسية', 'انجليزية', 'تاريخ', 'جغرافيا', 'علوم', 'اقتصاد'];
const TYPES = [
  { id: 'lesson', label: 'درس', emoji: '📚' },
  { id: 'question', label: 'سؤال', emoji: '❓' },
  { id: 'tip', label: 'نصيحة', emoji: '💡' },
];

export default function PostsPage() {
  const { isDarkMode, user, userProfile, setCurrentPage } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [filterTag, setFilterTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', tags: [] as string[], type: 'question' as Post['type'] });

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    });
  }, []);

  const submitPost = async () => {
    if (!user || !userProfile) { toast.error('يجب تسجيل الدخول'); return; }
    if (!newPost.title || !newPost.content) { toast.error('يرجى ملء العنوان والمحتوى'); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, 'posts'), {
        ...newPost,
        userId: user.uid,
        userName: userProfile.name,
        userBranch: userProfile.branch,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        commentsCount: 0,
      });
      setShowCreate(false);
      setNewPost({ title: '', content: '', tags: [], type: 'question' });
      toast.success('تم نشر المنشور بنجاح! 🎉');
    } catch {
      toast.error('فشل النشر، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  const likePost = async (postId: string, likedBy: string[]) => {
    if (!user) { toast.error('يجب تسجيل الدخول'); return; }
    const isLiked = likedBy.includes(user.uid);
    await updateDoc(doc(db, 'posts', postId), {
      likes: increment(isLiked ? -1 : 1),
      likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  };

  const filteredPosts = filterTag ? posts.filter(p => p.tags?.includes(filterTag)) : posts;

  const bg = isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-[#12122a] border-white/10' : 'bg-white border-gray-200';
  const inputBg = isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400';
  const text = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';

  const typeColors: Record<string, string> = {
    lesson: 'bg-blue-500/20 text-blue-400',
    question: 'bg-orange-500/20 text-orange-400',
    tip: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className={`min-h-screen ${bg} page-enter`} dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>المنشورات</h1>
            <p className={`text-sm ${text}`}>{filteredPosts.length} منشور</p>
          </div>
          <button
            onClick={() => user ? setShowCreate(true) : setCurrentPage('login')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            <span>منشور جديد</span>
          </button>
        </div>

        {/* Tags filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          <button
            onClick={() => setFilterTag('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!filterTag ? 'bg-indigo-600 text-white' : isDarkMode ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
          >
            الكل
          </button>
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag === filterTag ? '' : tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterTag === tag ? 'bg-indigo-600 text-white' : isDarkMode ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Create Post Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
            <div className={`w-full max-w-lg rounded-2xl border p-6 ${cardBg}`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className={`font-bold text-lg ${textMain}`}>منشور جديد</h2>
                <button onClick={() => setShowCreate(false)} className={`p-2 rounded-xl ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                  <X size={18} />
                </button>
              </div>

              {/* Type selection */}
              <div className="flex gap-2 mb-4">
                {TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setNewPost(p => ({ ...p, type: t.id as Post['type'] }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${newPost.type === t.id ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300' : isDarkMode ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-600'}`}
                  >
                    <span>{t.emoji}</span>{t.label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <input
                  value={newPost.title}
                  onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))}
                  placeholder="عنوان المنشور..."
                  className={`w-full px-4 py-3 rounded-xl border text-sm input-glow ${inputBg}`}
                />
                <textarea
                  value={newPost.content}
                  onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))}
                  placeholder="محتوى المنشور..."
                  rows={5}
                  className={`w-full px-4 py-3 rounded-xl border text-sm input-glow resize-none ${inputBg}`}
                />
                {/* Tags */}
                <div>
                  <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>الوسوم</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setNewPost(p => ({
                          ...p,
                          tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag]
                        }))}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${newPost.tags.includes(tag) ? 'bg-indigo-600 text-white' : isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={submitPost}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /><span>نشر</span></>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.length === 0 && (
            <div className="text-center py-16">
              <BookOpen size={48} className="mx-auto text-gray-500 mb-3" />
              <p className={text}>لا توجد منشورات بعد</p>
            </div>
          )}
          {filteredPosts.map(post => {
            const isLiked = user ? post.likedBy?.includes(user.uid) : false;
            const timeStr = post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { locale: ar, addSuffix: true }) : '';
            return (
              <div key={post.id} className={`card-hover p-5 rounded-2xl border ${cardBg}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {post.userName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${textMain}`}>{post.userName}</p>
                      <p className={`text-xs ${text}`}>{post.userBranch} · {timeStr}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${typeColors[post.type] || 'bg-gray-500/20 text-gray-400'}`}>
                    {TYPES.find(t => t.id === post.type)?.emoji} {TYPES.find(t => t.id === post.type)?.label}
                  </span>
                </div>

                <h3 className={`font-bold mb-2 ${textMain}`}>{post.title}</h3>
                <p className={`text-sm leading-relaxed ${text} line-clamp-3`}>{post.content}</p>

                {post.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {post.tags.map(tag => (
                      <span key={tag} className={`px-2 py-0.5 rounded-md text-xs ${isDarkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className={`flex items-center gap-4 mt-4 pt-3 border-t ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                  <button
                    onClick={() => likePost(post.id, post.likedBy || [])}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? 'text-red-400' : `${text} hover:text-red-400`}`}
                  >
                    <Heart size={16} className={isLiked ? 'fill-red-400' : ''} />
                    <span>{post.likes || 0}</span>
                  </button>
                  <button className={`flex items-center gap-1.5 text-sm transition-colors ${text} hover:text-indigo-400`}>
                    <MessageSquare size={16} />
                    <span>{post.commentsCount || 0}</span>
                  </button>
                  <button className={`flex items-center gap-1.5 text-sm ${text} hover:text-indigo-400 transition-colors`}>
                    <Tag size={16} />
                    <span>مشاركة</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
