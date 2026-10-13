import puppeteer from 'puppeteer';

const url = 'https://klavdijababnik.github.io/neobank-virtual-card-voice-demo/';
const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required','--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors=[];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(`PAGE: ${err.message}`));
const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
if (response.status() !== 200) throw new Error(`HTTP ${response.status()}`);
const agentPresent = await page.evaluate(async () => {
  const scripts = [...document.scripts].map(script => script.src).filter(Boolean);
  const sources = await Promise.all(scripts.map(src => fetch(src).then(r => r.text())));
  return sources.some(source => source.includes('agent_4401m4tzsjk2en4a3y375h16fjx5'));
});
if (!agentPresent) throw new Error('Agent ID absent from public bundle');
await page.click('#start-button');
await page.waitForFunction(() => ['Nova is joining','Nova is speaking','Nova is listening'].includes(document.querySelector('#status-text')?.textContent), { timeout: 45000 });
const connected = await page.evaluate(() => ({ status: document.querySelector('#status-text').textContent, controlsHidden: document.querySelector('#controls').hidden, timerHidden: document.querySelector('#timer').hidden }));
if (connected.controlsHidden || connected.timerHidden) throw new Error(`Connected UI not complete: ${JSON.stringify(connected)}`);
await new Promise(resolve => setTimeout(resolve, 6000));
const stable = await page.evaluate(() => ({ status: document.querySelector('#status-text').textContent, errorHidden: document.querySelector('#error-card').hidden }));
if (!stable.errorHidden) throw new Error(`Visible connection error: ${JSON.stringify(stable)}`);
await page.screenshot({path:'transport-connected.png',fullPage:true});
await page.click('#end-button');
await page.waitForFunction(() => document.querySelector('#status-text')?.textContent === 'Ready to explore', { timeout: 15000 });
const reset = await page.evaluate(() => ({ status: document.querySelector('#status-text').textContent, startDisabled: document.querySelector('#start-button').disabled, controlsHidden: document.querySelector('#controls').hidden }));
if (reset.startDisabled || !reset.controlsHidden) throw new Error(`Reset UI incomplete: ${JSON.stringify(reset)}`);
await page.setViewport({width:390,height:844});
await page.reload({waitUntil:'networkidle2'});
const mobile = await page.evaluate(() => ({width: document.documentElement.scrollWidth, viewport: window.innerWidth, primaryVisible: !!document.querySelector('#start-button'), notice: document.querySelector('.notice')?.textContent.includes('fictional')}));
if (mobile.width > mobile.viewport || !mobile.primaryVisible || !mobile.notice) throw new Error(`Mobile layout failed: ${JSON.stringify(mobile)}`);
await browser.close();
console.log(JSON.stringify({http:200,agentPresent,connected,stable,reset,mobile,errors},null,2));
