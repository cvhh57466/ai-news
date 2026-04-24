import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Newspaper, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function Layout() {
  const { t, language, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const currentCategory = searchParams.get('category') || 'all';

  const categories = [
    { id: 'all', name: '全部' },
    { id: '熱門', name: '熱門' },
    { id: '科技', name: '科技' },
    { id: '財經', name: '財經' },
    { id: '社會', name: '社會' },
    { id: '生活', name: '生活' },
    { id: '體育', name: '體育' }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 flex flex-col font-sans">
      <header className="h-20 bg-[#0a0a0a] border-b border-white/10 sticky top-0 z-10 shadow-sm flex flex-col justify-center">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white tracking-widest text-xs group-hover:bg-indigo-500 transition-colors">AI</div>
            <span className="text-xl font-semibold tracking-tight text-white group-hover:text-gray-200 transition-colors hidden sm:inline-block">
              AI Trend <span className="text-indigo-400">News</span>
            </span>
          </Link>
          
          <nav className="flex gap-4 sm:gap-6 text-sm font-medium items-center overflow-x-auto hide-scrollbar px-2">
            {categories.map(c => (
              <button 
                key={c.id}
                onClick={() => {
                  navigate(c.id === 'all' ? '/' : `/?category=${c.id}`);
                }}
                className={`whitespace-nowrap pb-1 border-b-2 transition-colors ${currentCategory === c.id ? 'border-indigo-500 text-white font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
              >
                {c.name}
              </button>
            ))}
          </nav>
          
          <div className="flex items-center border border-white/10 rounded overflow-hidden shrink-0 ml-4">
            <button 
              onClick={() => setLanguage('zh')}
              className={`px-2 py-1 text-xs font-mono transition-colors ${language === 'zh' ? 'bg-indigo-600/50 text-white' : 'hover:bg-white/5'}`}
            >
              CH
            </button>
            <button 
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-xs font-mono transition-colors border-l border-white/10 ${language === 'en' ? 'bg-indigo-600/50 text-white' : 'hover:bg-white/5'}`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Outlet />
      </main>

      <footer className="h-12 bg-black border-t border-white/5 flex items-center mt-auto">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-[10px] font-mono text-gray-600">
          <div className="flex gap-6 hidden sm:flex">
             <span>{t('footer.system')}</span>
             <span>{t('footer.indexer')}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-indigo-400">{new Date().getFullYear()} {t('footer.copyright')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
