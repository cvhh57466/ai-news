import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';
import { Clock, Loader2, MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getInterests } from '../utils/cookie';

interface Post {
  id: string;
  title: string;
  slug: string;
  keyword: string;
  thumbnail?: string;
  category?: string;
  region?: string;
  createdAt: string;
  content: string; // Only need substring for excerpt
}

const REGIONS = ['全球 (Global)', '台灣 (Taiwan)', '美國 (USA)', '日本 (Japan)', '韓國 (Korea)', '歐洲 (Europe)'];

export function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [region, setRegion] = useState('全球 (Global)');
  const [locating, setLocating] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  
  const { t, language } = useLanguage();
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const currentCategory = searchParams.get('category') || 'all';

  const fetchPosts = async (pageNum: number, category: string, currentRegion: string) => {
    try {
      const interests = getInterests();
      const interestsParam = encodeURIComponent(JSON.stringify(interests));
      const regionParam = encodeURIComponent(currentRegion);

      let url = `/api/posts?page=${pageNum}&limit=5&category=${category}&interests=${interestsParam}&region=${regionParam}&lang=${language}`;

      const res = await fetch(url);
      const data = await res.json();
      
      if (data.error) {
         console.error('API Error:', data.error, data.details);
         setFeedError(data.error);
         setHasMore(false);
         return;
      }

      const newPosts = data.posts || [];

      if (pageNum === 1) {
        setPosts(newPosts);
      } else if (newPosts.length > 0) {
        setPosts(prev => [...prev, ...newPosts]);
      }
      
      // Always true because if generate fails, it will fetch from db
      // This creates infinite scroll.
      setHasMore(true);
    } catch (err: any) {
      console.error('Fetch error:', err);
      // If we got a 500 completely dropping the connection or returning HTML (like Vercel crash)
      setFeedError(err.message || 'Failed to fetch content from the server.');
      setHasMore(true); // Let them try to scroll down later
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  // Initial load or category/region change
  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setPage(1);
    setIsFetchingMore(false);
    fetchPosts(1, currentCategory, region);
  }, [currentCategory, region]);

  // Infinite scroll intersection observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !isFetchingMore && !loading) {
      setIsFetchingMore(true);
      setPage(prev => {
        const nextPage = prev + 1;
        fetchPosts(nextPage, currentCategory, region);
        return nextPage;
      });
    }
  }, [hasMore, isFetchingMore, loading, currentCategory, region, language]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '200px', // trigger a bit earlier
      threshold: 0
    });

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  const handleLocateMe = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
           try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
              const data = await res.json();
              let inferredRegion = data.address?.city || data.address?.state || data.address?.country || 'Location';
              setRegion(inferredRegion);
           } catch(e) {
              setRegion(`${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
           }
           setLocating(false);
        },
        (error) => {
           console.error(error);
           setLocating(false);
        }
      );
    } else {
      setLocating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Region Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 font-serif text-8xl pointer-events-none text-indigo-500">
           🌍
        </div>
        <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto">
          <MapPin className="text-indigo-400 w-5 h-5 flex-shrink-0" />
          <select 
            value={region} 
            onChange={(e) => setRegion(e.target.value)}
            className="bg-black border border-white/20 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 w-full sm:w-auto"
          >
            {REGIONS.includes(region) ? null : <option value={region}>{region}</option>}
            {REGIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={handleLocateMe}
          disabled={locating}
          className="relative z-10 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors w-full sm:w-auto disabled:opacity-50"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {language === 'zh' ? '📍 自動定位產生' : 'Auto Locate'}
        </button>
      </div>

      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="w-1.5 h-6 bg-indigo-500 rounded-full animate-pulse"></div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider text-sm">
          {language === 'zh' ? 'AI 無限自動生成中' : 'AI Infinite Feed'}
        </h2>
      </div>
      
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {posts.map((post, idx) => {
          // extract plain text from markdown for excerpt
          const plainText = post.content.replace(/[#*`]/g, '').slice(0, 160);
          
          if (!post.thumbnail) {
            // Text-only layout for posts without images
            return (
              <Link key={`${post.id}-${idx}`} to={`/post/${post.slug}`} className="group block bg-[#0f0f0f] rounded-xl border border-white/10 hover:border-indigo-500/50 p-6 sm:p-8 transition-all hover:bg-white/5 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5 font-serif text-9xl group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    "
                 </div>
                 <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="inline-block px-2 py-1 bg-white/10 text-[10px] font-mono text-gray-300 uppercase rounded self-start">
                        #{post.keyword}
                      </span>
                      {post.region && (
                        <span className="inline-block px-2 py-1 bg-indigo-500/20 text-[10px] font-mono text-indigo-300 uppercase rounded self-start">
                          📍 {post.region}
                        </span>
                      )}
                      {post.category && (
                        <span className="inline-block text-[10px] font-mono text-indigo-400 uppercase tracking-widest">
                          {post.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-snug mb-4 group-hover:text-indigo-400 transition-colors">
                      {post.title.replace(/^#\s*/, '')}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-3 mb-6 font-sans">
                      {plainText}...
                    </p>
                    <div className="mt-auto flex items-center text-xs font-mono text-gray-500 pt-4 border-t border-white/5">
                      <Clock className="w-4 h-4 mr-1.5" />
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: language === 'zh' ? zhTW : enUS })} 
                      <span className="ml-auto flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full text-[10px] italic">
                        READ MORE →
                      </span>
                    </div>
                 </div>
              </Link>
            );
          }

          // Layout for posts WITH images
          return (
            <Link key={`${post.id}-${idx}`} to={`/post/${post.slug}`} className="group flex flex-col sm:flex-row bg-[#0f0f0f] rounded-xl border border-white/10 overflow-hidden hover:border-indigo-500/50 transition-all hover:bg-white/5">
              <div className="relative w-full sm:w-2/5 aspect-[3/2] sm:aspect-auto overflow-hidden bg-black border-b sm:border-b-0 sm:border-r border-white/10 shrink-0">
                <div className="absolute inset-0 bg-indigo-900/20 mix-blend-multiply z-10 group-hover:bg-transparent transition-colors duration-500"></div>
                <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }} />
              </div>
              <div className="p-6 sm:p-8 flex flex-col flex-grow">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="inline-block px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-indigo-400 uppercase rounded self-start shadow-[0_0_10px_rgba(79,70,229,0.2)]">
                    #{post.keyword}
                  </span>
                  {post.region && (
                    <span className="inline-block px-2 py-1 bg-indigo-500/20 text-[10px] font-mono text-indigo-300 uppercase rounded self-start">
                      📍 {post.region}
                    </span>
                  )}
                  {post.category && (
                    <span className="inline-block text-[10px] font-mono text-gray-400 uppercase tracking-widest flex-shrink-0">
                      {post.category}
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug mb-3 group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {post.title.replace(/^#\s*/, '')}
                </h3>
                <p className="text-sm text-gray-400 line-clamp-2 mb-5 flex-grow">
                  {plainText}...
                </p>
                <div className="flex items-center mt-auto text-xs font-mono text-gray-500 border-t border-white/5 pt-4">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: language === 'zh' ? zhTW : enUS })} 
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      
      {feedError && (
        <div className="flex justify-center py-10 w-full">
           <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center max-w-2xl mx-auto">
             <div className="text-red-400 mb-2 font-bold text-lg">⚠️ {language === 'zh' ? '產生新聞時發生錯誤' : 'Error Generating News'}</div>
             <p className="text-red-300 text-sm">{feedError}</p>
             <button 
                onClick={() => { setFeedError(null); setHasMore(true); }}
                className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
             >
                {language === 'zh' ? '重試' : 'Retry'}
             </button>
           </div>
        </div>
      )}

      {/* Infinite Scroll target marker */}
      {!feedError && (
        <div ref={observerTarget} className="flex justify-center py-10 w-full">
          {isFetchingMore ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <div className="text-indigo-400 font-mono text-xs tracking-widest uppercase text-center animate-pulse">
                  {language === 'zh' ? `AI 正在即時生成「${region}」的新聞內容...` : `AI is generating real-time news for ${region}...`}
                </div>
              </div>
          ) : (
              <div className="h-10 opacity-0 pointer-events-none">Scroll trigger</div>
          )}
        </div>
      )}
    </div>
  );
}
