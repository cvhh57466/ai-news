fetch('http://localhost:3000/api/posts').then(async r => {
  console.log(r.status);
  console.log((await r.text()).substring(0, 500));
});
