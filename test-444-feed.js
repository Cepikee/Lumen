const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    const resp = await page.goto('https://444.hu/feed', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('response ok?', resp && resp.status());
    // jobb: a response.text() használata
    const text = await resp.text();
    console.log('len:', text.length);
    console.log(text.slice(0, 400));
    await browser.close();
  } catch (e) {
    console.error('ERR', e);
  }
})();
