// scripts/fetch-and-post-444.js

(async () => {
  try {
    // 1) Lekérjük a 444 feedet
    const resp = await fetch('https://444.hu/feed', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    const text = await resp.text();

    if (!text || !text.includes('<rss')) {
      console.error('No RSS returned, status=', resp.status);
      process.exit(1);
    }

    // 2) POST a saját szerverre
    const post = await fetch(process.env.TARGET_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': `Bearer ${process.env.TARGET_TOKEN || ''}`
      },
      body: text
    });

    if (post.ok) {
      console.log('Posted feed successfully, status:', post.status);
      process.exit(0);
    } else {
      console.error('Failed to POST feed, status:', post.status, await post.text());
      process.exit(2);
    }
  } catch (e) {
    console.error('ERR', e);
    process.exit(3);
  }
})();
