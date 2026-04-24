import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import Parser from 'rss-parser';
import slugify from 'slugify';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, query, where, getDoc, updateDoc, limit } from 'firebase/firestore';

// Read config with fallback handling if needed
import fs from 'fs';
import firebaseConfig from './firebase-applet-config.json';

const firebaseApp = firebaseConfig ? initializeApp(firebaseConfig) : null;
export const db = firebaseApp ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId) : null;

// Initialize instances
const app = express();
const PORT = 3000;
const rssParser = new Parser({
  customFields: {
    item: ['ht:approx_traffic', 'ht:news_item', 'ht:picture'],
  }
});

// We generate initial 50 posts to migrate if db is empty
const initialPosts = (function generateInitialFiftyPosts() {
  const generated = [];
  const seedTopics = [
    "美股大跌", "台積電擴廠", "蘋果發表會", "輝達財報", "星宇航空",
    "東京旅遊", "高股息ETF", "房貸補貼", "電動車降價", "AI概念股",
    "比特幣暴漲", "奧運賽事", "職棒冠軍", "新竹房價", "碳權交易",
    "颱風停班", "國旅補助", "日圓貶值", "演唱會搶票", "米其林指南",
    "全球暖化", "少子化危機", "半導體展", "大巨蛋營運", "央行升息",
    "通膨數據", "電動機車", "綠能產業", "網購節慶", "熱門台劇",
    "百萬網紅", "人工智慧", "雲端運算", "生技醫療", "國防預算",
    "基本工資", "長照政策", "都更危老", "交通微罪", "行人地獄"
  ];
  const suffixes = ["的最新發展與未來走向", "全面解析", "背後的關鍵影響", "：你需要知道的幾件事", "引發各界高度關注"];
  const contents = [
    "近日市場傳來重大消息，引發各界高度關注。根據內部人士透露，這波趨勢將會持續數個月，並對相關產業鏈造成深遠影響。\n\n專家指出，消費者與投資人應當保持理性，審慎評估潛在風險，同時把握住這次難得的轉型機遇。詳細數據指出，整體成長率展現了驚人的爆發力。\n\n預期隨著政策鬆綁與技術導入，最快下個季度就能迎來另一波高峰。",
    "這起事件的發展超乎許多人的預料。從初步公開的數據來看，背後隱含著結構性的改變。不僅是國內市場，連帶全球供應鏈也開始做出相應的調整。\n\n我們採訪了多位業界權威，多數認為這只是一個開端。\n\n未來的挑戰在於如何有效整合資源，降低可能帶來的負面衝擊。無論如何，提早佈局絕對是當前最明智的選擇。",
    "社群媒體上引發熱烈討論的焦點，背後其實有著縝密的商業邏輯。針對近期的波動，官方也終於打破沉默做出了正面回應。\n\n根據最新發布的指導原則，接下來將會有一連串的配套措施上路。\n\n這不僅影響了企業的決策，更與我們每個人的日常生活息息相關。建議大家持續追蹤後續發展，以免錯失關鍵資訊。",
    "科技的進步再次顛覆了我們的想像。這項曾被認為是不可能的任務，如今已在實驗室中獲得重大突破，並準備進入大規模商業化階段。\n\n研究團隊表示，這將能解決當前產業面臨的最大痛點，提升整體運營效率。\n\n各大廠牌已經開始積極搶佔市佔率，未來的市場競爭想必會異常激烈。對一般消費者而言，無疑是一個好消息。",
    "專家日前在一場會議中拋出震撼彈，認為當前的市場狀態已經面臨轉折點。儘管短期內看似繁榮，但潛在的風險正在急遽上升。\n\n報告中特別點出了幾個關鍵指標的異常波動。\n\n我們必須提高警覺，切勿盲目跟進。在這種波動加劇的環境下，資產配置與安全防護顯得格外重要。"
  ];

  for(let i = 0; i < 100; i++) {
    const topic = seedTopics[i % seedTopics.length];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const contentBase = contents[Math.floor(Math.random() * contents.length)];
    
    // Assign generic category based on topic
    let category = "熱門";
    if (["美股大跌", "高股息ETF", "輝達財報", "央行升息", "通膨數據"].includes(topic)) category = "財經";
    else if (["台積電擴廠", "蘋果發表會", "AI概念股", "半導體展", "人工智慧", "雲端運算"].includes(topic)) category = "科技";
    else if (["奧運賽事", "職棒冠軍"].includes(topic)) category = "體育";
    else if (["星宇航空", "東京旅遊", "米其林指南", "網購節慶"].includes(topic)) category = "生活";
    else category = "社會";

    generated.push({
       id: 'seed-new-' + i,
       title: `${topic}${suffix}`,
       slug: `seed-post-new-${i}`,
       keyword: topic,
       region: "全球 (Global)",
       thumbnail: `https://image.pollinations.ai/prompt/${encodeURIComponent(topic + ' commercial aesthetic news photo realistic')}?width=800&height=600&nologo=true`,
       category: category,
       createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
       content: `# ${topic}${suffix}\n\n${contentBase}`
    });
  }
  return generated;
})();

