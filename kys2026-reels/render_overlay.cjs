// Оверлей кадрларын PNG ретінде шығарады: node render_overlay.cjs OUTDIR [t1 t2 ...]
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
(async()=>{
  const out=process.argv[2];const only=process.argv.slice(3).map(Number);fs.mkdirSync(out,{recursive:true});
  const T=JSON.parse(fs.readFileSync(path.join(__dirname,'timeline.json'),'utf8'));
  const b=await chromium.launch({args:['--allow-file-access-from-files']});
  const p=await b.newPage({viewport:{width:1080,height:1920}});
  await p.goto('file://'+path.join(__dirname,'overlay.html'));
  await p.evaluate(async(T)=>{setup(T);await document.fonts.load('100px IB');await document.fonts.load('100px IX');await document.fonts.load('30px MO');},T);
  const N=Math.round(T.dur*T.fps);
  const list=only.length?only.map(t=>Math.round(t*T.fps)):[...Array(N).keys()];
  for(const f of list){
    const d=await p.evaluate((t)=>frame(t),f/T.fps);
    fs.writeFileSync(path.join(out,String(f).padStart(5,'0')+'.png'),Buffer.from(d.split(',')[1],'base64'));
  }
  await b.close();
})();
