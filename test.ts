import Parser from 'rss-parser';

async function test() {
  try {
    const rssParser = new Parser({
      customFields: {
        item: ['ht:approx_traffic', 'ht:news_item', 'ht:picture'],
      }
    });
    const feed = await rssParser.parseURL('https://trends.google.com/trending/rss?geo=TW');
    console.log(`Feed length: ${feed.items.length}`);
    if (feed.items.length > 0) {
        console.log(`Title: ${feed.items[0].title}`);
        console.log(`Traffic: ${feed.items[0]['ht:approx_traffic']}`);
    }
  } catch(e) {
    console.error(e);
  }
}

test();
