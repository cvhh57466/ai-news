import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  zh: {
    'nav.feed': '首頁 (Feed)',
    'nav.admin': '趨勢控制台 (Dashboard)',
    'footer.copyright': '© AI Trend News Network',
    'footer.system': 'SYSTEM: STABLE',
    'footer.indexer': 'INDEXER: GOOGLE_SEARCH_TRENDS',
    'home.initializing': '系統初始化中',
    'home.noArticles': '尚未索引任何文章，請在控制台中執行生成協議。',
    'home.launchDashboard': '啟動控制台',
    'home.liveFeed': '即時新聞動態',
    'home.seoScore': 'SEO 分數: 98%',
    'admin.dashboard': '即時 SEO 面板',
    'admin.title': 'NeuralPulse 控制台',
    'admin.subtitle': 'AI 代理正在掃描 Google 趨勢以尋找新關鍵字。',
    'admin.scanBtn': '執行即時爬蟲',
    'admin.scanning': '掃描中...',
    'admin.noTrends': '無趨勢資料，請執行即時爬蟲獲取資料。',
    'admin.vol': '搜尋量',
    'admin.context': '相關新聞',
    'admin.indexed': '索引時間',
    'admin.generateBtn': '生成新聞',
    'admin.synthesizing': '合成中...',
    'admin.generated': '已生成',
    'post.return': '返回動態',
    'post.notFound': '找不到文章',
    'post.notFoundDesc': '這篇文章可能已經被移除或不存在。',
    'post.backHome': '回到首頁',
  },
  en: {
    'nav.feed': 'Feed',
    'nav.admin': 'Dashboard',
    'footer.copyright': '© AI Trend News Network',
    'footer.system': 'SYSTEM: STABLE',
    'footer.indexer': 'INDEXER: GOOGLE_SEARCH_TRENDS',
    'home.initializing': 'System Initializing',
    'home.noArticles': 'No articles indexed yet. Please run the generation protocol in the dashboard.',
    'home.launchDashboard': 'Launch Dashboard',
    'home.liveFeed': 'Live News Feed',
    'home.seoScore': 'SEO Score: 98%',
    'admin.dashboard': 'Live SEO Dashboard',
    'admin.title': 'NeuralPulse Console',
    'admin.subtitle': 'AI agents are currently scanning Google Trends for new keywords.',
    'admin.scanBtn': 'RUN LIVE CRAWL',
    'admin.scanning': 'SCANNING...',
    'admin.noTrends': 'No trends available. Run Live Crawl to fetch data.',
    'admin.vol': 'Vol',
    'admin.context': 'Context',
    'admin.indexed': 'INDEXED',
    'admin.generateBtn': 'GENERATE NEWS',
    'admin.synthesizing': 'SYNTHESIZING...',
    'admin.generated': 'GENERATED',
    'post.return': 'Return to Feed',
    'post.notFound': 'Article Not Found',
    'post.notFoundDesc': 'This article might have been removed or does not exist.',
    'post.backHome': 'Back to Home',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('zh');

  // Sync with localstorage if desired
  useEffect(() => {
    const saved = localStorage.getItem('app-lang') as Language;
    if (saved && (saved === 'zh' || saved === 'en')) {
      setLanguage(saved);
    }
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app-lang', lang);
  };

  const t = (key: string) => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
