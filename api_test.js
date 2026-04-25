const fetch = require('node-fetch');
fetch('https://ai-news-self-one.vercel.app/api/posts').then(async r => {
  console.log(r.status);
  console.log(await r.text());
});
