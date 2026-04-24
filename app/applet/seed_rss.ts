import 'dotenv/config';
import Parser from 'rss-parser';
import slugify from 'slugify';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, setDoc, doc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Load Firebase Config
let firebaseConfig;
try {
  firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
} catch (e) {
  console.error("Firebase config not found.");
  process.exit(1);
}

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const rssParser = new Parser({
  customFields: {
    item: ['media:content', 'enclosure', 'content:encoded', 'description'],
  }
});

const FEEDS = [
  { url: 'https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant', category: '熱門' },
  { url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=zh-TW&gl=TW&ceid=TW:zh-Hant', category: '財經' },
  { url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=zh-TW&gl=TW&ceid=TW:zh-Hant', category: '科技' },
  { url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=zh-TW&gl=TW&ceid=TW:zh-Hant', category: '娛樂' },
  { url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=zh-TW&gl=TW&ceid=TW:zh-Hant', category: '體育' }
];

async function run() {
  console.log("Fetching RSS feeds to seed 100+ articles...");
  let count = 0;
  const batch = writeBatch(db);

  for (const feedConfig of FEEDS) {
    try {
      const feed = await rssParser.parseURL(feedConfig.url);
      console.log(`Fetched ${feed.items.length} items from ${feedConfig.category}`);
      
      for (const item of feed.items) {
        if (count >= 100) break;
        
        const title = item.title || 'Breaking News';
        let keyword = title.substring(0, 15);
        if (title.split(' - ').length > 1) {
            keyword = title.split(' - ')[0]; // clean up Google News source suffix
        }
        
        const slug = slugify(title.substring(0, 30), { lower: true, remove: /[*+~.()'"!:@]/g }) + '-' + Math.random().toString(36).substring(2, 6);
        const id = Math.random().toString(36).substring(2, 9);
        
        let htmlContent = item['content:encoded'] || item.content || item.description || title;
        const markdownContent = `# ${title}\n\n**發布時間:** ${item.pubDate}\n\n[查看原文報導](${item.link})\n\n${htmlContent.replace(/<[^>]*>?/gm, '')}\n\n這是一篇即時重點新聞，請持續關注以了解最新動態。`;

        let thumbnail = `https://image.pollinations.ai/prompt/${encodeURIComponent(title)}?width=800&height=600&nologo=true`;
        
        const newPost = {
          id,
          title,
          slug,
          content: markdownContent,
          keyword,
          region: 'Global',
          thumbnail,
          category: feedConfig.category,
          createdAt: new Date(item.pubDate || Date.now()).toISOString()
        };

        const docRef = doc(db, 'posts', id);
        batch.set(docRef, newPost);
        count++;
      }
    } catch (e) {
      console.error(`Error parsing ${feedConfig.url}:`, e);
    }
    if (count >= 100) break;
  }

  await batch.commit();
  console.log(`✅ Successfully seeded ${count} articles to Firestore!`);
  process.exit(0);
}

run();
