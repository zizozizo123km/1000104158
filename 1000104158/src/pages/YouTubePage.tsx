import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { analyzeYouTubeVideo } from '../lib/gemini';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Youtube, Loader2, Link, Play,
  FileText, HelpCircle, List, AlertCircle, ExternalLink,
  Search, BookOpen, Eye, ThumbsUp, Clock, CheckCircle,
  Brain, Volume2, VolumeX
} from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoInfo {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  views: string;
  likes: string;
  thumbnail: string;
  description: string;
}

interface VideoAnalysis {
  summary: string;
  keyPoints: string[];
  reviewQuestions: string[];
}

interface SearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
  publishedAt: string;
}

const extractVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

// Format ISO 8601 duration
const formatDuration = (iso: string): string => {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = parseInt(match[3] || '0');
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatCount = (n: string): string => {
  const num = parseInt(n);
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return n;
};

export default function YouTubePage() {
  const { isDarkMode, user, settings, setCurrentPage, isAdmin } = useApp();
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<'analyze' | 'search'>('search');
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'summary' | 'points' | 'questions'>('summary');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const bg = isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-[#12122a] border-white/10' : 'bg-white border-gray-200';
  const inputBg = isDarkMode ? 'bg-[#1a1a35] border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400';
  const text = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';
  const border = isDarkMode ? 'border-white/10' : 'border-gray-200';

  // Fetch video info via YouTube Data API
  const fetchVideoInfo = async (videoId: string): Promise<VideoInfo> => {
    if (!settings.youtubeApiKey) {
      // Mock data when no API key
      return {
        videoId,
        title: 'فيديو تعليمي من يوتيوب',
        channel: 'قناة تعليمية',
        duration: '15:30',
        views: '50K',
        likes: '2K',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        description: 'فيديو تعليمي مخصص لتلاميذ البكالوريا الجزائرية.',
      };
    }
    const resp = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${settings.youtubeApiKey}&part=snippet,contentDetails,statistics`
    );
    const data = await resp.json();
    if (!data.items?.length) throw new Error('الفيديو غير موجود');
    const item = data.items[0];
    return {
      videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      duration: formatDuration(item.contentDetails.duration),
      views: formatCount(item.statistics.viewCount || '0'),
      likes: formatCount(item.statistics.likeCount || '0'),
      thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      description: item.snippet.description?.substring(0, 500) || '',
    };
  };

  // Analyze with Gemini
  const analyzeWithGemini = async (info: VideoInfo): Promise<VideoAnalysis> => {
    if (!settings.geminiApiKey) {
      return {
        summary: `🎬 فيديو: "${info.title}" من قناة ${info.channel}.\n\n⚠️ لتحليل حقيقي بالذكاء الاصطناعي، يرجى إضافة مفتاح Gemini API من لوحة الإدارة.`,
        keyPoints: [
          'موضوع الفيديو: ' + info.title,
          'المصدر: ' + info.channel,
          'أضف مفتاح Gemini للحصول على تحليل حقيقي',
        ],
        reviewQuestions: [
          'ما الموضوع الرئيسي للفيديو؟',
          'ما أهم المعلومات التي تعلمتها؟',
          'أضف مفتاح Gemini لأسئلة مراجعة ذكية',
        ],
      };
    }
    // ✅ استدعاء @google/genai SDK مع gemini-2.5-flash-preview
    return analyzeYouTubeVideo(info.title, info.channel, info.description, info.duration, settings.geminiApiKey);
  };

  // Search YouTube
  const searchYouTube = async () => {
    if (!searchQuery.trim()) { toast.error('أدخل كلمة البحث'); return; }
    if (!settings.youtubeApiKey) {
      // Mock results
      const mockResults: SearchResult[] = [
        { videoId: 'dQw4w9WgXcQ', title: `شرح ${searchQuery} - البكالوريا الجزائرية`, channel: 'قناة البكالوريا', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', publishedAt: '2024-01-15' },
        { videoId: 'dQw4w9WgXcQ', title: `حل تمارين ${searchQuery}`, channel: 'مدرسة الامتياز', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', publishedAt: '2024-02-20' },
        { videoId: 'dQw4w9WgXcQ', title: `ملخص ${searchQuery} للباك`, channel: 'أستاذ نجاح', thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', publishedAt: '2024-03-10' },
      ];
      setSearchResults(mockResults);
      toast.success(`أضف مفتاح YouTube API لنتائج حقيقية!`);
      return;
    }
    setLoadingSearch(true);
    try {
      const query = `${searchQuery} بكالوريا جزائر شرح`;
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(query)}&key=${settings.youtubeApiKey}&part=snippet&type=video&maxResults=12&relevanceLanguage=ar&regionCode=DZ`
      );
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      const results: SearchResult[] = data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium?.url || '',
        publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString('ar-DZ'),
      }));
      setSearchResults(results);
      toast.success(`وُجد ${results.length} فيديو!`);
    } catch (err: any) {
      toast.error(err.message || 'فشل البحث في يوتيوب');
    } finally {
      setLoadingSearch(false);
    }
  };

  const analyzeVideo = async () => {
    if (!url.trim()) { toast.error('يرجى إدخال رابط الفيديو'); return; }
    const videoId = extractVideoId(url);
    if (!videoId) { toast.error('رابط يوتيوب غير صحيح'); return; }

    setLoadingVideo(true);
    setAnalysis(null);
    try {
      const info = await fetchVideoInfo(videoId);
      setVideoInfo(info);
      toast.success('✅ تم جلب معلومات الفيديو!');
    } catch (err: any) {
      toast.error(err.message || 'فشل جلب الفيديو');
    } finally {
      setLoadingVideo(false);
    }
  };

  const analyzeVideoWithAI = async () => {
    if (!videoInfo) return;
    setLoadingAnalysis(true);
    try {
      const result = await analyzeWithGemini(videoInfo);
      setAnalysis(result);
      if (user) {
        await addDoc(collection(db, `users/${user.uid}/youtubeAnalyses`), {
          url,
          videoId: videoInfo.videoId,
          title: videoInfo.title,
          ...result,
          timestamp: serverTimestamp(),
        });
      }
      toast.success('🎉 تم تحليل الفيديو بالذكاء الاصطناعي!');
    } catch (err: any) {
      toast.error(err.message || 'فشل التحليل');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const selectSearchResult = (result: SearchResult) => {
    setUrl(`https://www.youtube.com/watch?v=${result.videoId}`);
    setActiveTab('analyze');
    toast.success('تم اختيار الفيديو! اضغط "تحليل" للمتابعة');
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*_]/g, '').substring(0, 400));
    utterance.lang = 'ar-DZ';
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const tabs = [
    { id: 'search', label: '🔍 بحث عن دروس', icon: Search },
    { id: 'analyze', label: '🎬 تحليل فيديو', icon: Brain },
  ];

  return (
    <div className={`min-h-screen ${bg} page-enter`} dir="rtl">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/20 border border-red-500/30 mb-4">
            <Youtube size={14} className="text-red-400" />
            <span className="text-sm text-red-300">يوتيوب تعليمي</span>
          </div>
          <h1 className={`text-3xl font-bold ${textMain}`}>دروس يوتيوب للبكالوريا</h1>
          <p className={`mt-2 ${text}`}>ابحث عن دروس أو حلّل أي فيديو تعليمي بالذكاء الاصطناعي</p>

          {/* API Status */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${settings.youtubeApiKey ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-gray-500/20 border-gray-500/30 text-gray-400'}`}>
              <Youtube size={12} />
              YouTube API: {settings.youtubeApiKey ? '✅ مفعّل' : '❌ غير مفعّل'}
            </div>
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${settings.geminiApiKey ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-gray-500/20 border-gray-500/30 text-gray-400'}`}>
              <Brain size={12} />
              Gemini AI: {settings.geminiApiKey ? '✅ مفعّل' : '❌ غير مفعّل'}
            </div>
            {(!settings.youtubeApiKey || !settings.geminiApiKey) && isAdmin && (
              <button
                onClick={() => setCurrentPage('admin')}
                className="text-xs px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
              >
                ⚙️ إضافة المفاتيح
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-2xl mb-6 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === id
                  ? isDarkMode ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-red-600 shadow-md'
                  : text
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div>
            <div className={`p-5 rounded-2xl border mb-6 ${cardBg}`}>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 ${text}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchYouTube()}
                    placeholder="ابحث: رياضيات باك، فلسفة بكالوريا، فيزياء..."
                    className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm input-glow transition-all ${inputBg}`}
                  />
                </div>
                <button
                  onClick={searchYouTube}
                  disabled={loadingSearch}
                  className="px-5 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingSearch ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  <span className="hidden sm:inline">بحث</span>
                </button>
              </div>

              {/* Quick searches */}
              <div className="flex flex-wrap gap-2 mt-3">
                {['رياضيات باك', 'فلسفة بكالوريا', 'فيزياء ثانوي', 'علوم طبيعية باك', 'تاريخ جغرافيا'].map(q => (
                  <button
                    key={q}
                    onClick={() => { setSearchQuery(q); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${isDarkMode ? 'border-white/10 text-gray-400 hover:bg-white/10' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((result, i) => (
                  <div key={i} className={`rounded-2xl border overflow-hidden card-hover cursor-pointer ${cardBg}`} onClick={() => setPlayingVideoId(playingVideoId === result.videoId + i ? null : result.videoId + i)}>
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-black">
                      {playingVideoId === result.videoId + i ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${result.videoId}?autoplay=1`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <>
                          <img
                            src={result.thumbnail}
                            alt={result.title}
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`; }}
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                              <Play size={20} className="text-white ml-1" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className={`text-sm font-medium line-clamp-2 mb-2 ${textMain}`}>{result.title}</h3>
                      <p className={`text-xs ${text} mb-3`}>{result.channel}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); selectSearchResult(result); }}
                          className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 transition-colors"
                        >
                          <Brain size={12} />
                          تحليل AI
                        </button>
                        <a
                          href={`https://www.youtube.com/watch?v=${result.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 transition-colors"
                        >
                          <ExternalLink size={12} />
                          يوتيوب
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && !loadingSearch && (
              <div className={`text-center py-16 rounded-2xl border ${cardBg}`}>
                <Youtube size={56} className="mx-auto text-red-500/40 mb-4" />
                <h3 className={`font-bold mb-2 ${textMain}`}>ابحث عن دروس البكالوريا</h3>
                <p className={`text-sm ${text}`}>اكتب اسم المادة أو الموضوع للبحث في يوتيوب</p>
              </div>
            )}
          </div>
        )}

        {/* Analyze Tab */}
        {activeTab === 'analyze' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl border ${cardBg}`}>
              <label className={`block text-sm font-medium mb-3 ${textMain}`}>رابط الفيديو من يوتيوب</label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Link size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 ${text}`} />
                  <input
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    dir="ltr"
                    className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm input-glow transition-all ${inputBg}`}
                  />
                </div>
                <button
                  onClick={analyzeVideo}
                  disabled={loadingVideo || !url}
                  className="px-5 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingVideo ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                  جلب الفيديو
                </button>
              </div>
            </div>

            {/* Video Player + Info */}
            {videoInfo && (
              <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                <div className="aspect-video bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoInfo.videoId}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={videoInfo.title}
                  />
                </div>
                <div className="p-5">
                  <h3 className={`font-bold text-lg mb-2 ${textMain}`}>{videoInfo.title}</h3>
                  <p className={`text-sm ${text} mb-3`}>{videoInfo.channel}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className={`flex items-center gap-1 ${text}`}><Eye size={12} />{videoInfo.views} مشاهدة</span>
                    <span className={`flex items-center gap-1 ${text}`}><ThumbsUp size={12} />{videoInfo.likes} إعجاب</span>
                    <span className={`flex items-center gap-1 ${text}`}><Clock size={12} />{videoInfo.duration}</span>
                  </div>

                  {/* Analyze with AI button */}
                  <button
                    onClick={analyzeVideoWithAI}
                    disabled={loadingAnalysis}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50"
                  >
                    {loadingAnalysis ? (
                      <><Loader2 size={18} className="animate-spin" />جاري التحليل بـ Gemini AI...</>
                    ) : (
                      <><Brain size={18} />تحليل الفيديو بالذكاء الاصطناعي</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* AI Analysis Results */}
            {analysis && (
              <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
                <div className={`flex border-b ${border}`}>
                  {[
                    { id: 'summary', label: 'الملخص', icon: FileText },
                    { id: 'points', label: 'النقاط المهمة', icon: List },
                    { id: 'questions', label: 'أسئلة مراجعة', icon: HelpCircle },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveAnalysisTab(id as typeof activeAnalysisTab)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                        activeAnalysisTab === id ? 'border-indigo-500 text-indigo-400' : `border-transparent ${text} hover:text-indigo-400`
                      }`}
                    >
                      <Icon size={16} />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {activeAnalysisTab === 'summary' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`font-bold ${textMain}`}>ملخص الفيديو</h3>
                        <button
                          onClick={() => speakText(analysis.summary)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${isSpeaking ? 'bg-indigo-500/20 text-indigo-400' : isDarkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          {isSpeaking ? <VolumeX size={14} onClick={() => { window.speechSynthesis?.cancel(); setIsSpeaking(false); }} /> : <Volume2 size={14} />}
                          استمع
                        </button>
                      </div>
                      <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} text-sm leading-loose ${text}`}>
                        {analysis.summary}
                      </div>
                    </div>
                  )}

                  {activeAnalysisTab === 'points' && (
                    <div>
                      <h3 className={`font-bold mb-4 ${textMain}`}>النقاط المهمة من الفيديو</h3>
                      <div className="space-y-3">
                        {analysis.keyPoints.map((point, i) => (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {i + 1}
                            </div>
                            <p className={`text-sm ${text}`}>{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeAnalysisTab === 'questions' && (
                    <div>
                      <h3 className={`font-bold mb-4 ${textMain}`}>أسئلة مراجعة تفاعلية</h3>
                      <div className="space-y-3">
                        {analysis.reviewQuestions.map((q, i) => (
                          <div key={i} className={`p-4 rounded-xl border ${isDarkMode ? 'border-orange-500/20 bg-orange-500/5' : 'border-orange-200 bg-orange-50'}`}>
                            <div className="flex items-start gap-3">
                              <span className="text-orange-400 font-bold text-sm flex-shrink-0">س{i + 1}:</span>
                              <p className={`text-sm ${text}`}>{q}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (analysis) {
                            const quizText = analysis.reviewQuestions.map((q, i) => `س${i + 1}: ${q}`).join('\n\n');
                            speakText(quizText);
                          }
                        }}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/30 transition-colors text-sm"
                      >
                        <Volume2 size={16} />
                        استمع للأسئلة
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!videoInfo && !loadingVideo && (
              <div className={`text-center py-16 rounded-2xl border ${cardBg}`}>
                <Youtube size={56} className="mx-auto text-red-500/40 mb-4" />
                <h3 className={`font-bold mb-2 ${textMain}`}>حلّل أي فيديو تعليمي</h3>
                <p className={`text-sm ${text}`}>أدخل رابط فيديو من يوتيوب للحصول على ملخص وتحليل بالذكاء الاصطناعي</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
