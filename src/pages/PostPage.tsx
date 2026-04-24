import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import { format } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';
import { ChevronLeft, Calendar } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { addInterest } from '../utils/cookie';

interface Post {
  id: string;
  title: string;
  slug: string;
  keyword: string;
  thumbnail?: string;
  createdAt: string;
  content: string;
}

export function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();

  useEffect(() => {
    fetch(`/api/posts/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setPost(data.post);
        // Add core tracking for cookie recommendations
        addInterest(data.post.keyword);
      })
      .catch(err => {
        console.error(err);
        setPost(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">{t('post.notFound')}</h2>
        <p className="text-gray-400 mb-6 font-mono text-sm">{t('post.notFoundDesc')}</p>
        <Link to="/" className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition shadow-[0_0_15px_rgba(79,70,229,0.5)]">
          {t('post.backHome')}
        </Link>
      </div>
    );
  }

  // Remove the `# Title` from content as we render it separately
  const displayContent = post.content.replace(/^#\s+[^\n]+/, '');

  return (
    <article className="max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm relative">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none"></div>
      
      {post.thumbnail && (
        <div className="w-full h-64 md:h-80 bg-black overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10"></div>
          <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover opacity-60" onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }} />
        </div>
      )}
      
      <div className="p-6 sm:p-10 relative z-20">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('post.return')}
        </Link>
        
        <div className="mb-8 border-b border-white/10 pb-8">
          <span className="inline-block px-2.5 py-1 rounded-sm text-sm font-mono bg-black/60 border border-white/10 text-indigo-400 mb-4">
            #{post.keyword}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            {post.title.replace(/^#\s*/, '')}
          </h1>
          <div className="flex items-center text-sm text-gray-400 font-mono">
            <Calendar className="w-4 h-4 mr-1.5 text-indigo-500" />
            {format(new Date(post.createdAt), 'PPP (EEEE) a h:mm', { locale: language === 'zh' ? zhTW : enUS })} <span className="ml-4 text-emerald-400">SEO: 98%</span>
          </div>
        </div>

        <div className="prose prose-invert prose-indigo max-w-none 
          prose-headings:text-white prose-headings:font-bold
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-white prose-blockquote:border-indigo-500 prose-blockquote:bg-white/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg">
          <Markdown>{displayContent}</Markdown>
        </div>
      </div>
    </article>
  );
}
