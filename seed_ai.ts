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
  const categories = ['全球重點', '財經市場', '前沿科技', '商業趨勢'];
  let count = 0;
  
  for (let i = 0; i < 3; i++) {
     console.log(`Setting batch ${i+1}/3...`);
     for (const category of categories) {
        try {
           const prompt = `Please generate a highly engaging, full-length news article in Traditional Chinese (zh-TW). 
Category: ${category}
Topic: Come up with a realistic, breaking news trend happening right now in 2026.

Requirements:
- Output only valid JSON with properties: "title", "content", "keyword".
- "content" must be at least 500 words in Markdown format.
- Make it sound extremely professional and realistic.
- DO NOT INCLUDE ANY AI footprints, like "Here is the article" or "As an AI".`;

           const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: prompt,
             config: { responseMimeType: "application/json", temperature: 0.8 }
           });
           
           const text = response.text || '';
           const data = JSON.parse(text);
           
           if (!data.title || !data.content) continue;
           
           const slug = slugify(data.title.substring(0, 30), { lower: true, remove: /[*+~.()'"!:@]/g }) + '-' + Math.random().toString(36).substring(2, 6);
           const id = Math.random().toString(36).substring(2, 9);
           
           const newPost = {
             id,
             title: data.title,
             slug,
             content: data.content,
             keyword: data.keyword || category,
             region: '全球 (Global)',
             category: category,
             thumbnail: `https://image.pollinations.ai/prompt/${encodeURIComponent(data.title)}?width=800&height=600&nologo=true`,
             createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 3)).toISOString() // Randomize slightly
           };
           
           await setDoc(doc(db, 'posts', id), newPost);
           console.log(`Generated: ${data.title}`);
           count++;
        } catch(e) {
           console.error("Error generating post for " + category, (e as Error).message);
        }
        await new Promise(r => setTimeout(r, 4500)); // sleep 4.5s
     }
  }
  
  console.log(`Finished generating ${count} articles.`);
  process.exit(0);
}

run();
