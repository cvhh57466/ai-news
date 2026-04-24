import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import slugify from 'slugify';
import fs from 'fs';
import path from 'path';

let firebaseConfig;
try {
  firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
} catch (e) {
  console.error("Firebase config not found. Please setup Firebase.");
  process.exit(1);
}

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const apiKey = process.env.free_gemini_key || process.env.GEMINI_API_KEY || 'AIzaSyAUpvIgVIZ31DJuIF0rLNpKxEgugq3oZ84';
const ai = new GoogleGenAI({ apiKey });

async function run() {
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
    "科技的進步再次顛覆了我們的想像。這項曾被認為是不可能的任務，如今已在實驗室中獲得重大突破，並準備進入大規模商业化階段。\n\n研究團隊表示，這將能解決當前產業面臨的最大痛點，提升整體運營效率。\n\n各大廠牌已經開始積極搶佔市佔率，未來的市場競爭想必會異常激烈。對一般消費者而言，無疑是一個好消息。",
    "專家日前在一場會議中拋出震撼彈，認為當前的市場狀態已經面臨轉折點。儘管短期內看似繁榮，但潛在的風險正在急遽上升。\n\n報告中特別點出了幾個關鍵指標的異常波動。\n\n我們必須提高警覺，切勿盲目跟進。在這種波動加劇的環境下，資產配置與安全防護顯得格外重要。"
  ];

  let count = 0;
  console.log('Generating 100 initial posts to bypass rate limits...');

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

    const title = `${topic}${suffix}`;
    const newPost = {
       id: 'seed-new-' + Math.random().toString(36).substring(2, 9),
       title: title,
       slug: `seed-post-new-${i}`,
       keyword: topic,
       region: "全球 (Global)",
       thumbnail: `https://image.pollinations.ai/prompt/${encodeURIComponent(topic + ' commercial aesthetic news photo realistic')}?width=800&height=600&nologo=true`,
       category: category,
       createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
       content: `# ${title}\n\n${contentBase}`
    };

    try {
      await setDoc(doc(db, 'posts', newPost.id), newPost);
      console.log(`Generated: ${title}`);
      count++;
    } catch(e: any) {
      console.error("Error setting doc:", e.message);
    }
  }
  
  console.log(`Finished generating ${count} articles.`);
  process.exit(0);
}

run();
