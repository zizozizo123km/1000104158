import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, BookOpen, MessageSquare, Youtube, Loader2, ExternalLink, Filter } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'post' | 'youtube';
  title: string;
  description: string;
  tags?: string[];
  url?: string;
  author?: string;
}

const youtubeResults = [
  { id: 'y1', title: 'شرح الاشتقاق - البكالوريا رياضيات', channel: 'استاذ محمد', views: '125K', duration: '24:15' },
  { id: 'y2', title: 'حل تمارين الفيزياء بكالوريا 2024', channel: 'قناة العلوم', views: '89K', duration: '35:42' },
  { id: 'y3', title: 'فلسفة البكالوريا - مقالة نموذجية', channel: 'استاذة سارة', views: '67K', duration: '18:30' },
  { id: 'y4', title: 'كيمياء عضوية شاملة للبكالوريا', channel: 'الكيمياء الجزائرية', views: '45K', duration: '42:10' },
  { id: 'y5', title: 'اللغة العربية - تحليل نص أدبي', channel: 'اللغة العربية', views: '38K', duration: '29:05' },
];

export default function SearchPage() {
  const { isDarkMode } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [ytResults, setYtResults] = useState(youtubeResults);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'posts' | 'youtube'>('all');
  const [searched, setSearched] = useState(false);

  const bg = isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-[#12122a] border-white/10' : 'bg-white border-gray-200';
  const inputBg = isDarkMode ? 'bg-[#1a1a35] border-white/10 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';
  const text = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      // Search in Firebase posts
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const filtered = allPosts.filter((p: any) =>
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setResults(filtered.map((p: any) => ({
        id: p.id,
        type: 'post' as const,
        title: p.title,
        description: p.content?.substring(0, 120) + '...',
        tags: p.tags,
        author: p.userName,
      })));

      // Filter YouTube results
      const filteredYt = youtubeResults.filter(v =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.channel.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setYtResults(filteredYt.length > 0 ? filteredYt : youtubeResults.slice(0, 3));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const popularSearches = ['رياضيات', 'فيزياء', 'فلسفة', 'كيمياء', 'باكالوريا 2025', 'امتحانات'];

  return (
    <div className={`min-h-screen ${bg} page-enter`} dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${textMain}`}>البحث</h1>
          <p className={`${text}`}>ابحث في المنشورات والفيديوهات التعليمية</p>
        </div>

        {/* Search Bar */}
        <div className={`flex gap-3 p-2 rounded-2xl border ${isDarkMode ? 'bg-[#12122a] border-white/10' : 'bg-white border-gray-200'} mb-6 shadow-lg`}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="ابحث عن درس، سؤال، مادة..."
            className={`flex-1 px-4 py-2 bg-transparent text-sm outline-none ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
          />
          <button
            onClick={doSearch}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>بحث</span>
          </button>
        </div>

        {/* Popular searches */}
        {!searched && (
          <div className="mb-8">
            <p className={`text-sm font-medium mb-3 ${text}`}>البحث الشائع:</p>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map(s => (
                <button
                  key={s}
                  onClick={() => { setSearchQuery(s); }}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${isDarkMode ? 'border-white/10 text-gray-300 hover:bg-white/10' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                >
                  🔍 {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {searched && (
          <div className="flex gap-2 mb-6">
            {[
              { id: 'all', label: 'الكل', icon: Filter },
              { id: 'posts', label: 'المنشورات', icon: BookOpen },
              { id: 'youtube', label: 'يوتيوب', icon: Youtube },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveFilter(id as typeof activeFilter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  activeFilter === id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : isDarkMode
                      ? 'border-white/10 text-gray-400 hover:bg-white/5'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {searched && (
          <div className="space-y-6">
            {/* Posts Results */}
            {(activeFilter === 'all' || activeFilter === 'posts') && (
              <div>
                <h2 className={`font-bold mb-4 flex items-center gap-2 ${textMain}`}>
                  <BookOpen size={18} className="text-indigo-400" />
                  المنشورات ({results.length})
                </h2>
                {results.length === 0 ? (
                  <div className={`p-6 rounded-2xl border text-center ${cardBg}`}>
                    <p className={text}>لا توجد منشورات مطابقة</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map(r => (
                      <div key={r.id} className={`p-5 rounded-2xl border card-hover ${cardBg}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                            <BookOpen size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold mb-1 ${textMain}`}>{r.title}</h3>
                            <p className={`text-sm ${text} line-clamp-2`}>{r.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              {r.author && <span className={`text-xs ${text}`}>بقلم {r.author}</span>}
                              {r.tags?.map(tag => (
                                <span key={tag} className="text-xs px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400">#{tag}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* YouTube Results */}
            {(activeFilter === 'all' || activeFilter === 'youtube') && (
              <div>
                <h2 className={`font-bold mb-4 flex items-center gap-2 ${textMain}`}>
                  <Youtube size={18} className="text-red-400" />
                  فيديوهات يوتيوب ({ytResults.length})
                </h2>
                <div className="space-y-3">
                  {ytResults.map(v => (
                    <div key={v.id} className={`p-5 rounded-2xl border card-hover ${cardBg}`}>
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-14 bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <Youtube size={24} className="text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold mb-1 ${textMain} text-sm`}>{v.title}</h3>
                          <p className={`text-xs ${text}`}>{v.channel}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-xs ${text}`}>👁 {v.views}</span>
                            <span className={`text-xs ${text}`}>⏱ {v.duration}</span>
                          </div>
                        </div>
                        <button className={`p-2 rounded-xl transition-colors flex-shrink-0 ${isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Default suggestions */}
        {!searched && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className={`p-5 rounded-2xl border ${cardBg}`}>
              <h3 className={`font-bold mb-3 flex items-center gap-2 ${textMain}`}>
                <BookOpen size={18} className="text-indigo-400" />
                أحدث المنشورات
              </h3>
              <p className={`text-sm ${text}`}>ابحث في آلاف المنشورات التعليمية</p>
            </div>
            <div className={`p-5 rounded-2xl border ${cardBg}`}>
              <h3 className={`font-bold mb-3 flex items-center gap-2 ${textMain}`}>
                <Youtube size={18} className="text-red-400" />
                فيديوهات يوتيوب
              </h3>
              <p className={`text-sm ${text}`}>ابحث في أفضل الفيديوهات التعليمية الجزائرية</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
