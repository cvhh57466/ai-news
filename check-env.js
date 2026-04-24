import process from 'process';

console.log(Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('GOOG') || k.includes('AI_')));