app.use(cors());
app.use(express.json());

// Initialize Firestore if empty
async function initializeDatabase() {
  if (!db) return;
  try {
    const q = query(collection(db, 'posts'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log("Database empty. Migrating 50 initial posts to Firestore...");
      for (const post of initialPosts) {
        await setDoc(doc(db, 'posts', post.id), post);
      }
      console.log("Migration complete.");
    }
  } catch (err) {
    console.error("DB Initialization error:", err);
  }
}
initializeDatabase();

// API Routes

// 1. Get current trends
app.get('/api/trends', async (req, res) => {
  try {
    const feed = await rssParser.parseURL('https://trends.google.com/trending/rss?geo=TW');
    const trends = feed.items.map(item => ({
      title: item.title,
      traffic: item['ht:approx_traffic'],
      pubDate: item.pubDate,
      picture: item['ht:picture'],
      newsHeadlines: item['ht:news_item'] ? (Array.isArray(item['ht:news_item']) ? item['ht:news_item'][0]?.['ht:news_item_title']?.[0] : item['ht:news_item']['ht:news_item_title']) : null,
    }));
    res.json({ trends });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// 2. Get posts (with pagination and recommendation)
app.get('/api/posts', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }
  
  const page = parseInt(req.query.page as string) || 1;
  const limitCount = parseInt(req.query.limit as string) || 9;
  const interestsRaw = req.query.interests as string;
  const categoryFilter = req.query.category as string;
  const regionRaw = req.query.region as string;
  
  let userInterests: string[] = [];
  if (interestsRaw) {
    try {
      userInterests = JSON.parse(decodeURIComponent(interestsRaw));
    } catch(e) {}
  }

  let decodedRegion = null;
  if (regionRaw) {
    try {
        decodedRegion = decodeURIComponent(regionRaw);
    } catch(e) {}
  }
  
  try {
    let constraints: any[] = [];
    if (categoryFilter && categoryFilter !== 'all') {
      constraints.push(where("category", "==", categoryFilter));
    }
    
    // Do not use firestore multiple where clauses due to composite index requirement, 
    // filter in Javascript instead since we are looping/scoring anyway.
    constraints.push(limit(300));
    const q = query(collection(db, 'posts'), ...constraints);
    
    // In a real huge DB, we'd limit this or use proper DB indexing sorting,
    // but for our specific Big Data recommendation logic we fetch recent ones to score.
    const snap = await getDocs(q);
    let allPosts = snap.docs.map(doc => doc.data() as any);

    if (decodedRegion && decodedRegion !== '全球 (Global)' && decodedRegion !== 'Global') {
      allPosts = allPosts.filter(post => post.region === decodedRegion);
    }

    // Calculate scores for recommendation
    let scoredPosts = allPosts.map(post => {
      let score = new Date(post.createdAt).getTime(); // Base score is recency
      
      // Boost score if the keyword matches user interests
      if (userInterests.includes(post.keyword)) {
        // Give a massive score boost (e.g., equivalent to being 12 hours newer)
        score += 12 * 60 * 60 * 1000; 
      }
      return { ...post, score };
    });

    // Sort by score
    scoredPosts.sort((a, b) => b.score - a.score);

    const lang = req.query.lang as string;

    // Endless Paginate (Looping)
    const startIndex = (page - 1) * limitCount;
    const paginatedPosts = [];
    
    if (scoredPosts.length > 0) {
      for (let i = 0; i < limitCount; i++) {
          const index = (startIndex + i) % scoredPosts.length;
          let post = scoredPosts[index];
          if (lang === 'en' && post.title_en) {
             post = { ...post, title: post.title_en, content: post.content_en };
          }
          paginatedPosts.push(post);
      }
    }

    res.json({ 
      posts: paginatedPosts,
      hasMore: true, // Always true for endless scrolling!
      total: Infinity
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// 5. Generate On-The-Fly Regional News for Infinite Scroll
app.get('/api/posts/generate-feed', async (req, res) => {
  const region = req.query.region as string || 'Global';
  const language = req.query.language as string || 'zh'; // Default to Chinese typically
  
  const result = await generateRegionalNews(region, language === 'en' ? 'en' : 'zh');
  if (result.error) {
    return res.status(result.status || 500).json({ error: result.error, details: result.details });
  }

  res.json({ success: true, posts: [result.post] });
});

// 3. Get single post by slug
app.get('/api/posts/:slug', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not initialized' });
  try {
    const q = query(collection(db, 'posts'), where("slug", "==", req.params.slug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const post = docSnap.data();
      const targetLang = req.query.lang === 'en' ? 'en' : 'zh';
      const ai = new GoogleGenAI({ apiKey: process.env.free_gemini_key || process.env.GEMINI_API_KEY || 'AIzaSyAUpvIgVIZ31DJuIF0rLNpKxEgugq3oZ84' });

      // If english is requested but not available, generate it
      if (targetLang === 'en' && (!post.title_en || !post.content_en)) {
         try {
            console.log(`Translating article to english: ${post.title}`);
            const prompt = `Translate the following news article title and content from Traditional Chinese to English.
            Respond in valid JSON with properties "title_en", "content_en".
            Keep the content entirely in Markdown.
            
            Title: ${post.title}
            Content: ${post.content}`;

            const response = await ai.models.generateContent({
              model: 'gemini-2.0-flash',
              contents: prompt,
              config: { responseMimeType: "application/json" }
            });
            const translated = JSON.parse(response.text || '{}');
            
            if (translated.title_en && translated.content_en) {
               post.title_en = translated.title_en;
               post.content_en = translated.content_en;
               await updateDoc(doc(db, 'posts', docSnap.id), {
                  title_en: post.title_en,
                  content_en: post.content_en
               });
            }
         } catch(e) {
            console.error("Translation error", e);
         }
      }

      // Return translated version instead if requested
      if (targetLang === 'en' && post.title_en) {
          res.json({ post: { ...post, title: post.title_en, content: post.content_en }});
      } else {
          res.json({ post });
      }

    } else {
      res.status(404).json({ error: 'Post not found' });
    }
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// DEBUG
app.get('/api/debug', (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  res.json({ keyExists: !!key, keyLength: key ? key.length : null, prefix: key ? key.substring(0, 5) : null });
});

// 4. Generate a post
app.post('/api/posts/generate', async (req, res) => {
  const { keyword, thumbnail, language = 'zh' } = req.body;
  
  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  const result = await generateNewsArticle(keyword, thumbnail, language);
  if (result.error) {
    return res.status(result.status || 500).json({ error: result.error, details: result.details });
  }
  
  res.json({ success: true, post: result.post });
});


// Helper function to generate context-aware regional news
async function generateRegionalNews(region: string, language: string = 'zh') {
  if (!db) return { error: 'Database not initialized', status: 500 };

  try {
    let apiKey = process.env.free_gemini_key || process.env.GEMINI_API_KEY || 'AIzaSyAUpvIgVIZ31DJuIF0rLNpKxEgugq3oZ84';
    if (apiKey === 'AI Studio 免費版' || apiKey === 'MY_GEMINI_API_KEY') {
       apiKey = 'AIzaSyAUpvIgVIZ31DJuIF0rLNpKxEgugq3oZ84';
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a professional AI journalist. Generate a brand new, highly realistic, breaking news article happening right now related to the region/location: "${region}". 
    Provide the output in raw JSON format exactly like this:
    {
      "keyword": "A short 2-4 word trending keyword representing the topic (in Chinese)",
      "title": "A catchy, realistic news title in Traditional Chinese",
      "title_en": "The translated English title",
      "category": "One of: 財經, 科技, 體育, 生活, 社會, 國際, 娛樂",
      "content": "The full news article in Traditional Chinese in Markdown format (at least 3 paragraphs).",
      "content_en": "The full news article translated into English in Markdown format."
    }`;

    console.log(`[Auto-Gen] Requesting Gemini to generate news for region: ${region}`);
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
          responseMimeType: "application/json",
      }
    });

    let rawText = response.text || '';
    rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(rawText);
    const { keyword, title, title_en, category, content, content_en } = parsed;

    const slug = slugify(title.substring(0,20), { lower: true, remove: /[*+~.()'"!:@]/g }) + '-' + Date.now();
    
    const newPost = {
      id: slug,
      title,
      title_en,
      slug,
      content,
      content_en,
      keyword,
      region,
      thumbnail: `https://image.pollinations.ai/prompt/${encodeURIComponent(keyword + ' ' + region + ' real photo')}?width=800&height=600&nologo=true`,
      category: category || '熱門',
      createdAt: new Date().toISOString()
    };

    if (db) {
      await setDoc(doc(db, 'posts', newPost.id), newPost);
      console.log(`Saved newly generated regional post to Firestore: ${newPost.title} for ${region}`);
    }

    return { post: newPost };
  } catch (error: any) {
    console.error('Gemini Regional Generation Error:', error);
    return { error: 'Failed to generate regional news', status: 500, details: error.message };
  }
}

// Helper function to generate news
async function generateNewsArticle(keyword: string, thumbnail?: string, language: string = 'zh') {
  if (!db) return { error: 'Database not initialized', status: 500 };
  
  // Check if we already have a post for this keyword
  try {
    const q = query(collection(db, 'posts'), where("keyword", "==", keyword));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { error: 'Post for this keyword already exists', post: snap.docs[0].data(), status: 400 };
    }
  } catch (e) {
    console.warn("Could not query existing post, proceeding:", e);
  }

  try {
    let apiKey = process.env.free_gemini_key || process.env.GEMINI_API_KEY || 'AIzaSyAUpvIgVIZ31DJuIF0rLNpKxEgugq3oZ84';
    if (apiKey === 'AI Studio 免費版' || apiKey === 'MY_GEMINI_API_KEY') {
       apiKey = 'AIzaSyAUpvIgVIZ31DJuIF0rLNpKxEgugq3oZ84';
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `You are a professional SEO news editor and copywriter. Write an in-depth, engaging, and SEO-structured blog news article based on the recent trending search keyword "${keyword}".
    
Requirements:
- Provide the output in strictly valid JSON format exactly like this:
{
  "title": "A catchy, realistic news title in Traditional Chinese",
  "title_en": "The translated English title",
  "content": "The full news article in Traditional Chinese in Markdown format (at least 3 paragraphs).",
  "content_en": "The full news article translated into English in Markdown format."
}
- Do not fabricate completely false information. If it's a current event, write a reasonable and valuable content.
- STRICTLY PROHIBITED: Do not include any phrases like "Written by AI", "As an AI language model", or "Generated by AI".`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { temperature: 0.7, responseMimeType: "application/json" }
    });

    let rawText = response.text || '{}';
    const parsed = JSON.parse(rawText);
    const { title, title_en, content, content_en } = parsed;

    const slug = slugify(keyword, { lower: true, remove: /[*+~.()'"!:@]/g }) + '-' + Date.now().toString().slice(-4);
    
    const newPost = {
      id: Math.random().toString(36).substring(2, 9),
      title: title || keyword,
      title_en: title_en || keyword,
      slug,
      content: content || '',
      content_en: content_en || '',
      keyword,
      thumbnail: thumbnail || `https://image.pollinations.ai/prompt/${encodeURIComponent(keyword)}?width=800&height=600&nologo=true`,
      category: '熱門', // Default category for AI generated news
      createdAt: new Date().toISOString()
    };

    // Save to Firestore
    if (db) {
      await setDoc(doc(db, 'posts', newPost.id), newPost);
      console.log(`Saved new post to Firestore: ${newPost.title}`);
    }

    return { post: newPost };

  } catch (error: any) {
    console.error('Error in generation:', error.message);
    let errorMessage = 'Failed to generate post';
    if (error.message?.includes('API key not valid') || error.message?.includes('API_KEY_INVALID')) {
       errorMessage = 'Invalid GEMINI_API_KEY. Please check your API key in the Settings (Secrets panel).';
    } else if (error.message) {
       errorMessage = error.message;
    }
    return { error: errorMessage, details: error.message, status: 500 };
  }
}

let isAutoGenerating = false;
// Background worker to auto-generate content
async function autoGenerateWorker() {
  if (isAutoGenerating) return;
  let apiKey = process.env.free_gemini_key || process.env.GEMINI_API_KEY || 'AIzaSyAUpvIgVIZ31DJuIF0rLNpKxEgugq3oZ84';
  if (apiKey === 'AI Studio 免費版' || apiKey === 'MY_GEMINI_API_KEY') {
     apiKey = 'AIzaSyAUpvIgVIZ31DJuIF0rLNpKxEgugq3oZ84';
  }

  isAutoGenerating = true;
  try {
    const feed = await rssParser.parseURL('https://trends.google.com/trending/rss?geo=TW');
    const topTrends = feed.items.slice(0, 2); // Check top 2 active trends
    
    for (const item of topTrends) {
      const keyword = item.title;
      if (!keyword) continue;
      
      let exists = false;
      if (db) {
        try {
          const q = query(collection(db, 'posts'), where("keyword", "==", keyword));
          const snap = await getDocs(q);
          exists = !snap.empty;
        } catch(e) {}
      }

      // If we don't have this post, auto-generate it
      if (!exists) {
         console.log(`[Auto-Gen] Generating article for trending keyword: ${keyword}`);
         const thumbnail = item['ht:picture'];
         await generateNewsArticle(keyword, thumbnail, 'zh');
         // Pause nicely to avoid rate limits
         await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }
  } catch (e) {
    console.error('[Auto-Gen] Error:', e);
  } finally {
    isAutoGenerating = false;
  }
}


async function injectSEO(html: string, originalUrl: string, req: express.Request) {
  if (!db) return html;
  
  let title = '即時新聞聯播 | 全球爆款文章';
  let description = '即時更新的全球新聞聯播，最新潮流與熱門搜索一網打盡！掌握趨勢，了解未來，只在這裡。';
  let image = 'https://image.pollinations.ai/prompt/breaking%20news%20global%20network?width=1200&height=630&nologo=true';
  const host = req.get('host');
  let url = `https://${host}${originalUrl}`;

  if (originalUrl.startsWith('/post/')) {
    const slug = originalUrl.split('/post/')[1].split('/')[0].split('?')[0];
    try {
      const q = query(collection(db, 'posts'), where("slug", "==", slug));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const post = snap.docs[0].data();
        title = post.title + ' | 即時新聞聯播';
        description = post.content ? post.content.substring(0, 160).replace(/<[^>]*>?/gm, '').replace(/#/g, '').trim() : description;
        image = post.thumbnail || image;
      }
    } catch(e) {}
  }

  const metaTags = `
    <title>\${title}</title>
    <meta name="description" content="\${description}" />
    <meta property="og:title" content="\${title}" />
    <meta property="og:description" content="\${description}" />
    <meta property="og:image" content="\${image}" />
    <meta property="og:url" content="\${url}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="\${title}" />
    <meta name="twitter:description" content="\${description}" />
    <meta name="twitter:image" content="\${image}" />
  `;

  return html.replace('</head>', `${metaTags}</head>`);
}

// Setup Vite and Static files
async function startServer() {
  // Sitemap.xml Generation
  app.get('/sitemap.xml', async (req, res) => {
    if (!db) return res.status(500).send('Database not initialized');
    try {
      const protocol = req.protocol === 'http' ? 'https' : req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>always</changefreq>\n    <priority>1.0</priority>\n  </url>`;

      const q = query(collection(db, 'posts'), limit(1000));
      const snap = await getDocs(q);
      
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.slug) {
          xml += `\n  <url>\n    <loc>${baseUrl}/post/${data.slug}</loc>\n    <lastmod>${new Date(data.createdAt || Date.now()).toISOString()}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`;
        }
      });

      xml += `\n</urlset>`;
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (err) {
      console.error('Sitemap error:', err);
      res.status(500).send('Error generating sitemap');
    }
  });

  // Robots.txt Generation
  app.get('/robots.txt', (req, res) => {
      const protocol = req.protocol === 'http' ? 'https' : req.protocol;
      const host = req.get('host');
      res.type('text/plain');
      res.send(`User-agent: *\nAllow: /\n\nSitemap: ${protocol}://${host}/sitemap.xml`);
  });

  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom',
      });
      app.use(vite.middlewares);

      app.use('*', async (req, res, next) => {
          try {
              let url = req.originalUrl;
              let template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
              template = await vite.transformIndexHtml(url, template);
              template = await injectSEO(template, url, req);
              res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          } catch (e: any) {
              vite.ssrFixStacktrace(e);
              next(e);
          }
      });

    } else {
      // In production, serve dist folder EXCEPT index.html auto serving
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath, { index: false }));
      app.use('*', async (req, res) => {
          let template = fs.readFileSync(path.resolve(distPath, 'index.html'), 'utf-8');
          template = await injectSEO(template, req.originalUrl, req);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      });
    }
  }

  // Start background auto-generation checking every 15 minutes
  if (!process.env.VERCEL) {
     setInterval(autoGenerateWorker, 15 * 60 * 1000);
     autoGenerateWorker(); // and trigger once on startup
  }

  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else if (!process.env.VERCEL) {
     app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
   startServer();
} else {
   // For vercel
   startServer();
}

export default app;
