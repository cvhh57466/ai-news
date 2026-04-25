fetch('http://localhost:3000/api/posts/generate-feed').then(async r => {
  console.log(r.status);
  console.log((await r.text()).substring(0, 500));
});
