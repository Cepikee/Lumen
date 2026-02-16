// test-444-feed.js
// Teszt script a 444.hu feed többlépcsős lekéréséhez (Puppeteer, homepage flow, in-browser fetch).
// Futtatás: node test-444-feed.js

const puppeteer = require('puppeteer');

async function launchBrowserWithProxy() {
  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || "";
  const args = ["--no-sandbox", "--disable-setuid-sandbox"];
  if (proxy) args.push(`--proxy-server=${proxy}`);
  return await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args,
  });
}

async function tryDirectFetch(page) {
  const resp = await page.goto('https://444.hu/feed', { waitUntil: 'networkidle2', timeout: 60000 });
  if (!resp) return { ok: false, reason: 'no-response' };
  const status = resp.status();
  const text = await resp.text();
  return { ok: status >= 200 && status < 300 && text.includes('<rss'), status, text };
}

async function tryHomepageFetch(page) {
  const r1 = await page.goto('https://444.hu', { waitUntil: 'networkidle2', timeout: 60000 });
  const s1 = r1 ? r1.status() : 'noresp';
  // várjunk egy kicsit, hogy a challenge lefusson, cookie-k beálljanak
  await page.waitForTimeout(2000);

  // fetch a böngésző kontextusában
  const result = await page.evaluate(async () => {
    try {
      const resp = await fetch('https://444.hu/feed', {
        method: 'GET',
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Language': 'hu-HU,hu;q=0.9',
          'Referer': 'https://444.hu/'
        },
        credentials: 'omit'
      });
      const text = await resp.text();
      return { status: resp.status, text };
    } catch (e) {
      return { status: 0, text: String(e) };
    }
  });

  return { homepageStatus: s1, status: result.status, text: result.text, ok: result.status >= 200 && result.status < 300 && String(result.text).includes('<rss') };
}

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await launchBrowserWithProxy();
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'accept-language': 'hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7',
      'referer': 'https://444.hu/',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    });

    // 1) Próbáljuk meg közvetlenül a feedet
    console.log('Attempting direct feed fetch (page.goto)...');
    const direct = await tryDirectFetch(page);
    console.log('Direct result:', { ok: direct.ok, status: direct.status, len: direct.text ? direct.text.length : 0 });
    if (direct.text) console.log('HEAD:', direct.text.slice(0, 400).replace(/\n/g, ' '));

    if (direct.ok) {
      console.log('SUCCESS: Direct feed fetch returned RSS.');
      await browser.close();
      return;
    }

    // 2) Ha nem sikerült, próbáljuk meg a homepage -> in-browser fetch stratégiát
    console.log('Direct fetch failed or returned non-RSS. Trying homepage flow...');
    const homepage = await tryHomepageFetch(page);
    console.log('Homepage flow result:', { homepageStatus: homepage.homepageStatus, status: homepage.status, len: homepage.text ? homepage.text.length : 0 });
    if (homepage.text) console.log('HEAD:', String(homepage.text).slice(0, 400).replace(/\n/g, ' '));

    if (homepage.ok) {
      console.log('SUCCESS: Homepage flow returned RSS.');
      await browser.close();
      return;
    }

    // 3) Ha még mindig nem, próbáljunk meg egy második kört (retry) és logoljuk részletesen
    console.log('Homepage flow did not return RSS. Retrying direct fetch once more...');
    await page.waitForTimeout(1000);
    const direct2 = await tryDirectFetch(page);
    console.log('Retry direct result:', { ok: direct2.ok, status: direct2.status, len: direct2.text ? direct2.text.length : 0 });
    if (direct2.text) console.log('HEAD:', direct2.text.slice(0, 400).replace(/\n/g, ' '));

    if (direct2.ok) {
      console.log('SUCCESS: Retry direct fetch returned RSS.');
      await browser.close();
      return;
    }

    console.log('All strategies failed. Likely Cloudflare/IP block or gateway issue.');
    console.log('If you have a proxy, set HTTP_PROXY or HTTPS_PROXY and re-run the script.');
    await browser.close();
  } catch (e) {
    console.error('ERR', e);
  }
})();
