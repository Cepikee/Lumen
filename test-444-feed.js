const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    // extra headers to look more like a real browser
    await page.setExtraHTTPHeaders({
      'accept-language': 'hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7',
      'referer': 'https://444.hu/',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    });

    const resp = await page.goto('https://444.hu/feed', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('response ok?', resp && resp.status());

    if (!resp) {
      console.log('No response object returned from page.goto');
      await browser.close();
      return;
    }

    // use response.text() to get the raw feed XML
    const text = await resp.text();
    console.log('len:', text.length);
    console.log(text.slice(0, 400));

    await browser.close();
  } catch (e) {
    console.error('ERR', e);
  }
})();
