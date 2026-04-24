import 'dotenv/config';
console.log(process.env.GEMINI_API_KEY ? `Key starts with: ${process.env.GEMINI_API_KEY.substring(0, 5)}... length is ${process.env.GEMINI_API_KEY.length}` : 'undefined');
