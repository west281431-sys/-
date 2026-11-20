// FPV Assemble — рендер (кадрларды Chrome салады, ffmpeg жинайды).
// node render.mjs stills 1 4.5 10   -> frames/still_1.jpg ... (проверить кадры)
// node render.mjs full               -> out/video.mp4 (готовый ролик: голос + звуки + музыка, если есть)
// node render.mjs full 12            -> только первые 12 секунд
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const [mode = 'stills', ...args] = process.argv.slice(2);
const FPS = 30, PAGES = 3;
fs.mkdirSync('frames', { recursive: true }); fs.mkdirSync('out', { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(f => fs.existsSync(f));
if (!CHROME) { console.error('Не нашёл Google Chrome. Установи его с google.com/chrome и запусти снова.'); process.exit(1); }
const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, protocolTimeout: 900000,
  args: ['--allow-file-access-from-files', '--disable-web-security', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const open = async () => {
  const p = await browser.newPage();
  await p.setViewport({ width: 1080, height: 1920 });
  p.on('pageerror', e => console.error('Ошибка на странице:', e.message));
  await p.goto('file:///' + path.resolve('video.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await p.evaluate(() => window.READY);
  return p;
};
const shot = (p, t, file) => p.evaluate(t => render(t), t).then(() => p.screenshot({ path: file, type: 'jpeg', quality: 92 }));

const page = await open();
const { DUR, SFX } = await page.evaluate(() => ({ DUR: window.DUR, SFX: window.SFX }));

if (mode === 'stills') {
  for (const t of args.map(Number)) await shot(page, t, `frames/still_${t}.jpg`);
  console.log('Кадры в папке frames/');
} else {
  const dur = args[0] ? +args[0] : DUR, n = Math.round(dur * FPS);
  // RESUME=1 node render.mjs full — продолжить с места остановки, готовые кадры не перерисовывать
  if (!process.env.RESUME) fs.readdirSync('frames').filter(f => f.startsWith('f')).forEach(f => fs.rmSync('frames/' + f));
  // одна вкладка; если кадр завис дольше 30 с — вкладка пересоздаётся и кадр рисуется заново
  let p = page;
  const tryShot = (t, file) => Promise.race([shot(p, t, file), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 30000))]);
  for (let i = 0; i < n; i++) {
    const file = `frames/f${String(i).padStart(5, '0')}.jpg`;
    if (process.env.RESUME && fs.existsSync(file)) continue;
    for (let a = 0; ; a++) {
      try { await tryShot(i / FPS, file); break; }
      catch (e) { if (a > 3) throw e; console.log(`\nкадр ${i} завис, перезапускаю вкладку`); p.close().catch(() => {}); p = await open(); }
    }
    if (i % 30 === 0) process.stdout.write(`\rкадры: ${Math.round(i / n * 100)}%`);
  }
  console.log('\nсклеиваю видео и звук…');
  const inA = [], flt = [], mix = [];
  let k = 1;
  const voice = ['media/voice.m4a', 'media/voice.mp3', 'media/voice.wav'].find(f => fs.existsSync(f));
  if (voice) { inA.push('-i', voice); mix.push(`[${k++}:a]`); }
  if (fs.existsSync('media/music.mp3')) {
    inA.push('-stream_loop', '-1', '-i', 'media/music.mp3');
    flt.push(`[${k}:a]volume=0.07,afade=t=out:st=${(dur - 1.5).toFixed(2)}:d=1.5[mu]`); mix.push('[mu]'); k++;
  }
  SFX.filter(([t, name]) => t >= 0 && t < dur && fs.existsSync(`a/sfx/${name}.wav`)).forEach(([t, name, vol]) => {
    inA.push('-i', `a/sfx/${name}.wav`);
    flt.push(`[${k}:a]adelay=${Math.round(t * 1000)}:all=1,volume=${vol}[s${k}]`); mix.push(`[s${k}]`); k++;
  });
  const a = ['-y', '-framerate', String(FPS), '-i', 'frames/f%05d.jpg', ...inA];
  if (mix.length) {
    flt.push(`${mix.join('')}amix=inputs=${mix.length}:normalize=0:duration=longest,atrim=0:${dur},loudnorm=I=-14:TP=-1.5[aout]`);
    a.push('-filter_complex', flt.join(';'), '-map', '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
  }
  a.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-t', String(dur), '-movflags', '+faststart', 'out/video.mp4');
  execFileSync('ffmpeg', a, { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log('Готово: out/video.mp4');
}
await browser.close();
