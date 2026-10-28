"use strict";
const EXAMPLE = %%EXAMPLE%%;
const DEMO = %%DEMO%%; // bilan fictif SITE TEST, table H/Q, seconde loi et analyses d'exemple
const DEMO_TABLE = DEMO?DEMO.table:null;
const MAX_GRID = 300;

/* ---------- Format ---------- */
const nf = (x,d=3)=> (x==null||!isFinite(x))?"–":x.toLocaleString("fr-FR",{minimumFractionDigits:d,maximumFractionDigits:d});
const p2 = n=>String(n).padStart(2,"0");
const fmtDT = (ms,sec)=>{const d=new Date(ms);return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth()+1)}/${String(d.getUTCFullYear()).slice(2)} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}${sec?":"+p2(d.getUTCSeconds()):""}`};
const fmtHM = (ms,sec)=>{const d=new Date(ms);return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}${sec?":"+p2(d.getUTCSeconds()):""}`};
const fmtD = ms=>{const d=new Date(ms);return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth()+1)}`};
const fmtDur = s=>{const h=Math.floor(s/3600),m=Math.round((s%3600)/60);return `${h} h ${p2(m)}`};
const esc = s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $ = id=>document.getElementById(id);
const toInput = ms=>new Date(ms).toISOString().slice(0,19);
const fromInput = v=>{ if(!v) return NaN; return Date.parse((v.length===16?v+":00":v)+"Z") };
function toast(msg){const t=$("toast");t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,3800)}

/* ---------- Lecture des fichiers ---------- */
function cellVal(v){
  if(v==null) return null;
  if(v instanceof Date) return v;
  if(typeof v==="object"){ if("result" in v) return cellVal(v.result); if(v.richText) return v.richText.map(r=>r.text).join(""); if("text" in v) return v.text; return null }
  return v;
}
function toNum(v){
  v=cellVal(v); if(v==null||v==="") return NaN;
  if(typeof v==="number") return v;
  if(v instanceof Date) return NaN;
  const m=String(v).replace(/\s/g,"").replace(",",".").match(/^[-+]?\d+(\.\d+)?/);
  return m?parseFloat(m[0]):NaN;
}
function toTime(v){
  v=cellVal(v); if(v==null||v==="") return NaN;
  if(v instanceof Date) return Math.round(v.getTime()/1000)*1000;
  if(typeof v==="number"){ if(v>20000&&v<80000) return Math.round((v-25569)*86400)*1000; return NaN }
  const m=String(v).trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if(m){let y=+m[3]; if(y<100) y+=2000; return Date.UTC(y,+m[2]-1,+m[1],+m[4],+m[5],+(m[6]||0))}
  const iso=String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if(iso) return Date.UTC(+iso[1],+iso[2]-1,+iso[3],+iso[4],+iso[5],+(iso[6]||0));
  return NaN;
}
const txt = v=>{v=cellVal(v);return v==null?"":(v instanceof Date?fmtDT(v.getTime(),true):String(v)).trim()};

function parseRows(rows, fileName){
  const meta={site:"",mode:"",start:""};
  let hdr=-1, cols=null;
  for(let i=0;i<Math.min(rows.length,80);i++){
    const r=rows[i]||[]; const a=txt(r[0]);
    let m;
    if((m=a.match(/^site\s*:?\s*(.*)$/i))) meta.site=(m[1].trim()||txt(r[1]));
    else if((m=a.match(/^date de d[ée]marrage\s*:\s*(.*)$/i))) meta.start=m[1].trim();
    else if(/^mode d'origine/i.test(a)) meta.mode=txt(r[1]);
    else if(/^mode\s*:?/i.test(a)) meta.mode=(a.replace(/^mode\s*:?/i,"").trim()||txt(r[1]));
    const low=r.map(c=>txt(c).toLowerCase());
    const it=low.findIndex(c=>/^(time|date|heure|horodatage)/.test(c));
    const ih=low.findIndex(c=>/niveau|hauteur|level/.test(c));
    if(it>=0&&ih>=0){
      // un fichier déjà retravaillé par cet outil : on reprend les colonnes « fichier » (mesures d'origine)
      const pref=re=>{const all=low.map((c,k)=>re.test(c)?k:-1).filter(k=>k>=0); const f=all.find(k=>/fichier|origine/.test(low[k])); return f!=null?f:(all.length?all[0]:-1)};
      hdr=i; cols={t:it,h:pref(/niveau|hauteur|level/),q:pref(/d[ée]bit|flow/),v:pref(/^volume|^vol\.? ?cum|totali/)};
      break;
    }
  }
  if(hdr<0) throw new Error("Ce fichier ne ressemble pas à un enregistrement du BUL'R2 : la colonne des niveaux est introuvable. Utilisez le fichier exporté par l'appareil sur la clé USB.");
  const t=[],h=[],q=[],v=[];
  for(let i=hdr+1;i<rows.length;i++){
    const r=rows[i]||[]; const tt=toTime(r[cols.t]); const hh=toNum(r[cols.h]);
    if(!isFinite(tt)||!isFinite(hh)) continue;
    t.push(tt); h.push(hh);
    q.push(cols.q>=0?toNum(r[cols.q]):NaN);
    v.push(cols.v>=0?toNum(r[cols.v]):NaN);
  }
  if(t.length<2) throw new Error("Le fichier contient moins de deux mesures exploitables.");
  const idx=t.map((_,i)=>i).sort((a,b)=>t[a]-t[b]);
  const pick=a=>idx.map(i=>a[i]);
  const ds={fileName,meta,t:pick(t),h:pick(h),qo:pick(q),vo:pick(v)};
  ds.hasQ=ds.qo.every(isFinite); ds.hasV=ds.vo.every(isFinite);
  const dts=[]; for(let i=1;i<ds.t.length;i++) dts.push((ds.t[i]-ds.t[i-1])/1000);
  const sorted=[...dts].sort((a,b)=>a-b); ds.step=sorted[Math.floor(sorted.length/2)];
  ds.gaps=dts.filter(d=>d>1.5*ds.step).length;
  return ds;
}
/* ---------- Lecture d'un enregistrement natif du BUL'R2 ----------
   Le fichier est accepté dès que sa forme générale est celle d'un export BUL'R2 : lignes « Site », « Date de démarrage »,
   « Nombre d'échantillons », bloc « Statistique » et colonnes Time / Niveau[...] / Débit[...] / Volume[...].
   Les incohérences éventuelles (nombre de lignes, min/max, cumul…) ne bloquent pas : elles sont signalées à l'ouverture. */
class NativeError extends Error{ constructor(reasons,already){ super(reasons[0]); this.reasons=reasons; this.already=!!already } }
function parseNative(rows,fileName){
  const R=[]; const meta={}; let statHdr=-1, hdr=-1; const stats={};
  for(let i=0;i<Math.min(rows.length,80);i++){
    const r=rows[i]||[]; const a=txt(r[0]); let m;
    if((m=a.match(/^site\s*:\s*(.*)$/i))) meta.site=m[1].trim();
    else if((m=a.match(/^date de d.marrage\s*:\s*(.+)$/i))) meta.start=toTime(m[1].trim());
    else if((m=a.match(/^nombre d'.chantillons\s*:\s*(\d+)/i))) meta.count=+m[1];
    else if(/^mode\s*:/i.test(a)) meta.mode=(a.replace(/^mode\s*:/i,"").trim()||txt(r[1]));
    else if(/^statistique/i.test(a)) statHdr=i;
    else if(statHdr>=0&&hdr<0&&/^(niveau|d.bit)$/i.test(a)) stats[/^niveau/i.test(a)?"h":"q"]={min:toNum(r[1]),max:toNum(r[3])};
    else if(/^time$/i.test(a)&&/^niveau\s*\[/i.test(txt(r[1]))&&/^d.bit\s*\[/i.test(txt(r[2]))&&/^volume\s*\[/i.test(txt(r[3]))){ hdr=i; break }
  }
  if(meta.site==null) R.push("la ligne « Site : … » est absente");
  if(!isFinite(meta.start)) R.push("la date de démarrage est absente ou illisible");
  if(meta.count==null) R.push("le nombre d'échantillons n'est pas indiqué");
  if(statHdr<0) R.push("le bloc « Statistique » est absent");
  if(hdr<0) R.push("les colonnes Time, Niveau, Débit et Volume sont introuvables");
  if(R.length) throw new NativeError(R);
  const W=[]; const ts=[],h=[],q=[],v=[]; let skipped=0;
  for(let i=hdr+1;i<rows.length;i++){
    const r=rows[i]||[]; if(r.every(c=>cellVal(c)==null||txt(c)==="")) continue;
    const tt=toTime(r[0]),hh=toNum(r[1]),qq=toNum(r[2]),vv=toNum(r[3]);
    if(!isFinite(tt)||!isFinite(hh)){ skipped++; continue }
    ts.push(tt);h.push(hh);q.push(qq);v.push(vv);
  }
  const n=ts.length;
  if(n<2) throw new NativeError(["le fichier contient moins de deux mesures"]);
  if(skipped) W.push(`${skipped} ligne(s) illisible(s) ont été ignorées`);
  const hasQ=q.every(isFinite), hasV=v.every(isFinite);
  // Horodatage : certains exports n'indiquent que la minute. On reconstitue alors l'heure à la seconde
  // à partir de la date de démarrage (qui a les secondes) et du pas d'enregistrement.
  let t=ts.slice(), step, rebuilt=false;
  const dts=[]; for(let i=1;i<n;i++) dts.push((ts[i]-ts[i-1])/1000);
  const dup=dts.filter(d=>d<=0).length;
  if(dup>0){
    let est=NaN;
    if(hasQ&&hasV){ const e=[]; for(let i=1;i<n;i++) if(q[i]>0&&v[i]>v[i-1]) e.push((v[i]-v[i-1])/q[i]*3600); if(e.length>10){ e.sort((a,b)=>a-b); est=e[Math.floor(e.length/2)] } }
    if(!isFinite(est)) est=((ts[n-1]+30000)-meta.start)/1000/(n-1);
    step=Math.max(1,Math.round(est));
    const t0=Math.abs(meta.start-ts[0])<=60000?meta.start:ts[0];
    t=ts.map((_,i)=>t0+i*step*1000); rebuilt=true;
    let off=0; for(let i=0;i<n;i++){ const minute=Math.floor(t[i]/60000)*60000; if(Math.abs(minute-ts[i])>60000) off++ }
    if(off>0.05*n) W.push(`les heures reconstituées au pas de ${step} s s'écartent de celles du fichier sur ${off} mesure(s)`);
  } else { const s=[...dts].sort((a,b)=>a-b); step=s[Math.floor(s.length/2)] }
  // Contrôles de cohérence : signalés, non bloquants
  if(n+skipped!==meta.count) W.push(`l'en-tête annonce ${meta.count} échantillons, le fichier en contient ${n+skipped}`);
  if(!rebuilt&&Math.abs(t[0]-meta.start)>Math.max(step,60)*1000) W.push("la première mesure ne correspond pas à la date de démarrage");
  let hmin=Infinity,hmax=-Infinity,qmin=Infinity,qmax=-Infinity;
  for(let i=0;i<n;i++){ hmin=Math.min(hmin,h[i]);hmax=Math.max(hmax,h[i]); if(hasQ){qmin=Math.min(qmin,q[i]);qmax=Math.max(qmax,q[i])} }
  const near=(a,b,tol)=>!isFinite(a)||Math.abs(a-b)<=tol;
  if(stats.h&&(!near(stats.h.min,hmin,1)||!near(stats.h.max,hmax,1))) W.push(`le niveau min/max de l'en-tête (${nf(stats.h.min,0)} / ${nf(stats.h.max,0)} mm) ne correspond pas aux mesures (${nf(hmin,1)} / ${nf(hmax,1)} mm)`);
  if(hasQ&&stats.q&&(!near(stats.q.min,qmin,Math.max(0.0015,0.005*qmin))||!near(stats.q.max,qmax,Math.max(0.0015,0.005*qmax)))) W.push(`le débit min/max de l'en-tête ne correspond pas aux mesures`);
  if(hasQ&&hasV){ let bad=0; for(let i=1;i<n;i++){ const dt=(t[i]-t[i-1])/1000; if(dt>1.5*step) continue; const exp=q[i]*dt/3600; if(Math.abs((v[i]-v[i-1])-exp)>0.002+0.03*exp) bad++ }
    if(bad>Math.max(2,0.005*n)) W.push(`le volume cumulé ne correspond pas aux débits sur ${bad} mesure(s)`) }
  const ds={fileName,meta:{site:meta.site,mode:meta.mode||"",start:fmtDT(meta.start,true)},t,h,qo:q,vo:v,hasQ,hasV,step,native:true,warnings:W,rebuilt};
  ds.gaps=0; for(let i=1;i<n;i++) if((t[i]-t[i-1])/1000>1.5*step) ds.gaps++;
  return ds;
}
const ALREADY="Ce fichier a déjà été traité par COMETEC Bilan. Ouvrez le fichier d'origine, tel qu'exporté par le BUL'R2 sur la clé USB.";
function parseCSVText(text){
  const lines=text.split(/\r?\n/).filter(l=>l.trim()!=="");
  const sample=lines.slice(0,40).join("\n");
  const count=ch=>(sample.match(new RegExp(ch==="\t"?"\t":"\\"+ch,"g"))||[]).length;
  const sep=[";","\t",","].sort((a,b)=>count(b)-count(a))[0];
  return lines.map(l=>l.split(sep).map(c=>c.replace(/^"|"$/g,"").trim()));
}
async function readText(buf){
  let s=new TextDecoder("utf-8").decode(buf);
  if(s.includes(String.fromCharCode(0xFFFD))) s=new TextDecoder("windows-1252").decode(buf);
  return s;
}
async function sheetRows(buf){
  const wb=new ExcelJS.Workbook(); await wb.xlsx.load(buf);
  return wb.worksheets.map(ws=>{ const rows=[]; ws.eachRow({includeEmpty:true},(row,n)=>{rows[n-1]=row.values.slice(1)}); for(let i=0;i<rows.length;i++) if(!rows[i]) rows[i]=[]; return {name:ws.name,rows} });
}
async function readFile(file){
  if(!/\.(xlsx|csv)$/i.test(file.name)) throw new NativeError(["seuls les fichiers Excel (.xlsx) et CSV (.csv) exportés par le BUL'R2 sont acceptés"]);
  const buf=await file.arrayBuffer();
  let sheets;
  if(/\.xlsx$/i.test(file.name)){
    const wb=new ExcelJS.Workbook(); await wb.xlsx.load(buf);
    const names=wb.worksheets.map(w=>w.name);
    if(wb.creator==="COMETEC Bilan"||(names.includes("Journal")&&names.includes("Bilan"))) throw new NativeError([ALREADY],true);
    sheets=wb.worksheets.map(ws=>{ const rows=[]; ws.eachRow({includeEmpty:true},(row,n)=>{rows[n-1]=row.values.slice(1)}); for(let i=0;i<rows.length;i++) if(!rows[i]) rows[i]=[]; return {name:ws.name,rows} });
  } else sheets=[{name:"",rows:parseCSVText(await readText(buf))}];
  let best=null;
  for(const sh of sheets){
    if(sh.rows.slice(0,40).some(r=>(r||[]).some(c=>/corrig[ée]|du fichier \(/i.test(txt(c))))) throw new NativeError([ALREADY],true);
    try{ const ds=parseNative(sh.rows,file.name); ds.sheet=sh.name; return ds }
    catch(e){ if(!(e instanceof NativeError)) throw e; if(!best||e.reasons.length<best.reasons.length) best=e }
  }
  throw best||new NativeError(["le fichier est vide"]);
}
/* Tables H/Q : une ou plusieurs paires de colonnes (hauteur, débit), unités lues dans l'en-tête */
function parseTableRows(rows,defUnit){
  let hdr=-1;
  const isH=c=>/hauteur|niveau|^h\b|\(mm\)|^mm$|\(cm\)|^cm$/.test(c), isQ=c=>/d[ée]bit|^q\b|m3\/h|m³\/h|l\/s|m3\/s/.test(c);
  for(let i=0;i<Math.min(rows.length,30);i++){ const low=(rows[i]||[]).map(c=>txt(c).toLowerCase()); const ih=low.findIndex(isH); if(ih>=0&&low.some((c,k)=>k!==ih&&isQ(c))){hdr=i;break} }
  let pts=[];
  if(hdr>=0){
    const low=rows[hdr].map(c=>txt(c).toLowerCase());
    const hCols=low.map((c,k)=>(isH(c)||/^m$/.test(c))&&!isQ(c)?k:-1).filter(k=>k>=0);
    const blocks=hCols.map((hc,j)=>{
      const end=j+1<hCols.length?hCols[j+1]:low.length; let qc=-1,unit=defUnit;
      for(let k=hc+1;k<end;k++) if(/m3\/h|m³\/h/.test(low[k])){qc=k;unit="m3h";break}
      if(qc<0) for(let k=hc+1;k<end;k++) if(/l\/s/.test(low[k])){qc=k;unit="ls";break}
      if(qc<0) for(let k=hc+1;k<end;k++) if(/d[ée]bit|^q\b|m3\/s|m³\/s/.test(low[k])){qc=k;unit=/m3\/s|m³\/s/.test(low[k])?"m3s":defUnit;break}
      if(qc<0&&hc+1<end) qc=hc+1;
      const hm=/cm/.test(low[hc])?10:(/\(m\)|^m$/.test(low[hc])?1000:1);
      return {hc,qc,unit,hm};
    }).filter(b=>b.qc>=0);
    for(let i=hdr+1;i<rows.length;i++) for(const b of blocks){
      const h=toNum((rows[i]||[])[b.hc]), q=toNum((rows[i]||[])[b.qc]);
      if(isFinite(h)&&isFinite(q)) pts.push([h*b.hm, b.unit==="ls"?q*3.6:(b.unit==="m3s"?q*3600:q)]);
    }
  }
  if(pts.length<2){
    pts=[];
    for(const r of rows){ const nums=(r||[]).map(toNum).filter(isFinite); if(nums.length>=2) pts.push([nums[0], defUnit==="ls"?nums[nums.length-1]*3.6:nums[nums.length-1]]) }
  }
  pts.sort((a,b)=>a[0]-b[0]);
  const out=[]; for(const p of pts) if(!out.length||p[0]>out[out.length-1][0]) out.push([+p[0].toFixed(3),+p[1].toFixed(4)]);
  return out;
}
async function readTableFile(file){
  const buf=await file.arrayBuffer();
  if(/\.xlsx$/i.test(file.name)){
    for(const sh of await sheetRows(buf)){ const pts=parseTableRows(sh.rows,"m3h"); if(pts.length>=2) return pts }
    return [];
  }
  return parseTableRows(parseCSVText(await readText(buf)),"m3h");
}

/* ---------- Calculs ---------- */
function checkTable(pts){
  const errs=[];
  if(pts.length<2) errs.push("La table doit contenir au moins deux points.");
  for(let i=0;i<pts.length;i++){
    if(!isFinite(pts[i][0])||!isFinite(pts[i][1])) {errs.push(`Ligne ${i+1} : valeur manquante.`);continue}
    if(i>0&&pts[i][0]<=pts[i-1][0]) errs.push(`Ligne ${i+1} : la hauteur doit être supérieure à celle de la ligne précédente.`);
    if(i>0&&pts[i][1]<pts[i-1][1]) errs.push(`Ligne ${i+1} : le débit diminue alors que la hauteur augmente.`);
  }
  return errs;
}
function qT(pts,h){ // interpolation linéaire entre deux points de la table ; [débit, -1 sous la table | 1 au-dessus | 0]
  if(h<=pts[0][0]) return [pts[0][1], h<pts[0][0]?-1:0];
  const n=pts.length; if(h>=pts[n-1][0]) return [pts[n-1][1], h>pts[n-1][0]?1:0];
  let lo=0,hi=n-1; while(hi-lo>1){const m=(lo+hi)>>1; if(pts[m][0]<=h) lo=m; else hi=m}
  const [h0,q0]=pts[lo],[h1,q1]=pts[hi];
  return [q0+(q1-q0)*(h-h0)/(h1-h0),0];
}
function integrate(t,q,step){ // méthode du BUL'R2 : débit de chaque mesure × pas qui la précède
  const V=new Array(t.length); V[0]=0;
  for(let i=1;i<t.length;i++){const dt=Math.min((t[i]-t[i-1])/1000,step); V[i]=V[i-1]+(isFinite(q[i])?q[i]:0)*dt/3600}
  return V;
}
function lastLE(t,x){let lo=0,hi=t.length-1; if(x<t[0]) return -1; while(lo<hi){const m=(lo+hi+1)>>1; if(t[m]<=x) lo=m; else hi=m-1} return lo}
function firstGE(t,x){const i=lastLE(t,x); if(i>=0&&t[i]===x) return i; return i+1}
function intervals(t,Vo,Vn,stepS){
  const st=stepS*1000, t0=t[0], tN=t[t.length-1], out=[];
  let a=Math.floor(t0/st)*st;
  while(a<tN){
    const b=a+st; const ia=Math.max(0,lastLE(t,a)), ib=lastLE(t,Math.min(b,tN));
    out.push({a,b,from:Math.max(a,t0),to:Math.min(b,tN),vo:Vo[ib]-Vo[ia],vn:Vn[ib]-Vn[ia],partial:a<t0||b>tN});
    a=b;
  }
  return out;
}
/* La table du site correspond-elle à l'enregistrement ? On compare le débit enregistré au débit donné par la table, mesure par mesure. */
function verifyTable(pts){
  const d=S.ds, n=d.t.length, tmax=pts[pts.length-1][0];
  let hmax=-Infinity; for(const h of d.h) if(h>hmax) hmax=h;
  const res={pts,n:0,median:NaN,p90:NaN,hmax,tmax,cover:hmax<=tmax,noQ:!d.hasQ,samples:[],hint:""};
  if(!d.hasQ){ res.ok=null; return res }
  let qmax=0; for(const q of d.qo) if(q>qmax) qmax=q;
  // les zones signalées par le diagnostic (niveau à 0 ou figé) sont suspectes : elles ne servent pas à juger la table
  const skip=new Uint8Array(n); res.skipped=0;
  for(const a of S.anoms||[]) for(let i=a.i0;i<=a.i1;i++) if(!skip[i]){ skip[i]=1; res.skipped++ }
  const use=i=>!skip[i]&&d.qo[i]>0.02*qmax&&d.h[i]<=tmax;
  const hs=pts.map(p=>p[0]);
  const evaluate=()=>{ const rel=[], far=[], B=new Map();
    for(let i=0;i<n;i++){ if(!use(i)) continue; const q=d.qo[i], h=d.h[i], e=Math.abs(qT(pts,h)[0]-q)/q; rel.push(e); if(e>0.1) far.push(i);
      let k=0; while(k<hs.length-2&&hs[k+1]<=h) k++; if(!B.has(k)) B.set(k,[]); B.get(k).push(e) }
    rel.sort((x,y)=>x-y); const r={n:rel.length,median:NaN,p90:NaN,worst:null,far:{n:far.length,i0:null,i1:null,size:0}};
    if(rel.length){ r.median=rel[Math.floor(rel.length/2)]; r.p90=rel[Math.floor(.9*(rel.length-1))] }
    // écart tranche par tranche de la table, pour repérer une valeur fausse localement
    for(const [k,v] of B){ if(v.length<3) continue; v.sort((x,y)=>x-y); const m=v[Math.floor(v.length/2)]; if(!r.worst||m>r.worst.err) r.worst={err:m,h0:hs[k],h1:hs[k+1],n:v.length} }
    // mesures qui s'écartent nettement : plus grand groupe de mesures consécutives
    for(let k=0,s0=0;k<=far.length;k++){ if(k<far.length&&k>0&&far[k]-far[k-1]<=5) continue; if(k>s0&&k-s0>r.far.size) r.far={n:far.length,i0:far[s0],i1:far[k-1],size:k-s0}; s0=k }
    r.globalOk=r.n>=10&&r.median<=0.02&&r.p90<=0.05; r.ok=r.globalOk&&(!r.worst||r.worst.err<=0.03); return r };
  let r=evaluate();
  // une table fausse se trompe à toutes les heures où le niveau passe dans la tranche concernée ; un fichier retouché ou une zone
  // anormale se concentre sur une seule période : si la table correspond partout ailleurs, elle est acceptée et la période est signalée
  if(!r.ok&&r.far.size>=3){ const f=r.far; for(let i=f.i0;i<=f.i1;i++) skip[i]=1; const r2=evaluate(); if(r2.ok){ r2.period=f; r=r2 } else for(let i=f.i0;i<=f.i1;i++) skip[i]=0 }
  Object.assign(res,{n:r.n,median:r.median,p90:r.p90,worst:r.worst,far:r.far,globalOk:r.globalOk,ok:r.ok,period:r.period||null});
  // trois points de comparaison : niveau bas, moyen, haut
  const order=d.h.map((h,i)=>i).filter(i=>d.qo[i]>0&&!skip[i]).sort((a,b)=>d.h[a]-d.h[b]);
  if(order.length) for(const f of [.15,.5,.97]){ const i=order[Math.floor(f*(order.length-1))]; res.samples.push({h:d.h[i],qf:d.qo[i],qt:qT(pts,d.h[i])[0]}) }
  // allure de la loi réellement utilisée par l'appareil : Q = k·H^b
  const xs=[],ys=[]; for(let i=0;i<n;i++) if(use(i)&&d.h[i]>0){xs.push(Math.log(d.h[i]));ys.push(Math.log(d.qo[i]))}
  if(xs.length>10){ const mx=xs.reduce((a,b)=>a+b)/xs.length,my=ys.reduce((a,b)=>a+b)/ys.length; let sxy=0,sxx=0; for(let i=0;i<xs.length;i++){sxy+=(xs[i]-mx)*(ys[i]-my);sxx+=(xs[i]-mx)**2}
    const b=sxy/sxx; res.exp=b;
    if(b>=2.3&&b<=2.7) res.hint="déversoir triangulaire (lame en V)";
    else if(b>=1.4&&b<=1.75) res.hint="déversoir rectangulaire ou canal jaugeur (Venturi, Parshall)";
  }
  return res;
}

/* ---------- État ---------- */
const S={pendingLaw:null, ds:null, isExample:false, siteLaw:null, check:null, newLaw:null, corr:[], nextId:1, sel:null,
  hc:null, mod:null, qn:null, vn:null, vo:null, flags:{over:0}, step:3600, log:[], view:"home", brushing:false, zoomMode:false, lab:null, diagX:10, anoms:[], imp:new Map(), anomSel:null, anomHover:null, fileLaw:null, confirmAll:false};
const newLab=()=>({from:null,to:null,out:false,c:{},o:{},lab:"",cap:"",qnom:""});
function logAction(action,detail){S.log.push({at:Date.now(),action,detail});renderJournal()}
const changed=()=>!!S.newLaw||S.corr.length>0;
const canCorrect=()=>!!S.newLaw||(S.check&&(S.check.ok||S.check.ok===null));

function compute(){
  const d=S.ds, n=d.t.length, hc=d.h.slice(), mod=new Uint8Array(n);
  for(const c of S.corr){
    if(c.op==="interp"){
      const a=c.i0>0?c.i0-1:null, b=c.i1<n-1?c.i1+1:null;
      const ha=a!=null?hc[a]:(b!=null?hc[b]:hc[c.i0]), hb=b!=null?hc[b]:ha;
      const ta=a!=null?d.t[a]:d.t[c.i0], tb=b!=null?d.t[b]:d.t[c.i1];
      for(let i=c.i0;i<=c.i1;i++){ const f=tb===ta?0:(d.t[i]-ta)/(tb-ta); hc[i]=ha+(hb-ha)*f; mod[i]=1 }
    } else if(c.op==="vals"){ for(let i=c.i0;i<=c.i1;i++){ hc[i]=Math.max(0,c.vals[i-c.i0]); mod[i]=1 } }
    else if(c.op==="qvals"||c.op==="gap") continue; // appliqués sur le débit, plus bas
    else for(let i=c.i0;i<=c.i1;i++){ hc[i]= c.op==="decal"? hc[i]+c.val : c.val; if(hc[i]<0) hc[i]=0; mod[i]=1 }
  }
  // loi utilisée pour recalculer le débit des niveaux modifiés : nouvelle loi, table du site, sinon loi déduite de l'enregistrement
  let over=0; const table=S.newLaw||S.siteLaw, law=table||S.fileLaw;
  let qn;
  if(S.newLaw) qn=hc.map(h=>{const [q,f]=qT(S.newLaw.pts,h); if(f>0) over++; return q});
  else qn=d.qo.map((q,i)=>{ if(!mod[i]||!law) return q; const [qq,f]=qT(law.pts,hc[i]); if(f>0&&table) over++; return qq });
  for(const c of S.corr) if(c.op==="qvals") for(let i=c.i0;i<=c.i1;i++){ qn[i]=Math.max(0,c.qvals[i-c.i0]); mod[i]=1 }
  if(S.newLaw) S.vn=integrate(d.t,qn,d.step);
  else {
    const V=new Array(n); V[0]=S.vo[0];
    for(let i=1;i<n;i++){ const dt=Math.min((d.t[i]-d.t[i-1])/1000,d.step); V[i]=V[i-1]+(S.vo[i]-S.vo[i-1])+(mod[i]?(qn[i]-(isFinite(d.qo[i])?d.qo[i]:0))*dt/3600:0) }
    S.vn=V;
  }
  // trous d'enregistrement comblés : volume de la durée manquante, au débit moyen des deux mesures qui l'encadrent
  for(const c of S.corr) if(c.op==="gap"){ const dt=(d.t[c.i1]-d.t[c.i0])/1000-d.step; if(dt<=0) continue; const add=(qn[c.i0]+qn[c.i1])/2*dt/3600; for(let i=c.i1;i<n;i++) S.vn[i]+=add }
  S.hc=hc; S.mod=mod; S.qn=qn; S.flags={over,tmax:table?table.pts[table.pts.length-1][0]:null,qmax:table?table.pts[table.pts.length-1][1]:null,law:table?table.name:""};
}

function loadDataset(ds,isExample){
  S.ds=ds; S.isExample=!!isExample;
  $("intro").hidden=!isExample; setNoData(false);
  S.vo = ds.hasV ? ds.vo.map(v=>v-ds.vo[0]) : integrate(ds.t,ds.qo,ds.step);
  $("rpPoint").value=""; $("rpNotes").value="";
  S.fileLaw=deriveLaw(); S.anoms=detectAnomalies(); S.imp=new Map(); S.anomSel=null; S.anomHover=null; S.confirmAll=false; $("anomCard").hidden=true;
  S.lab=newLab(); S.siteLaw=null; S.check=null; S.newLaw=null; S.pendingLaw=null; $("lawBox").hidden=true; S.corr=[]; S.sel=null; S.log=[]; $("checkBox").hidden=true; $("checkChart").hidden=true;
  logAction("Enregistrement ouvert", `${ds.fileName}${ds.sheet?" (onglet « "+ds.sheet+" »)":""} – ${ds.t.length} mesures au pas de ${ds.step} s`);
  if(ds.rebuilt) logAction("Heures recalculées",`Le fichier n'indique que la minute : les heures ont été reconstituées à la seconde à partir de la date de démarrage (${ds.meta.start}) et du pas de ${ds.step} s.`);
  compute(); setView("home"); renderAll();
}

/* ---------- Rendu général ---------- */
function renderAll(){renderFiche();renderKpis();renderChart();renderVolumes();renderJournal();renderPanel()}
function refreshAfterChange(){S.imp=new Map();compute();renderKpis();renderChart();renderVolumes();renderPanel()}
function renderFiche(){
  const d=S.ds,m=d.meta,n=d.t.length;
  const items=[
    ["Site", esc(m.site||"—")+(S.isExample?'<span class="badge">Démonstration</span>':"")],
    ["Début", fmtDT(d.t[0])],["Fin", fmtDT(d.t[n-1])],["Durée", fmtDur((d.t[n-1]-d.t[0])/1000)],
    ["Pas d'enregistrement", (d.step>=60?`${nf(d.step/60,d.step%60?1:0)} min`:`${d.step} s`)+(d.rebuilt?' <span class="badge" title="Heures reconstituées à la seconde">recalculé</span>':"")],
    ["Mesures", n.toLocaleString("fr-FR")],["Mode", esc(m.mode||"—")],["Fichier", esc(d.fileName)]
  ];
  $("fiche").innerHTML=items.map(([k,v])=>`<div><dt>${k}</dt><dd class="num">${v}</dd></div>`).join("");
}
function stats(){
  const d=S.ds,q=S.qn,h=S.hc,n=d.t.length; let iq=0,ihx=0,ihn=0;
  for(let i=1;i<n;i++){ if(q[i]>q[iq]) iq=i; if(h[i]>h[ihx]) ihx=i; if(h[i]<h[ihn]) ihn=i }
  const dur=(d.t[n-1]-d.t[0])/3600000;
  return {iq,ihx,ihn,vn:S.vn[n-1]-S.vn[0],vo:S.vo[n-1]-S.vo[0],dur,qmoy:(S.vn[n-1]-S.vn[0])/dur};
}
function renderKpis(){
  const s=stats(),d=S.ds,ch=changed();
  const delta=s.vo?((s.vn-s.vo)/s.vo*100):0, sign=delta>0?"+":"";
  $("kpis").innerHTML=`
    <div class="kpi"><span class="lab">Volume total${ch?" corrigé":""}</span>
      <span class="val num">${nf(s.vn,2)} <small>m³</small></span>
      <span class="sub num">${ch?`Fichier : ${nf(s.vo,2)} m³ · <span class="delta">${sign}${nf(delta,1)} %</span>`:"Volume enregistré par l'appareil"}</span></div>
    <div class="kpi"><span class="lab">Débit maximal</span>
      <span class="val num">${nf(S.qn[s.iq],2)} <small>m³/h</small></span>
      <span class="sub num">le ${fmtDT(d.t[s.iq])} · ${nf(S.qn[s.iq]/3.6,2)} l/s</span></div>
    <div class="kpi"><span class="lab">Débit moyen sur le bilan</span>
      <span class="val num">${nf(s.qmoy,2)} <small>m³/h</small></span>
      <span class="sub num">${nf(s.qmoy/3.6,2)} l/s · volume ÷ ${fmtDur(s.dur*3600)}</span></div>
    <div class="kpi"><span class="lab">Niveau${S.corr.length?" corrigé":" mesuré"}</span>
      <span class="val num">${nf(S.hc[s.ihn],0)} – ${nf(S.hc[s.ihx],0)} <small>mm</small></span>
      <span class="sub num">max. le ${fmtDT(d.t[s.ihx])}</span></div>`;
  const C=loadsCalc();
  if(C.ehO!=null) $("kpis").innerHTML+=`<div class="kpi"><span class="lab">Charge organique</span>
      <span class="val num">${C.ehOlt?"< ":""}${nf(C.ehO,0)} <small>EH</small></span>
      <span class="sub num">DBO5 : ${C.ehOlt?"< ":""}${fmtKg(C.by.dbo5.fi)} kg/j${C.tco!=null?` · ${nf(C.tco*100,0)} % de la capacité`:""}</span></div>`;
  const al=[];
  if(S.flags.over) al.push(`<div class="alert"><b>!</b><span><b>${S.flags.over} mesure(s)</b> dépassent la hauteur maximale de la table ${esc(S.flags.law)} (${nf(S.flags.tmax,0)} mm) : leur débit est plafonné à ${nf(S.flags.qmax,2)} m³/h.</span></div>`);
  if(d.warnings&&d.warnings.length) al.push(`<div class="alert"><b>!</b><span><b>Points à vérifier dans ce fichier :</b> ${d.warnings.map(w=>esc(w)).join(" ; ")}.</span></div>`);
  { const oa=(S.anoms||[]).filter(a=>a.status==="open"); if(oa.length){ const ty=[...new Set(oa.map(a=>ATYPE[a.type].label.toLowerCase()))].join(", ");
    al.push(`<div class="alert diag"><b>!</b><span><b>${oa.length} anomalie${oa.length>1?"s":""} possible${oa.length>1?"s":""}</b> dans le niveau enregistré (${ty}). <button class="link" type="button" data-goto="diag">Ouvrir le diagnostic du bilan</button></span></div>`) } }
  if(d.gaps&&!(S.anoms||[]).some(a=>a.type==="gap")) al.push(`<div class="alert"><b>!</b><span><b>${d.gaps} interruption(s)</b> détectée(s) dans l'enregistrement (écart supérieur au pas). Aucun volume n'est compté pendant ces trous au-delà d'un pas.</span></div>`);
  if(!d.hasQ&&!S.newLaw) al.push(`<div class="alert"><b>!</b><span>Ce fichier ne contient pas de débit. Ouvrez <b>Modifications › Changer la loi hauteur/débit</b> pour le calculer.</span></div>`);
  $("alerts").innerHTML=al.join("");
}

/* ---------- Graphiques ---------- */
let chart=null, hqchart=null, ckchart=null;
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function theme(){return {an1:css("--an-red"),ink:css("--ink"),ink2:css("--ink-2"),muted:css("--muted"),grid:css("--grid"),line:css("--line"),surface:css("--surface"),nw:css("--s-new"),or:css("--s-orig"),lv:css("--s-level"),brand:css("--brand"),soft:css("--brand-soft"),corr:css("--corr")}}
function corrAreas(){ // périodes corrigées, fusionnées
  const d=S.ds, out=[]; let s=-1;
  for(let i=0;i<=d.t.length;i++){ const m=i<d.t.length&&S.mod[i]; if(m&&s<0) s=i; if(!m&&s>=0){ out.push([d.t[Math.max(0,s-1)],d.t[Math.min(d.t.length-1,i)]]); s=-1 } }
  return out;
}
function renderChart(){
  if(!window.echarts) return;
  const T=theme(), d=S.ds, ch=changed(), lvCh=S.corr.length>0;
  if(!chart){
    chart=echarts.init($("chart"),null,{renderer:"canvas"});
    new ResizeObserver(()=>chart&&chart.resize()).observe($("chart"));
    chart.on("brushEnd",onBrushEnd);
    const zr=chart.getZr();
    zr.on("mousemove",e=>{ if(S.view==="diag") showCard(anomAtPixel(e.offsetX,e.offsetY),e.offsetX) });
    zr.on("globalout",()=>{ if(S.view==="diag") showCard(null) });
    zr.on("click",e=>{ const a=anomAtPixel(e.offsetX,e.offsetY); if(a) focusAnom(a.id,true) });
  }
  const prev=chart.getOption(); const keepZoom=prev&&prev.dataZoom?prev.dataZoom[0]:null;
  chart.dispatchAction({type:"hideTip"});
  const mk=arr=>d.t.map((t,i)=>[t,arr[i]]);
  const axisCommon={axisLine:{lineStyle:{color:T.line}},axisLabel:{color:T.ink2,fontSize:11},splitLine:{lineStyle:{color:T.grid}}};
  const timeAxis=(idx,show)=>({type:"time",gridIndex:idx,...axisCommon,splitLine:{show:false},axisLabel:{show,color:T.ink2,fontSize:11,hideOverlap:true,formatter:v=>{const dd=new Date(v);return (dd.getUTCHours()===0&&dd.getUTCMinutes()===0)?`{d|${fmtD(v)}}`:fmtHM(v)},rich:{d:{fontWeight:"bold",color:T.ink}}},axisPointer:{label:{show:false}}});
  const DG=S.view==="diag"&&S.anoms&&S.anoms.length?diagChart(T):null;
  const areas=DG?DG.areas:corrAreas().map(([a,b])=>[{xAxis:a},{xAxis:b}]);
  if(S.sel) areas.push([{xAxis:d.t[S.sel.i0],itemStyle:{color:T.soft,opacity:.9}},{xAxis:d.t[S.sel.i1]}]);
  const markArea={silent:true,itemStyle:{color:T.corr,opacity:.16},data:areas};
  const series=[], legend=[];
  if(ch){
    series.push({name:"Débit du fichier",type:"line",xAxisIndex:0,yAxisIndex:0,data:mk(d.qo),showSymbol:false,sampling:"lttb",lineStyle:{width:1.5,type:"dashed",color:T.or},itemStyle:{color:T.or},emphasis:{disabled:true},z:2});
    legend.push(["Débit du fichier",T.or,true]);
  }
  series.push({name:ch?"Débit corrigé":"Débit",type:"line",xAxisIndex:0,yAxisIndex:0,data:mk(S.qn),showSymbol:false,sampling:"lttb",lineStyle:{width:2,color:T.nw},itemStyle:{color:T.nw},areaStyle:{color:T.nw,opacity:.08},emphasis:{disabled:true},z:3,markArea});
  legend.unshift([ch?`Débit corrigé${S.newLaw?" ("+S.newLaw.name+")":""}`:"Débit",T.nw,false]);
  if(lvCh){ series.push({name:"Niveau du fichier",type:"line",xAxisIndex:1,yAxisIndex:1,data:mk(d.h),showSymbol:false,sampling:"lttb",lineStyle:{width:1.3,type:"dashed",color:T.or},itemStyle:{color:T.or},emphasis:{disabled:true},z:2}); legend.push(["Niveau du fichier",T.or,true]) }
  series.push({name:lvCh?"Niveau corrigé":"Niveau",type:"line",xAxisIndex:1,yAxisIndex:1,data:mk(S.hc),showSymbol:false,sampling:"lttb",lineStyle:{width:1.6,color:T.lv},itemStyle:{color:T.lv},emphasis:{disabled:true},z:3,markArea});
  legend.splice(ch?2:1,0,[lvCh?"Niveau corrigé":"Niveau",T.lv,false]);
  if(DG){
    series.push({name:"Anomalies",type:"scatter",xAxisIndex:0,yAxisIndex:0,data:DG.pins,symbol:"pin",symbolSize:38,symbolOffset:[0,"-50%"],clip:false,z:10,
      label:{show:true,position:"inside",color:"#fff",fontWeight:"bold",fontSize:12,offset:[0,-5]},emphasis:{scale:1.12},tooltip:{show:false}});
    for(const g of DG.ghost){
      series.push({name:"Aperçu débit",type:"line",xAxisIndex:0,yAxisIndex:0,data:g.q,showSymbol:false,lineStyle:{width:2.6,type:[5,4],color:T.nw},itemStyle:{color:T.nw},z:8,emphasis:{disabled:true},tooltip:{show:false}});
      if(g.levelChanged) series.push({name:"Aperçu niveau",type:"line",xAxisIndex:1,yAxisIndex:1,data:g.lv,showSymbol:false,lineStyle:{width:2.4,type:[5,4],color:T.nw},itemStyle:{color:T.nw},z:8,emphasis:{disabled:true},tooltip:{show:false}}) }
  }
  $("legend").innerHTML=legend.map(([n,c,dash])=>`<span><i class="sw${dash?" dash":""}" style="border-color:${c}"></i>${esc(n)}</span>`).join("")
    +(DG?`<span><i class="swbox" style="background:${css("--an-red")}"></i>Anomalie à traiter</span><span><i class="swbox" style="background:${T.nw}"></i>Réparée</span><span><i class="sw dash" style="border-color:${T.nw}"></i>Aperçu de la réparation</span>`
       :(S.corr.length?`<span><i class="swbox" style="background:${T.corr}"></i>Période corrigée</span>`:""));
  const narrow=$("chart").clientWidth<520;
  chart.setOption({
    animation:false, backgroundColor:"transparent", textStyle:{fontFamily:css("--f-body")},
    grid:[{left:narrow?48:64,right:14,top:32,height:"50%"},{left:narrow?48:64,right:14,top:"68%",bottom:58}],
    xAxis:[timeAxis(0,false),timeAxis(1,true)],
    yAxis:[
      {type:"value",gridIndex:0,scale:true,name:"Débit (m³/h)",nameTextStyle:{color:T.ink2,fontSize:11,align:"left"},...axisCommon,axisLabel:{color:T.ink2,fontSize:11,formatter:v=>v.toLocaleString("fr-FR")},axisLine:{show:false}},
      {type:"value",gridIndex:1,scale:true,name:"Niveau (mm)",nameTextStyle:{color:T.ink2,fontSize:11,align:"left"},...axisCommon,axisLabel:{color:T.ink2,fontSize:11,formatter:v=>v.toLocaleString("fr-FR")},axisLine:{show:false},splitNumber:3}
    ],
    axisPointer:{link:[{xAxisIndex:"all"}],lineStyle:{color:T.muted}},
    tooltip:{show:S.anomHover==null,trigger:"axis",transitionDuration:0,backgroundColor:T.surface,borderColor:T.line,textStyle:{color:T.ink,fontSize:12},
      formatter:ps=>{ if(!ps.length) return ""; const x=+ps[0].axisValue; let i=Math.max(0,lastLE(d.t,x)); if(i<d.t.length-1&&(d.t[i+1]-x)<(x-d.t[i])) i++;
        const r=[`<b>${fmtDT(d.t[i],true)}</b>`];
        if(Math.abs(S.hc[i]-d.h[i])>1e-9) r.push(`Niveau : <b>${nf(S.hc[i],1)} mm</b> <span style="color:${T.muted}">(fichier ${nf(d.h[i],1)})</span>`); else r.push(`Niveau : <b>${nf(d.h[i],1)} mm</b>`);
        if(ch&&Math.abs(S.qn[i]-d.qo[i])>1e-9) r.push(`Débit : <b>${nf(S.qn[i],3)} m³/h</b> <span style="color:${T.muted}">(fichier ${nf(d.qo[i],3)})</span>`); else r.push(`Débit : <b>${nf(S.qn[i],3)} m³/h</b>`);
        r.push(`<span style="color:${T.muted}">Cumul : ${nf(S.vn[i]-S.vn[0],3)} m³</span>`);
        return r.join("<br>") }},
    toolbox:{show:false,feature:{dataZoom:{xAxisIndex:[0,1],yAxisIndex:false},brush:{type:["lineX","clear"]}}},
    brush:{xAxisIndex:[0,1],brushLink:"all",brushMode:"single",transformable:false,throttleType:"debounce",throttleDelay:200,brushStyle:{borderWidth:1,color:"rgba(0,145,155,0.12)",borderColor:T.nw},outOfBrush:{colorAlpha:1}},
    dataZoom:[
      {type:"inside",xAxisIndex:[0,1],filterMode:"none",...(keepZoom?{start:keepZoom.start,end:keepZoom.end}:{})},
      {type:"slider",xAxisIndex:[0,1],filterMode:"none",height:22,bottom:10,borderColor:T.line,fillerColor:T.soft,handleStyle:{color:T.surface,borderColor:T.brand},moveHandleStyle:{color:T.brand},textStyle:{color:T.ink2,fontSize:10},labelFormatter:v=>fmtDT(v),dataBackground:{lineStyle:{color:T.muted},areaStyle:{color:T.grid}},selectedDataBackground:{lineStyle:{color:T.nw},areaStyle:{color:T.nw,opacity:.15}},brushSelect:false,...(keepZoom?{start:keepZoom.start,end:keepZoom.end}:{})}
    ],
    series
  },{notMerge:true});
  applyCursor();
}
function applyCursor(){
  if(!chart) return;
  if(S.brushing) chart.dispatchAction({type:"takeGlobalCursor",key:"brush",brushOption:{brushType:"lineX",brushMode:"single"}});
  else { chart.dispatchAction({type:"takeGlobalCursor",key:"brush",brushOption:{brushType:false}}); chart.dispatchAction({type:"takeGlobalCursor",key:"dataZoomSelect",dataZoomSelectActive:S.zoomMode}) }
}
function onBrushEnd(p){
  const a=p&&p.areas&&p.areas[0]; if(!a||!a.coordRange) return;
  const r=Array.isArray(a.coordRange[0])?a.coordRange[0]:a.coordRange;
  setTimeout(()=>{ setBrushing(false); chart.dispatchAction({type:"brush",areas:[]}); setSel(Math.min(r[0],r[1]),Math.max(r[0],r[1])) },0);
}
function setBrushing(on){ S.brushing=on; if(on&&S.zoomMode) setZoomMode(false); $("btnBrush").setAttribute("aria-pressed",on); $("btnBrush").classList.toggle("primary",on); $("btnBrush").textContent=on?"Glissez sur la courbe…":"Sélectionner sur la courbe"; $("chartHint").textContent=on?"Cliquez-glissez horizontalement sur la courbe pour choisir la période":"Molette ou pincement pour zoomer, glisser pour se déplacer"; applyCursor() }
function setZoomMode(on){ S.zoomMode=on; if(on&&S.brushing) setBrushing(false); $("btnZoom").setAttribute("aria-pressed",on); $("btnZoom").classList.toggle("primary",on); applyCursor() }

function renderCheckChart(res){
  res=res||S.check; const box=$("checkChart"); if(!res||!window.echarts){box.hidden=true;return}
  box.hidden=false; const T=theme(), d=S.ds, pts=res.pts;
  if(!ckchart){ ckchart=echarts.init(box); new ResizeObserver(()=>ckchart&&ckchart.resize()).observe(box) }
  const stepI=Math.max(1,Math.floor(d.t.length/700)); const sc=[]; for(let i=0;i<d.t.length;i+=stepI) if(isFinite(d.qo[i])) sc.push([d.h[i],d.qo[i]]);
  let hmax=0; for(const h of d.h) if(h>hmax) hmax=h;
  const tl=pts.filter(p=>p[0]<=Math.max(hmax*1.15,pts[1][0]));
  ckchart.setOption({animation:false,textStyle:{fontFamily:css("--f-body")},grid:{left:40,right:22,top:26,bottom:30},
    legend:{top:0,right:0,itemWidth:14,itemHeight:8,textStyle:{color:T.ink2,fontSize:10},data:["Enregistrement","Table chargée"]},
    xAxis:{type:"value",name:"mm",nameGap:4,nameTextStyle:{color:T.ink2,fontSize:10},axisLabel:{color:T.ink2,fontSize:10,formatter:v=>v.toLocaleString("fr-FR")},axisLine:{lineStyle:{color:T.line}},splitLine:{show:false}},
    yAxis:{type:"value",name:"m³/h",nameTextStyle:{color:T.ink2,fontSize:10,align:"left"},axisLabel:{color:T.ink2,fontSize:10,formatter:v=>v.toLocaleString("fr-FR")},splitLine:{lineStyle:{color:T.grid}}},
    series:[{name:"Enregistrement",type:"scatter",data:sc,symbolSize:4,itemStyle:{color:T.or,opacity:.55}},
            {name:"Table chargée",type:"line",data:tl,symbol:"none",lineStyle:{width:2,color:T.nw},itemStyle:{color:T.nw}}]},{notMerge:true});
}

/* ---------- Panneau Modifications ---------- */
function setView(v){ const prev=S.view; S.view=v; $("vHome").hidden=v!=="home"; $("vLevels").hidden=v!=="levels"; $("vLaw").hidden=v!=="law"; $("vLoads").hidden=v!=="loads"; $("vDiag").hidden=v!=="diag"; if(v!=="levels"&&S.brushing) setBrushing(false); if(v!=="diag"){ S.anomHover=null; $("anomCard").hidden=true } if(v==="loads") renderLoadsForm(); renderPanel(); if(S.ds&&(prev==="diag")!==(v==="diag")) renderChart() }
document.querySelectorAll("[data-back]").forEach(b=>b.onclick=()=>setView("home"));
$("actLevels").onclick=()=>setView("levels");
$("actLaw").onclick=()=>setView("law");
$("actLoads").onclick=()=>setView("loads");
$("actDiag").onclick=()=>setView("diag");
document.addEventListener("click",e=>{ const g=e.target.closest("[data-goto]"); if(g){ setView(g.dataset.goto); $("t-mods").scrollIntoView({block:"nearest",behavior:"smooth"}) } });

function modItems(){
  const it=[];
  if(S.newLaw) it.push({kind:"law",label:`Nouvelle loi H/Q : ${S.newLaw.name}`,sub:`${S.newLaw.pts.length} points · tout le bilan est recalculé`});
  for(const c of S.corr) it.push({kind:"corr",id:c.id,label:c.label,sub:c.sub});
  return it;
}
function renderModList(el){
  const it=modItems();
  if(!it.length){ el.innerHTML=""; return }
  el.innerHTML=`<h4>Modifications appliquées</h4><ul>${it.map(m=>`<li><span><b>${esc(m.label)}</b><small>${esc(m.sub)}</small></span><button class="btn small" type="button" data-undo="${m.kind}" data-id="${m.id||""}">Annuler</button></li>`).join("")}</ul>`;
}
function renderPanel(){
  if(!S.ds) return;
  const n=modItems().length; $("modBadge").hidden=!n; $("modBadge").textContent=`${n} en cours`;
  renderModList($("modList")); renderModList($("corrList"));
  if(S.view==="levels") renderLevels();
  if(S.view==="law") renderLawView();
  if(S.view==="loads") renderLoadsRes();
  if(S.view==="diag") renderDiag();
  renderPanelHome();
}
document.addEventListener("click",e=>{
  const b=e.target.closest("button[data-undo]"); if(!b) return;
  if(b.dataset.undo==="law"){ logAction("Nouvelle loi annulée",`Retour à la loi du fichier (${S.newLaw.name} retirée).`); S.newLaw=null; refreshQRepairs(); refreshAfterChange(); return }
  else { const id=+b.dataset.id; const c=S.corr.find(x=>x.id===id); S.corr=S.corr.filter(x=>x.id!==id); if(c) logAction("Correction annulée",c.label); const a=c&&c.anomId&&S.anoms.find(x=>x.id===c.anomId); if(a){ a.status="open"; a.corrId=null; a.impact=null } }
  refreshAfterChange(); if(S.view==="levels") renderGrid();
});

/* Étape 1 : table du site */
function renderLevels(){
  const ok=canCorrect();
  $("st2").classList.toggle("off",!ok); $("st3").classList.toggle("off",!ok);
  $("st2").querySelectorAll("button,input").forEach(x=>x.disabled=!ok); $("st3").querySelectorAll("button,input").forEach(x=>x.disabled=!ok);
  $("btnDemoTable").hidden=!(S.isExample&&DEMO_TABLE&&!S.siteLaw);
  const box=$("checkBox");
  if(S.newLaw&&!S.check){ box.hidden=false; box.className="check info"; box.innerHTML=`Les débits sont déjà recalculés avec la nouvelle loi <b>${esc(S.newLaw.name)}</b> : les niveaux corrigés utiliseront cette loi.` }
  if(S.check) renderCheckChart();
  if(S.ds){ const d=S.ds; for(const id of ["rgFrom","rgTo"]){ $(id).min=toInput(d.t[0]); $(id).max=toInput(d.t[d.t.length-1]) } }
  renderSelInfo();
}
function showCheck(res,name){
  const box=$("checkBox"); box.hidden=false;
  const skipNote=res.skipped?`<p class="help">${res.skipped.toLocaleString("fr-FR")} mesure${res.skipped>1?"s":""} des zones signalées par le diagnostic (niveau à 0 ou figé) ${res.skipped>1?"ont été écartées":"a été écartée"} de la comparaison.</p>`:"";
  const farTxt=()=>{ const f=res.far, d=S.ds; if(!f||!f.n) return ""; const where=f.size>=3?`, dont ${f.size} à la suite du ${fmtDT(d.t[f.i0])} au ${fmtDT(d.t[f.i1])}`:""; return `${f.n.toLocaleString("fr-FR")} mesure${f.n>1?"s":""} s'en écarte${f.n>1?"nt":""} de plus de 10 %${where}` };
  const smp=res.samples.map(s=>`<tr><td>${nf(s.h,0)} mm</td><td>${nf(s.qf,2)}</td><td>${nf(s.qt,2)}</td></tr>`).join("");
  const tbl=smp?`<table class="mini num"><thead><tr><th>Niveau</th><th>Enregistré</th><th>Table</th></tr></thead><tbody>${smp}</tbody></table><p class="help">Débits en m³/h.</p>`:"";
  if(res.noQ){ box.className="check info"; box.innerHTML=`<p><b>Table « ${esc(name)} » chargée (${res.pts.length} points).</b> Le fichier ne contient pas de débit : la correspondance ne peut pas être vérifiée.</p>`; return }
  if(res.ok){
    box.className="check ok";
    box.innerHTML=`<p class="ttl">✓ Cette table correspond à l'enregistrement</p><p>Écart médian de ${nf(res.median*100,1)} % entre le débit enregistré et celui de la table, sur ${res.n.toLocaleString("fr-FR")} mesures${res.worst?`, et au plus ${nf(res.worst.err*100,1)} % sur une tranche de niveaux`:""}.</p>${res.period?`<p class="warn">Sauf du ${fmtDT(S.ds.t[res.period.i0])} au ${fmtDT(S.ds.t[res.period.i1])} : ${res.period.size} mesures s'en écartent de plus de 10 %. À ces moments, le niveau a probablement été modifié sans son débit, ou la zone est anormale. Vérifiez cette période et corrigez-la si besoin.</p>`:""}${skipNote}${tbl}${res.cover?"":`<p class="warn">Attention : le niveau monte jusqu'à ${nf(res.hmax,0)} mm alors que la table s'arrête à ${nf(res.tmax,0)} mm.</p>`}`;
  } else {
    box.className="check ko";
    const tail=!res.globalOk&&res.n>=10&&res.median<=0.02&&res.p90>0.05;
    const why = tail
      ? `Elle correspond à la plupart des mesures (écart médian de ${nf(res.median*100,1)} %), mais ${farTxt()}. À ces moments, le niveau a probablement été modifié sans son débit, ou la zone est anormale. Vérifiez ces mesures dans le fichier : si ce sont bien des erreurs, corrigez-les une fois la table validée.`
      : res.globalOk&&res.worst
      ? `Elle correspond presque partout, mais pas <b>entre ${nf(res.worst.h0,0)} et ${nf(res.worst.h1,0)} mm</b> : à ces niveaux, son débit s'écarte de ${nf(res.worst.err*100,1)} % de celui calculé par l'appareil (${res.worst.n} mesures). Une valeur de cette partie de la table est sans doute fausse.`
      : (isFinite(res.median)?`Le débit qu'elle donne s'écarte en général de ${nf(res.median*100,0)} % de celui calculé par l'appareil (écart médian). Vérifiez que c'est bien la table réglée sur ce site.`:"Aucune mesure exploitable pour la comparer.");
    box.innerHTML=`<p class="ttl">✗ Cette table ne correspond pas à cet enregistrement</p><p>${why}</p>${skipNote}${tbl}${!res.globalOk&&res.hint?`<p class="help">D'après les mesures, l'appareil a utilisé une loi de type <b>${res.hint}</b> (débit proportionnel à H<sup>${nf(res.exp,2)}</sup>).</p>`:""}${keepNote()}`;
  }
}
function incoherence(pts){
  for(let i=0;i<pts.length;i++){
    if(!isFinite(pts[i][0])||!isFinite(pts[i][1])) return "Une valeur de la table est vide ou n'est pas un nombre.";
    if(i>0&&pts[i][0]<=pts[i-1][0]) return `La hauteur ${nf(pts[i][0],0)} mm apparaît après ${nf(pts[i-1][0],0)} mm : les hauteurs doivent aller en augmentant.`;
    if(i>0&&pts[i][1]<pts[i-1][1]) return `À ${nf(pts[i][0],0)} mm, le débit (${nf(pts[i][1],3)} m³/h) est plus faible qu'à ${nf(pts[i-1][0],0)} mm (${nf(pts[i-1][1],3)} m³/h). Dans une table hauteur/débit, le débit augmente toujours avec la hauteur.`;
  }
  return pts.length<2?"La table doit contenir au moins deux points.":"";
}
// Une table refusée bloque les corrections ; si des corrections existent déjà, la dernière table validée reste utilisée.
function keepNote(){ return S.siteLaw&&S.corr.length?`<p class="help">La table validée précédemment (« ${esc(S.siteLaw.name)} ») reste utilisée pour les corrections déjà faites.</p>`:"" }
function rejectTable(name,reason){
  if(!S.corr.length){ S.siteLaw=null; S.check=null }
  logAction(`Table refusée : ${name}`,reason);
  renderLevels(); renderPanel();
}
function useSiteTable(pts,name){
  const bad=incoherence(pts);
  if(bad){ rejectTable(name,bad); $("checkChart").hidden=true; const box=$("checkBox"); box.hidden=false; box.className="check ko"; box.innerHTML=`<p class="ttl">✗ Cette table n'est pas utilisable</p><p>${esc(bad)}</p>${keepNote()}`; return }
  const res=verifyTable(pts);
  if(res.ok||res.ok===null){ S.check=res; S.siteLaw={name,pts}; S.imp=new Map(); refreshQRepairs(); logAction(`Table du site chargée : ${name}`, res.ok?`${pts.length} points, conforme à l'enregistrement (écart médian ${nf(res.median*100,1)} %).`:`${pts.length} points, non vérifiable (pas de débit dans le fichier).`); if(S.corr.length) compute(); renderKpis(); renderChart(); renderVolumes(); renderLevels(); renderPanel(); showCheck(res,name) }
  else { rejectTable(name, !res.globalOk&&res.n>=10&&res.median<=0.02&&res.p90>0.05?`Écart médian de ${nf(res.median*100,1)} %, mais ${res.far.n} mesure(s) à plus de 10 %.`:res.globalOk&&res.worst?`Écart de ${nf(res.worst.err*100,1)} % entre ${nf(res.worst.h0,0)} et ${nf(res.worst.h1,0)} mm.`:`Écart médian de ${nf(res.median*100,0)} % avec l'enregistrement.`); showCheck(res,name); S.lastBad=res }
  renderCheckChart(res);
}
$("btnTableFile").onclick=()=>$("tableInput").click();
$("tableInput").onchange=async e=>{ const f=e.target.files[0]; e.target.value=""; if(f) loadSiteTableFile(f) };
async function loadSiteTableFile(f){
  try{ const pts=await readTableFile(f); if(pts.length<2) throw new Error("Aucune table hauteur/débit trouvée dans ce fichier."); useSiteTable(pts,f.name.replace(/\.[^.]+$/,"").slice(0,24)) }
  catch(err){ const box=$("checkBox"); box.hidden=false; box.className="check ko"; box.innerHTML=`<p class="ttl">« ${esc(f.name)} » n'a pas pu être lu</p><p>${esc(err.message||err)}</p>` }
}
$("btnPasteTable").onclick=()=>{ const pts=parseTableRows(parseCSVText($("pasteTable").value),$("pasteTableUnit").value); if(pts.length<2){ const box=$("checkBox"); box.hidden=false; box.className="check ko"; box.innerHTML="<p>Aucune table reconnue : collez deux colonnes (hauteur en mm, débit).</p>"; return } useSiteTable(pts,"Table collée") };
$("btnDemoTable").onclick=()=>useSiteTable(DEMO_TABLE.map(p=>p.slice()),"Table SITE TEST");
const tDrop=$("tableDrop");
tDrop.addEventListener("dragover",e=>{e.preventDefault();e.stopPropagation();tDrop.classList.add("over")});
tDrop.addEventListener("dragleave",()=>tDrop.classList.remove("over"));
tDrop.addEventListener("drop",e=>{e.preventDefault();e.stopPropagation();tDrop.classList.remove("over");dragDepth=0;$("drop").hidden=true;const f=e.dataTransfer.files[0];if(f) loadSiteTableFile(f)});

/* Étape 2 : période */
function setSel(from,to){
  const d=S.ds; const i0=firstGE(d.t,from), i1=lastLE(d.t,to);
  S.sel=(i0<=i1&&i0<d.t.length&&i1>=0)?{i0,i1}:null;
  if(S.sel){ $("rgFrom").value=toInput(d.t[S.sel.i0]); $("rgTo").value=toInput(d.t[S.sel.i1]) }
  renderSelInfo(); renderGrid(); renderChart();
}
function renderSelInfo(){
  const el=$("rgInfo");
  if(!S.sel){ el.textContent="Aucune période sélectionnée."; return }
  const {i0,i1}=S.sel; let lo=Infinity,hi=-Infinity; for(let i=i0;i<=i1;i++){ lo=Math.min(lo,S.hc[i]); hi=Math.max(hi,S.hc[i]) }
  el.innerHTML=`<b>${i1-i0+1} mesure(s)</b> du ${fmtDT(S.ds.t[i0])} au ${fmtDT(S.ds.t[i1])} · niveau actuel ${nf(lo,1)} à ${nf(hi,1)} mm`;
}
$("btnBrush").onclick=()=>setBrushing(!S.brushing);
for(const id of ["rgFrom","rgTo"]) $(id).onchange=()=>{ const a=fromInput($("rgFrom").value), b=fromInput($("rgTo").value); if(isFinite(a)&&isFinite(b)) setSel(Math.min(a,b),Math.max(a,b)); else if(isFinite(a)) setSel(a,a) };

/* Étape 3 : correction */
document.querySelectorAll('input[name="op"]').forEach(r=>r.onchange=()=>{ const op=document.querySelector('input[name="op"]:checked').value; $("opValWrap").hidden=op==="interp"; $("opDir").hidden=op!=="decal"; $("opValLab").textContent=op==="decal"?(isM()?"Décalage (mm)":"Décalage (mm, + ou −)"):"Niveau (mm)" });
$("btnCorr").onclick=()=>{
  if(!S.sel){ toast("Sélectionnez d'abord la période à corriger (étape 2)."); return }
  const op=document.querySelector('input[name="op"]:checked').value; let val=null;
  if(op!=="interp"){ val=toNum($("opVal").value.replace(/[−–]/g,"-"));
    if(op==="decal"&&isM()&&isFinite(val)) val=Math.abs(val)*opDirSign; /* téléphone : sens choisi avec les boutons Monter / Descendre */
    if(!isFinite(val)){ toast("Indiquez la valeur en mm."); $("opVal").focus(); return } if(op==="fixe"&&val<0){ toast("Le niveau ne peut pas être négatif."); return } }
  const {i0,i1}=S.sel, d=S.ds, n=i1-i0+1;
  const per=i0===i1?`${fmtDT(d.t[i0])}`:`${fmtD(d.t[i0])} ${fmtHM(d.t[i0])} → ${fmtD(d.t[i1])!==fmtD(d.t[i0])?fmtD(d.t[i1])+" ":""}${fmtHM(d.t[i1])}`;
  const what=op==="interp"?"niveau relié en ligne droite":op==="fixe"?`niveau fixé à ${nf(val,1)} mm`:`niveau décalé de ${val>0?"+":""}${nf(val,1)} mm`;
  const c={id:S.nextId++,i0,i1,op,val,label:per,sub:`${what} · ${n} mesure(s)`};
  S.corr.push(c); logAction(`Niveaux corrigés : ${per}`,`${what} sur ${n} mesure(s).`);
  refreshAfterChange(); renderGrid(); toast("Correction appliquée : débit et volumes recalculés.");
};
function renderGrid(){
  const body=$("gridBody"), info=$("gridInfo");
  if(!S.sel){ body.innerHTML=""; info.textContent="Sélectionnez une période à l'étape 2 pour afficher ses mesures."; return }
  const {i0,i1}=S.sel, n=i1-i0+1;
  if(n>MAX_GRID){ body.innerHTML=""; info.textContent=`${n} mesures sélectionnées : réduisez la période à ${MAX_GRID} mesures au plus pour les modifier une à une.`; return }
  info.textContent="Saisissez un nouveau niveau dans la colonne « Corrigé » : le débit est recalculé aussitôt.";
  const d=S.ds; let h="";
  for(let i=i0;i<=i1;i++) h+=`<tr class="${S.mod[i]?"m":""}"><td>${fmtHM(d.t[i],d.step<60)}</td><td>${nf(d.h[i],1)}</td><td><input id="g${i}" data-i="${i}" inputmode="decimal" value="${nf(S.hc[i],1)}" aria-label="Niveau corrigé à ${fmtHM(d.t[i])}"></td><td>${nf(S.qn[i],3)}</td></tr>`;
  body.innerHTML=h;
}
$("gridBody").addEventListener("change",e=>{
  const inp=e.target.closest("input"); if(!inp||!canCorrect()) return;
  const i=+inp.dataset.i, v=toNum(inp.value); if(!isFinite(v)||v<0){ inp.value=nf(S.hc[i],1); return }
  const d=S.ds; let c=S.corr.find(x=>x.i0===i&&x.i1===i&&x.point);
  if(c){ c.val=v; c.sub=`niveau fixé à ${nf(v,1)} mm · 1 mesure` } else { c={id:S.nextId++,i0:i,i1:i,op:"fixe",val:v,point:true,label:fmtDT(d.t[i]),sub:`niveau fixé à ${nf(v,1)} mm · 1 mesure`}; S.corr.push(c) }
  logAction(`Niveau corrigé : ${fmtDT(d.t[i])}`,`${nf(d.h[i],1)} mm (fichier) → ${nf(v,1)} mm.`);
  compute(); renderKpis(); renderChart(); renderVolumes(); renderPanel();
  const row=inp.closest("tr"); row.classList.add("m"); row.children[3].textContent=nf(S.qn[i],3);
});

/* ---------- Changer la loi ---------- */
// Seuls les fichiers .xlsx et .csv sont acceptés. La loi importée est montrée face aux mesures, avec son effet sur le volume, avant d'être appliquée.
function lawMsg(cls,html){ const b=$("lawBox"); b.hidden=!html; b.className="check "+cls; b.innerHTML=html||"" }
async function importLaw(f){
  if(!/\.(xlsx|csv)$/i.test(f.name)){ S.pendingLaw=null; renderLawView(); lawMsg("ko",`<p class="ttl">✗ Format non accepté</p><p>« ${esc(f.name)} » n'est ni un fichier Excel (.xlsx) ni un fichier CSV (.csv). Enregistrez la table dans l'un de ces deux formats.</p>`); return }
  let pts=[]; try{ pts=await readTableFile(f) }catch(e){ console.warn(e) }
  const name=f.name.replace(/\.[^.]+$/,"").slice(0,30);
  if(pts.length<2){ S.pendingLaw=null; renderLawView(); lawMsg("ko",`<p class="ttl">✗ Aucune table trouvée</p><p>« ${esc(f.name)} » ne contient pas de colonnes hauteur (mm) et débit (m³/h ou l/s) lisibles.</p>`); return }
  const bad=incoherence(pts);
  if(bad){ S.pendingLaw=null; renderLawView(); lawMsg("ko",`<p class="ttl">✗ Cette table n'est pas utilisable</p><p>${esc(bad)}</p>`); logAction(`Loi refusée : ${name}`,bad); return }
  S.pendingLaw={name,pts}; lawMsg("",""); renderLawView();
}
function lawEffect(pts){
  const d=S.ds; let over=0; const q=S.hc.map(h=>{const [v,f]=qT(pts,h); if(f>0) over++; return v});
  const V=integrate(d.t,q,d.step); let iq=0; for(let i=1;i<q.length;i++) if(q[i]>q[iq]) iq=i;
  let rel=[]; for(let i=0;i<q.length;i++) if(d.qo[i]>0) rel.push(Math.abs(q[i]-d.qo[i])/d.qo[i]); rel.sort((a,b)=>a-b);
  return {vol:V[V.length-1],qmax:q[iq],over,same:rel.length&&rel[Math.floor(rel.length/2)]<0.02};
}
function renderLawView(){
  $("btnDemoLaw").hidden=!(S.isExample&&DEMO);
  if(!S.ds) return;
  const P=S.pendingLaw; $("lawPreview").hidden=!P;
  const ap=$("lawApplied");
  if(S.newLaw){ ap.hidden=false; ap.innerHTML=`<p><b>Loi appliquée : ${esc(S.newLaw.name)}</b> (${S.newLaw.pts.length} points). Tout le bilan est calculé avec cette loi.</p><div class="inline"><button class="btn small" id="btnRevertLaw" type="button">Revenir à la loi du fichier</button></div>`; $("btnRevertLaw").onclick=revertLaw }
  else ap.hidden=true;
  if(!P) return;
  const e=lawEffect(P.pts), vo=stats().vo, dp=vo>0?(e.vol-vo)/vo*100:0, tmax=P.pts[P.pts.length-1][0];
  let hmax=0; for(const h of S.hc) if(h>hmax) hmax=h;
  $("lawImpact").innerHTML=`<div class="full"><span>Table importée</span><b style="font-size:16px">${esc(P.name)}</b>${P.pts.length} points, de ${nf(P.pts[0][0],0)} à ${nf(tmax,0)} mm</div>
    <div><span>Volume du bilan avec cette loi</span><b class="num">${nf(e.vol,2)} m³</b>fichier : ${nf(vo,2)} m³ (${dp>0?"+":""}${nf(dp,1)} %)</div>
    <div><span>Débit maximal</span><b class="num">${nf(e.qmax,2)} m³/h</b>fichier : ${nf(Math.max(...S.ds.qo.filter(isFinite)),2)} m³/h</div>`
    +(e.over?`<div class="full" style="background:var(--warn-bg);color:var(--warn-ink)"><b style="font-size:13px;color:inherit">${e.over} mesure(s) au-dessus de la table</b>Le niveau monte jusqu'à ${nf(hmax,0)} mm, la table s'arrête à ${nf(tmax,0)} mm : ces débits seront plafonnés.</div>`:"")
    +(e.same?`<div class="full"><b style="font-size:13px">Peu de changement</b>Cette loi donne pratiquement les mêmes débits que l'enregistrement.</div>`:"");
  $("lawPtsSum").textContent=`Voir les ${P.pts.length} points de la table`;
  $("lawBody").innerHTML=P.pts.map(p=>`<tr><td>${nf(p[0],p[0]%1?1:0)}</td><td>${nf(p[1],3)}</td><td>${nf(p[1]/3.6,3)}</td></tr>`).join("");
  $("btnApply").textContent=S.newLaw&&S.newLaw.name===P.name?"Loi déjà appliquée":"Recalculer tout le bilan avec cette loi";
  $("btnApply").disabled=!!(S.newLaw&&S.newLaw.pts===P.pts);
  renderHQ();
}
function renderHQ(){
  if(!window.echarts||S.view!=="law"||!S.pendingLaw) return;
  const T=theme(), d=S.ds, pts=S.pendingLaw.pts;
  if(!hqchart){ hqchart=echarts.init($("hqchart")); new ResizeObserver(()=>hqchart&&hqchart.resize()).observe($("hqchart")) }
  const stepI=Math.max(1,Math.floor(d.t.length/700)); const sc=[]; for(let i=0;i<d.t.length;i+=stepI) if(isFinite(d.qo[i])) sc.push([d.h[i],d.qo[i]]);
  hqchart.setOption({animation:false,textStyle:{fontFamily:css("--f-body")},grid:{left:40,right:22,top:26,bottom:30},
    legend:{top:0,right:0,itemWidth:14,itemHeight:8,textStyle:{color:T.ink2,fontSize:10},data:["Enregistrement","Loi importée"]},
    xAxis:{type:"value",name:"mm",nameGap:4,nameTextStyle:{color:T.ink2,fontSize:10},axisLabel:{color:T.ink2,fontSize:10,formatter:v=>v.toLocaleString("fr-FR")},axisLine:{lineStyle:{color:T.line}},splitLine:{show:false}},
    yAxis:{type:"value",name:"m³/h",nameTextStyle:{color:T.ink2,fontSize:10,align:"left"},axisLabel:{color:T.ink2,fontSize:10,formatter:v=>v.toLocaleString("fr-FR")},splitLine:{lineStyle:{color:T.grid}}},
    tooltip:{trigger:"item",backgroundColor:T.surface,borderColor:T.line,textStyle:{color:T.ink,fontSize:12},formatter:p=>`${nf(p.value[0],0)} mm → <b>${nf(p.value[1],2)} m³/h</b>`},
    series:[{name:"Enregistrement",type:"scatter",data:sc,symbolSize:4,itemStyle:{color:T.or,opacity:.55}},
            {name:"Loi importée",type:"line",data:pts,symbol:"circle",symbolSize:4,lineStyle:{width:2,color:T.nw},itemStyle:{color:T.nw}}]},{notMerge:true});
}
$("btnLawFile").onclick=()=>$("lawInput").click();
$("lawInput").onchange=e=>{ const f=e.target.files[0]; e.target.value=""; if(f) importLaw(f) };
const lDrop=$("lawDrop");
lDrop.addEventListener("dragover",e=>{e.preventDefault();e.stopPropagation();lDrop.classList.add("over")});
lDrop.addEventListener("dragleave",()=>lDrop.classList.remove("over"));
lDrop.addEventListener("drop",e=>{e.preventDefault();e.stopPropagation();lDrop.classList.remove("over");dragDepth=0;$("drop").hidden=true;const f=e.dataTransfer.files[0];if(f) importLaw(f)});
$("btnApply").onclick=()=>{
  const P=S.pendingLaw; if(!P) return;
  const before=stats().vn;
  S.newLaw={name:P.name,pts:P.pts}; refreshQRepairs(); compute();
  logAction(`Nouvelle loi H/Q : ${P.name}`,`${P.pts.length} points (${nf(P.pts[0][0],0)} à ${nf(P.pts[P.pts.length-1][0],0)} mm), interpolation linéaire. Volume total ${nf(before)} → ${nf(stats().vn)} m³.`);
  refreshAfterChange(); toast(`Bilan recalculé avec ${P.name}`);
};
function revertLaw(){ logAction("Nouvelle loi annulée",`Retour à la loi du fichier (${S.newLaw.name} retirée).`); S.newLaw=null; refreshQRepairs(); refreshAfterChange() }

/* ---------- Charges polluantes et équivalents-habitants ----------
   Flux journalier (kg/j) = concentration (mg/l = g/m³) × volume journalier (m³/j) / 1000.
   Volume journalier = volume écoulé sur la période du prélèvement × 24 / durée (en h).
   EH = flux (g/j) / ratio (g/EH/j) ; 1 EH = 60 g DBO5/j. Rendement = 1 − C sortie / C entrée (même volume). */
const PARAMS=[
  {k:"dco",t:"DCO",h:"DCO"},{k:"dbo5",t:"DBO5",h:"DBO<sub>5</sub>"},{k:"mes",t:"MES",h:"MES"},
  {k:"ntk",t:"NTK",h:"NTK"},{k:"nh4",t:"N-NH4",h:"N-NH<sub>4</sub>"},{k:"ngl",t:"NGL",h:"NGL"},{k:"pt",t:"Pt",h:"P<sub>t</sub>"}];
const RATIO_DEF={dco:120,dbo5:60,mes:90,ntk:15,pt:4,vol:150};
let RATIOS={...RATIO_DEF};
try{ const o=JSON.parse(localStorage.getItem("cometecBilanRatios")||"{}"); for(const k in RATIO_DEF) if(o[k]>0) RATIOS[k]=+o[k] }catch(e){}
RATIOS.dbo5=60;
const fmtKg=x=>nf(x,x<10?2:1);
function parseConc(s){
  s=String(s||"").trim(); if(!s) return null;
  const lt=/^[<≤]/.test(s); const v=toNum(s.replace(/^[<≤]\s*/,""));
  return (!isFinite(v)||v<0||!/^[<≤]?\s*[\d.,\s]+$/.test(s))?{bad:true}:{v,lt};
}
function loadsCalc(){
  const d=S.ds, L=S.lab||newLab(), n=d.t.length;
  let i0=L.from==null?0:Math.min(n-1,Math.max(0,firstGE(d.t,L.from))), i1=L.to==null?n-1:Math.max(0,lastLE(d.t,L.to));
  if(i1<=i0){ i0=0; i1=n-1 }
  const vol=S.vn[i1]-S.vn[i0], durH=(d.t[i1]-d.t[i0])/3600000, v24=durH>0?vol*24/durH:NaN;
  const ok=c=>c&&!c.bad;
  const rows=PARAMS.map(p=>{
    const ci=parseConc(L.c[p.k]), co=L.out?parseConc(L.o[p.k]):null, r=RATIOS[p.k]||null;
    const fi=ok(ci)&&isFinite(v24)?ci.v*v24/1000:null, fo=ok(co)&&isFinite(v24)?co.v*v24/1000:null;
    const eh=fi!=null&&r?fi*1000/r:null;
    let rend=null; if(ok(ci)&&!ci.lt&&ci.v>0&&ok(co)) rend=(ci.v-co.v)/ci.v;
    return {p,ci,co,fi,fo,eh,r,rend,rendGt:!!(co&&co.lt),lt:!!(ci&&ci.lt),lto:!!(co&&co.lt)};
  });
  const by={}; rows.forEach(r=>by[r.p.k]=r);
  const cap=toNum(L.cap), qn=toNum(L.qnom), ehO=by.dbo5.eh;
  const cd=by.dco.ci, cb=by.dbo5.ci;
  return {i0,i1,vol,durH,v24,rows,by,any:rows.some(r=>r.fi!=null),ehO,ehOlt:by.dbo5.lt,ehH:isFinite(v24)?v24*1000/RATIOS.vol:null,
    cap:cap>0?cap:null,qnom:qn>0?qn:null,tco:cap>0&&ehO!=null?ehO/cap:null,tch:qn>0&&isFinite(v24)?v24/qn:null,
    dcoDbo:ok(cd)&&ok(cb)&&!cd.lt&&!cb.lt&&cb.v>0?cd.v/cb.v:null, hasOut:L.out&&rows.some(r=>r.fo!=null), lab:L.lab};
}
function renderLoadsForm(){
  $("btnDemoLab").hidden=!(S.isExample&&DEMO);
  if(!S.ds) return; const L=S.lab, d=S.ds, n=d.t.length;
  $("ldOut").checked=L.out;
  $("ldHead").innerHTML=`<tr><th>Paramètre</th><th>${L.out?"Entrée":"Concentration"} (mg/l)</th>${L.out?"<th>Sortie (mg/l)</th>":""}</tr>`;
  const inp=(p,w)=>{ const v=(w==="c"?L.c:L.o)[p.k]||"", c=parseConc(v); return `<input data-k="${p.k}" data-w="${w}" inputmode="decimal" autocomplete="off" class="${c&&c.bad?"bad":""}" value="${esc(v)}" aria-label="${p.t}${L.out?(w==="c"?" entrée":" sortie"):""} en mg/l">` };
  $("ldBody").innerHTML=PARAMS.map(p=>`<tr><td>${p.h}</td><td>${inp(p,"c")}</td>${L.out?`<td>${inp(p,"o")}</td>`:""}</tr>`).join("");
  for(const id of ["ldFrom","ldTo"]){ $(id).min=toInput(d.t[0]); $(id).max=toInput(d.t[n-1]) }
  $("ldFrom").value=toInput(L.from??d.t[0]); $("ldTo").value=toInput(L.to??d.t[n-1]);
  $("ldLab").value=L.lab; $("ldCap").value=L.cap; $("ldQnom").value=L.qnom;
  for(const k of ["dco","mes","ntk","pt","vol"]) $("r_"+k).value=String(RATIOS[k]).replace(".",",");
  renderLoadsRes();
}
function renderLoadsRes(){
  if(!S.ds) return; const C=loadsCalc(), d=S.ds, L=S.lab;
  const whole=C.i0===0&&C.i1===d.t.length-1;
  $("ldAll").hidden=whole;
  $("ldVol").innerHTML=`Volume écoulé : <b>${nf(C.vol,2)} m³</b> en ${fmtDur(C.durH*3600)}`+(Math.abs(C.durH-24)>0.05&&isFinite(C.v24)?`, soit <b>${nf(C.v24,2)} m³/j</b> ramené à 24 h`:"")+(C.durH<12?`<br><span style="color:var(--warn-ink)">Période courte : les flux journaliers sont extrapolés à 24 h.</span>`:"");
  const el=$("ldRes");
  if(!C.any){ el.innerHTML=`<p class="help">Les flux et les équivalents-habitants s'affichent dès qu'une concentration est saisie.</p>`; return }
  const lt=f=>f?"< ":"";
  const tiles=[];
  if(C.ehO!=null) tiles.push(`<div><span>Charge organique</span><b class="num">${lt(C.ehOlt)}${nf(C.ehO,0)} EH</b>${lt(C.ehOlt)}${fmtKg(C.by.dbo5.fi)} kg DBO<sub>5</sub>/j · 60 g/EH/j</div>`);
  if(C.ehH!=null) tiles.push(`<div><span>Charge hydraulique</span><b class="num">${nf(C.ehH,0)} EH</b>${nf(C.v24,1)} m³/j · ${nf(RATIOS.vol,0)} l/EH/j</div>`);
  if(C.tco!=null) tiles.push(`<div><span>Taux de charge organique</span><b class="num">${lt(C.ehOlt)}${nf(C.tco*100,0)} %</b>capacité ${nf(C.cap,0)} EH</div>`);
  if(C.tch!=null) tiles.push(`<div><span>Taux de charge hydraulique</span><b class="num">${nf(C.tch*100,0)} %</b>référence ${nf(C.qnom,0)} m³/j</div>`);
  if(C.dcoDbo!=null) tiles.push(`<div class="full"><span>Rapport DCO / DBO<sub>5</sub></span><b class="num">${nf(C.dcoDbo,2)}</b>eaux usées domestiques : 2 à 2,5 environ</div>`);
  const rows=C.rows.filter(r=>r.fi!=null||r.fo!=null);
  const out=C.hasOut;
  const tb=`<div class="tablewrap ldres"><table class="num"><thead><tr><th>Paramètre</th><th>Flux${out?" entrée":""} (kg/j)</th><th>EH</th>${out?"<th>Flux sortie (kg/j)</th><th>Rendement</th>":""}</tr></thead><tbody>${rows.map(r=>`<tr><td>${r.p.h}</td><td class="${r.lt?"lt":""}">${r.fi!=null?lt(r.lt)+fmtKg(r.fi):"–"}</td><td>${r.eh!=null?lt(r.lt)+nf(r.eh,0):"–"}</td>${out?`<td class="${r.lto?"lt":""}">${r.fo!=null?lt(r.lto)+fmtKg(r.fo):"–"}</td><td>${r.rend!=null?(r.rendGt?"> ":"")+nf(r.rend*100,1)+" %":"–"}</td>`:""}</tr>`).join("")}</tbody></table></div>`;
  el.innerHTML=(tiles.length?`<div class="impact">${tiles.join("")}</div>`:"")+tb
    +`<p class="ldnote">EH calculés avec ${["dco","mes","ntk","pt"].map(k=>`${PARAMS.find(p=>p.k===k).h} ${nf(RATIOS[k],RATIOS[k]%1?1:0)} g`).join(", ")} par EH et par jour.${out?" Rendements calculés sur les concentrations (même volume en entrée et en sortie).":""} Repris dans l'export Excel et le rapport PDF.</p>`;
}
$("ldBody").addEventListener("input",e=>{
  const inp=e.target.closest("input"); if(!inp) return;
  (inp.dataset.w==="c"?S.lab.c:S.lab.o)[inp.dataset.k]=inp.value;
  const c=parseConc(inp.value); inp.classList.toggle("bad",!!(c&&c.bad));
  renderLoadsRes(); renderKpis(); renderPanelHome();
});
$("ldOut").onchange=e=>{ S.lab.out=e.target.checked; renderLoadsForm(); renderKpis(); renderPanelHome() };
for(const id of ["ldFrom","ldTo"]) $(id).onchange=()=>{
  let a=fromInput($("ldFrom").value), b=fromInput($("ldTo").value); const d=S.ds;
  if(!isFinite(a)) a=d.t[0]; if(!isFinite(b)) b=d.t[d.t.length-1]; if(a>b) [a,b]=[b,a];
  S.lab.from=a; S.lab.to=b; renderLoadsRes(); renderKpis() };
$("ldAll").onclick=()=>{ S.lab.from=null; S.lab.to=null; renderLoadsForm(); renderKpis() };
$("ldLab").oninput=e=>S.lab.lab=e.target.value;
for(const [id,k] of [["ldCap","cap"],["ldQnom","qnom"]]) $(id).oninput=e=>{ S.lab[k]=e.target.value; renderLoadsRes(); renderKpis() };
for(const k of ["dco","mes","ntk","pt","vol"]) $("r_"+k).onchange=e=>{
  const v=toNum(e.target.value); if(v>0) RATIOS[k]=v; else e.target.value=String(RATIOS[k]).replace(".",",");
  try{ localStorage.setItem("cometecBilanRatios",JSON.stringify(RATIOS)) }catch(err){}
  renderLoadsRes(); renderKpis(); renderPanelHome() };
$("ldRatioReset").onclick=()=>{ RATIOS={...RATIO_DEF}; try{ localStorage.removeItem("cometecBilanRatios") }catch(e){} renderLoadsForm(); renderKpis() };
function renderPanelHome(){ const A=S.anoms||[], oa=A.filter(a=>a.status==="open").length; $("actDiagSub").textContent=!A.length?"Aucune anomalie détectée dans ce bilan.":oa?`${oa} anomalie${oa>1?"s":""} à examiner sur ${A.length} détectée${A.length>1?"s":""}.`:`${A.length} anomalie${A.length>1?"s":""} traitée${A.length>1?"s":""}.`; $("actDiag").classList.toggle("hot",oa>0); const C=loadsCalc(); $("actLoadsSub").textContent=C.any?`${C.ehO!=null?`${C.ehOlt?"< ":""}${nf(C.ehO,0)} EH (DBO5)`:"Analyses saisies"} · ${C.rows.filter(r=>r.fi!=null).length} paramètre(s)`:"Saisissez les analyses du laboratoire : flux en kg/j, équivalents-habitants, taux de charge, rendements." }

/* ---------- Diagnostic du bilan ----------
   Repère dans le niveau enregistré : niveau nul, niveau figé (canne bouchée ou blocage hydraulique), valeur aberrante,
   décalage brutal, trou d'enregistrement. Chaque anomalie reçoit une analyse, une cause présumée et une réparation proposée ;
   rien n'est modifié sans validation. Les réparations sont des corrections comme les autres (journal, Excel, annulation). */
const median=a=>{ if(!a.length) return NaN; const s=Float64Array.from(a).sort(), m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2 };
const maxOf=a=>{ let m=-Infinity; for(const x of a) if(x>m) m=x; return m };
const fmtShort=s=>{ s=Math.round(s); if(s<60) return s+" s"; const m=Math.round(s/60); if(m<60) return m+" min"; return `${Math.floor(m/60)} h ${p2(m%60)}` };
const pctS=(a,b)=>{ if(!(a>0)) return "–"; const p=(b-a)/a*100; return (p>0?"+":p<0?"−":"")+nf(Math.abs(p),1)+" %" };
const sgnV=(x,d=2)=>(x>0?"+":x<0?"−":"")+nf(Math.abs(x),d);
const ATYPE={zero:{label:"Niveau nul",tok:"--an-red"},flat:{label:"Niveau figé",tok:"--an-red"},spike:{label:"Valeur aberrante",tok:"--an-orange"},shift:{label:"Décalage brutal",tok:"--an-orange"},gap:{label:"Trou d'enregistrement",tok:"--an-grey"}};
const CAUSES={zero:["Canne hors de l'eau","Arrivée d'air coupée","Autre"],flat:["Canne bouchée","Réseau bouché ou mise en charge","Autre"],spike:["Valeur parasite","Autre"],shift:["Canne déplacée","Réglage modifié","Autre"],gap:["Coupure d'alimentation","Autre"]};
const METHOD_LABEL={motif:"Reconstituer le niveau d'après le motif de la courbe",line:"Relier en ligne droite",qmotif:"Garder le niveau, reconstituer le débit d'après le motif",decal:"Retirer le décalage",gapline:"Compter le volume manquant (débit moyen des mesures voisines)"};
const perLabel=(i0,i1)=>{ const t=S.ds.t, a=t[i0], b=t[i1]; if(i0===i1) return `${fmtD(a)} ${fmtHM(a)}`; return `${fmtD(a)} ${fmtHM(a)} → ${fmtD(b)!==fmtD(a)?fmtD(b)+" ":""}${fmtHM(b)}` };
const anomDur=a=>a.type==="gap"?(S.ds.t[a.i1]-S.ds.t[a.i0])/1000:(S.ds.t[a.i1]-S.ds.t[a.i0])/1000+S.ds.step;

/* Loi hauteur/débit déduite de l'enregistrement : utilisée quand aucune table n'a été chargée */
function deriveLaw(){
  const d=S.ds; if(!d.hasQ) return null;
  const pts=[]; for(let i=0;i<d.t.length;i++) if(isFinite(d.qo[i])&&d.qo[i]>=0&&d.h[i]>0.5) pts.push([d.h[i],d.qo[i]]);
  if(pts.length<20) return null;
  pts.sort((a,b)=>a[0]-b[0]);
  const w=Math.max(0.5,(pts[pts.length-1][0]-pts[0][0])/150), out=[];
  for(let k=0;k<pts.length;){ const b0=pts[k][0], bin=[]; while(k<pts.length&&pts[k][0]<b0+w) bin.push(pts[k++]); out.push([median(bin.map(p=>p[0])),median(bin.map(p=>p[1]))]) }
  for(let i=1;i<out.length;i++) if(out[i][1]<out[i-1][1]) out[i][1]=out[i-1][1];
  if(out[0][0]>1) out.unshift([0,0]);
  const res=[]; for(const p of out) if(!res.length||p[0]>res[res.length-1][0]+1e-6) res.push(p);
  return res.length>=2?{name:"loi déduite de l'enregistrement",pts:res}:null;
}

/* Deux défauts seulement : toute mesure de niveau à 0 (même une seule), et le niveau strictement figé (exactement la même valeur)
   pendant au moins X minutes. Sur de vrais bilans, une mesure ne se répète jamais à l'identique plus de 2 à 4 fois de suite : X = 10 min par défaut. */
function detectAnomalies(){
  const d=S.ds, n=d.t.length, h=d.h, t=d.t, step=d.step, out=[], X=S.diagX*60;
  if(n<3) return out;
  const dur=(s,e)=>(t[e]-t[s])/1000+step;
  const medAround=(a,b)=>{ a=Math.max(0,a); b=Math.min(n-1,b); return b<a?NaN:median(h.slice(a,b+1)) };
  const W30=Math.max(2,Math.round(1800/step)), W10=Math.max(2,Math.round(600/step));
  const dh=[]; for(let i=1;i<n;i++){ const x=Math.abs(h[i]-h[i-1]); if(x>1e-6) dh.push(x) } const md=Math.max(median(dh)||0.1,0.05);
  // la montée vers le palier (ou la chute vers 0) et le retour font partie du défaut
  const grow=(s,e,P)=>{ const l0=Math.max(0,s-W10), l1=Math.min(n-1,e+W10);
    // une mesure n'est ajoutée que si elle fait elle-même partie de la rampe (elle bouge nettement par rapport à sa voisine extérieure)
    while(s>l0+1&&Math.abs(h[s-1]-P)>Math.abs(h[s]-P)&&Math.abs(h[s-1]-h[s])>2*md&&Math.abs(h[s-2]-h[s-1])>2*md) s--;
    while(e<l1-1&&Math.abs(h[e+1]-P)>Math.abs(h[e]-P)&&Math.abs(h[e+1]-h[e])>2*md&&Math.abs(h[e+2]-h[e+1])>2*md) e++;
    return [s,e] };
  // niveau à 0
  for(let i=0,s=-1;i<=n;i++){ const z=i<n&&h[i]<=0.5; if(z&&s<0) s=i;
    if(!z&&s>=0){ const e=i-1; out.push({type:"zero",i0:s,i1:e,before:medAround(s-W30,s-1),after:medAround(e+1,e+W30)}); s=-1 } }
  // niveau strictement figé (hors zéro)
  for(let i=1,s=0;i<=n;i++){ if(i<n&&h[i]===h[i-1]) continue; const e=i-1;
    if(h[s]>0.5&&e>s&&dur(s,e)>=X){ const [a,b]=grow(s,e,h[s]); if(!out.some(o=>a<=o.i1&&b>=o.i0)) out.push({type:"flat",i0:a,i1:b,lvl:h[s]}) } s=i }
  out.sort((a,b)=>a.i0-b.i0);
  out.forEach((a,k)=>{ a.id=k+1; a.status="open"; a.cause=defaultCause(a); a.method=defaultMethod(a) });
  return out;
}
function defaultCause(a){ return a.type==="flat"&&a.hint==="hydro"?CAUSES.flat[1]:CAUSES[a.type][0] }
function methodsFor(a){ const d=S.ds, canQ=d.hasQ||!!(S.newLaw||S.siteLaw);
  switch(a.type){ case "zero": return ["motif","line"]; case "flat": return canQ?["motif","line","qmotif"]:["motif","line"]; case "spike": return ["line"]; case "shift": return ["decal"]; default: return ["gapline"] } }
function defaultMethod(a){ return a.type==="flat"&&a.cause===CAUSES.flat[1]&&methodsFor(a).includes("qmotif")?"qmotif":"motif" }

/* Reconstitution par motif : on cherche ailleurs dans l'enregistrement le passage dont l'avant et l'après ressemblent le plus
   à ceux de la zone, puis on le recale exactement sur les mesures qui encadrent la zone. */
function reconstruct(arr,a){
  const d=S.ds, n=arr.length, i0=a.i0, i1=a.i1, L=i1-i0+1;
  const K=Math.min(Math.max(5,Math.round(L/2)),Math.max(5,Math.round(3600/d.step))), st=Math.max(1,Math.floor(K/60));
  const other=new Uint8Array(n); for(const b of S.anoms||[]) if(b!==a&&b.status!=="ignored") for(let i=b.i0;i<=b.i1;i++) other[i]=1;
  const pre=[],post=[]; for(let k=1;k<=K;k+=st){ if(i0-k>=0&&!other[i0-k]) pre.push(k); if(i1+k<n&&!other[i1+k]) post.push(k) }
  if(!pre.length&&!post.length) return null;
  const bad=new Int32Array(n+1); for(let i=0;i<n;i++) bad[i+1]=bad[i]+((other[i]||(i>=i0-2&&i<=i1+2))?1:0);
  const nm=pre.length?pre[pre.length-1]:1, np=post.length?post[post.length-1]:1;
  const span=(d.t[n-1]-d.t[0])/3600000, tod=ms=>(ms/3600000)%24;
  let best=null;
  for(let j=nm;j+L-1+np<n;j++){ if(bad[j+L+np]-bad[j-nm]>0) continue;
    let sc=0; for(const k of pre){ const e=arr[j-k]-arr[i0-k]; sc+=e*e } for(const k of post){ const e=arr[j+L-1+k]-arr[i1+k]; sc+=e*e }
    sc/=pre.length+post.length;
    if(span>=30){ let dd=Math.abs(tod(d.t[j])-tod(d.t[i0])); dd=Math.min(dd,24-dd); sc*=1+.15*dd } // bilan de plusieurs jours : même heure de préférence
    if(!best||sc<best.sc) best={j,sc} }
  if(!best) return null;
  const j=best.j, oa=i0>0?arr[i0-1]-arr[j-1]:null, ob=i1<n-1?arr[i1+1]-arr[j+L]:null, A=oa??ob??0, B=ob??oa??0, vals=[];
  for(let m=0;m<L;m++){ const f=L>1?m/(L-1):.5; vals.push(Math.max(0,arr[j+m]+A+(B-A)*f)) }
  return {vals,j0:j,j1:j+L-1};
}
function buildRepair(a,m){
  const n=a.i1-a.i0+1, c={anomId:a.id,i0:a.i0,i1:a.i1,label:perLabel(a.i0,a.i1)}; let what;
  if(m==="line"){ c.op="interp"; what="niveau relié en ligne droite" }
  else if(m==="motif"){ const r=reconstruct(S.hc,a); if(!r) return null; c.op="vals"; c.vals=r.vals; c.src=[r.j0,r.j1]; what=`niveau reconstitué d'après le motif du ${perLabel(r.j0,r.j1)}` }
  else if(m==="qmotif"){ const r=reconstruct(S.qn,a); if(!r) return null; c.op="qvals"; c.qvals=r.vals; c.src=[r.j0,r.j1]; what=`niveau conservé, débit reconstitué d'après le motif du ${perLabel(r.j0,r.j1)}` }
  else if(m==="decal"){ c.op="decal"; c.val=-a.jump; what=`niveau corrigé de ${sgnV(-a.jump,1)} mm` }
  else { c.op="gap"; what="volume manquant compté au débit moyen des mesures voisines" }
  c.what=what; c.sub=`${ATYPE[a.type].label} n°${a.id} : ${what} · ${a.type==="gap"?fmtShort(anomDur(a))+" sans mesure":n+" mesure(s)"}`;
  return c;
}
/* Effet d'une réparation, calculé sans rien modifier (on l'applique, on mesure, on la retire) */
function impactOf(a,m){
  const key=a.id+"|"+m; if(S.imp.has(key)) return S.imp.get(key);
  const zv=()=>S.vn[a.i1]-S.vn[Math.max(0,a.i0-1)];
  const v0=stats().vn, z0=zv(), q0=maxOf(S.qn), c=buildRepair(a,m); let r=null;
  if(c){ S.corr.push(c); compute(); const lo=Math.max(0,a.i0-1), hi=Math.min(S.ds.t.length-1,a.i1+1);
    r={v0,v1:stats().vn,z0,z1:zv(),q0,q1:maxOf(S.qn),c,lo,hi,gh:S.hc.slice(lo,hi+1),gq:S.qn.slice(lo,hi+1)};
    S.corr.pop(); compute() }
  S.imp.set(key,r); return r;
}
function anomText(a){
  const dur=fmtShort(anomDur(a)), b=isFinite(a.before)?a.before:null, f=isFinite(a.after)?a.after:null;
  if(a.type==="zero") return `${a.i0===a.i1?`Une mesure à 0 mm le ${fmtDT(S.ds.t[a.i0])}`:`${a.i1-a.i0+1} mesures à 0 mm pendant ${dur}`}${b!=null||f!=null?`, contre ${[b!=null?nf(b,0)+" mm juste avant":"",f!=null?nf(f,0)+" mm après":""].filter(Boolean).join(" et ")}`:""}. Canne de bullage hors de l'eau ou arrivée d'air coupée ? Si le collecteur était réellement à sec, le niveau est correct : ignorez l'anomalie.`;
  return `Niveau bloqué à exactement ${nf(a.lvl,a.lvl%1?3:0)} mm pendant ${dur} : une mesure par bullage ne se répète jamais aussi longtemps à l'identique. Bouchon probable sur la canne de bullage. Si un blocage du réseau a été constaté sur place, le niveau peut être réel mais le débit calculé ne l'est plus : gardez le niveau et reconstituez le débit.`;
}
/* Quand la loi hauteur/débit change, les débits reconstitués (« garder le niveau, reconstituer le débit ») sont recalculés avec la nouvelle loi */
function refreshQRepairs(){
  const list=S.corr.filter(c=>c.op==="qvals"&&c.anomId); if(!list.length) return;
  for(const c of list){ const a=S.anoms.find(x=>x.id===c.anomId); if(!a) continue;
    const k=S.corr.indexOf(c); S.corr.splice(k,1); compute(); const r=reconstruct(S.qn,a);
    if(r){ c.qvals=r.vals; c.src=[r.j0,r.j1] } S.corr.splice(k,0,c) }
  compute();
}
function applyRepair(a,quiet){
  const imp=impactOf(a,a.method);
  if(!imp){ toast("Aucun passage comparable trouvé dans l'enregistrement : choisissez « Relier en ligne droite »."); return false }
  const c=imp.c; c.id=S.nextId++; S.corr.push(c); a.status="fixed"; a.corrId=c.id; a.impact=imp.v1-imp.v0; a.what=c.what;
  logAction(`Anomalie réparée : ${ATYPE[a.type].label} n°${a.id}`,`${c.label} – ${c.what}. Cause retenue : ${a.cause}. Volume du bilan ${nf(imp.v0,2)} → ${nf(imp.v1,2)} m³ (${pctS(imp.v0,imp.v1)}).`);
  if(!quiet){ refreshAfterChange(); toast(`Anomalie n°${a.id} réparée : ${sgnV(a.impact)} m³ sur le bilan`) }
  return true;
}
function ignoreAnom(a){ a.status="ignored"; logAction(`Anomalie ignorée : ${ATYPE[a.type].label} n°${a.id}`,`${perLabel(a.i0,a.i1)} – jugée correcte, aucune modification.`); refreshAfterChange() }
function reopenAnom(a){
  if(a.status==="fixed"){ S.corr=S.corr.filter(c=>c.id!==a.corrId); logAction(`Réparation annulée : ${ATYPE[a.type].label} n°${a.id}`,perLabel(a.i0,a.i1)) }
  else logAction(`Anomalie rétablie : ${ATYPE[a.type].label} n°${a.id}`,perLabel(a.i0,a.i1));
  a.status="open"; a.corrId=null; a.impact=null; refreshAfterChange();
}
function repairAll(){
  const todo=S.anoms.filter(a=>a.status==="open"); let ok=0;
  for(const a of todo){ S.imp=new Map(); if(applyRepair(a,true)) ok++; compute() }
  refreshAfterChange(); toast(`${ok} anomalie(s) réparée(s)`);
}

/* ---- affichage ---- */
const anomCol=a=>css(ATYPE[a.type].tok);
const STATUS={open:["À traiter","st-open"],fixed:["Réparée","st-fixed"],ignored:["Ignorée","st-ign"]};
function anomDetail(a){
  const d=S.ds, [stl,stc]=STATUS[a.status], n=a.i1-a.i0+1;
  let h=`<div class="adt" data-anom="${a.id}"><div class="ad-head"><span class="ad-num" style="background:${anomCol(a)}">${a.id}</span><b>${ATYPE[a.type].label}</b><span class="chip ${stc}">${stl}</span></div>
    <p class="ad-when num">${perLabel(a.i0,a.i1)} · ${fmtShort(anomDur(a))}${a.type==="gap"?" sans mesure":` · ${n} mesure${n>1?"s":""}`}</p>
    <p class="ad-text">${esc(anomText(a))}</p>`;
  if(a.status==="open"){
    const ms=methodsFor(a); if(a.method!=="line"&&!impactOf(a,a.method)) a.method="line";
    const imp=impactOf(a,a.method);
    h+=`<div class="ad-lab">Cause retenue</div><div class="chips">${CAUSES[a.type].map(c=>`<button type="button" class="chipb${c===a.cause?" on":""}" data-cause="${esc(c)}">${esc(c)}</button>`).join("")}</div>`;
    if(ms.length>1) h+=`<div class="ad-lab">Réparation</div><div class="opts">${ms.map(m=>`<label><input type="radio" name="m${a.id}" value="${m}" data-method="${m}"${m===a.method?" checked":""}> <span>${METHOD_LABEL[m]}</span></label>`).join("")}</div>`;
    else h+=`<div class="ad-lab">Réparation</div><p class="ad-one">${a.method==="decal"?`${METHOD_LABEL.decal} (${sgnV(-a.jump,0)} mm sur toute la zone)`:METHOD_LABEL[a.method]}</p>`;
    if(imp){ h+=`<div class="ad-imp num"><div><span>${a.type==="gap"?"Volume compté":"Volume de la zone"}</span><b>${nf(imp.z0,2)} → ${nf(imp.z1,2)} m³</b></div>
        <div><span>Volume du bilan</span><b>${nf(imp.v0,2)} → ${nf(imp.v1,2)} m³</b><em class="${imp.v1<imp.v0?"dn":"up"}">${pctS(imp.v0,imp.v1)}</em></div>
        <div><span>Débit maximal</span><b>${Math.abs(imp.q1-imp.q0)<5e-4?`${nf(imp.q0,2)} m³/h, inchangé`:`${nf(imp.q0,2)} → ${nf(imp.q1,2)} m³/h`}</b></div></div>`;
      if(imp.c.src) h+=`<p class="ad-src">Motif repris du ${perLabel(imp.c.src[0],imp.c.src[1])}, encadré en pointillés sur la courbe.</p>` }
    else h+=`<p class="ad-src warn">Aucun passage comparable dans l'enregistrement : choisissez « Relier en ligne droite ».</p>`;
    h+=`<div class="inline ad-btns"><button type="button" class="btn primary" data-do="fix"${imp?"":" disabled"}>Réparer</button><button type="button" class="btn" data-do="ignore">Ignorer, le niveau est correct</button></div>`;
  } else if(a.status==="fixed"){
    h+=`<div class="ad-done"><b>Réparée</b> : ${esc(a.what)}. Cause retenue : ${esc(a.cause)}.<br>Effet sur le bilan : <b class="num">${sgnV(a.impact)} m³</b></div><button type="button" class="btn small" data-do="reopen">Annuler la réparation</button>`;
  } else h+=`<div class="ad-ign">Ignorée : le niveau a été jugé correct, rien n'a été modifié.</div><button type="button" class="btn small" data-do="reopen">Rétablir l'anomalie</button>`;
  return h+"</div>";
}
function renderDiag(){
  const A=S.anoms||[], box=$("dgSum"), locked=A.some(a=>a.status!=="open");
  $("dgX").value=String(S.diagX); $("dgX").disabled=locked; $("dgXHelp").textContent=locked?"Annulez les réparations et les anomalies ignorées pour changer cette durée.":"";
  if(!A.length){ box.innerHTML=`<div class="check ok"><p class="ttl">✓ Aucune anomalie détectée</p><p>Aucune mesure de niveau à 0, et le niveau n'est jamais resté figé sur une même valeur pendant ${S.diagX} min ou plus.</p></div>`; $("dgList").innerHTML=""; return }
  const cnt=s=>A.filter(a=>a.status===s).length, open=A.filter(a=>a.status==="open");
  let tot=0; for(const a of open){ const r=impactOf(a,a.method); if(r) tot+=r.v1-r.v0 }
  const v=stats().vn;
  box.innerHTML=`<div class="dgsum"><div class="dg-big">${A.length} anomalie${A.length>1?"s":""} détectée${A.length>1?"s":""}</div>
    <div class="dg-counts"><span class="chip st-open">${cnt("open")} à traiter</span><span class="chip st-fixed">${cnt("fixed")} réparée${cnt("fixed")>1?"s":""}</span><span class="chip st-ign">${cnt("ignored")} ignorée${cnt("ignored")>1?"s":""}</span></div>
    ${open.length?`<p class="dg-imp num">Si tout est réparé : volume du bilan <b>${nf(v,2)} → ${nf(v+tot,2)} m³</b> (${pctS(v,v+tot)})</p>
    <button type="button" class="btn primary" id="dgAll">${S.confirmAll?`Confirmer : réparer ${open.length} anomalie${open.length>1?"s":""}`:`Tout réparer (${open.length})`}</button>`:`<p class="dg-imp">Toutes les anomalies ont été traitées.</p>`}</div>`;
  if($("dgAll")) $("dgAll").onclick=()=>{ if(!S.confirmAll){ S.confirmAll=true; renderDiag(); clearTimeout(S._ca); S._ca=setTimeout(()=>{ S.confirmAll=false; if(S.view==="diag") renderDiag() },4000); return } S.confirmAll=false; repairAll() };
  $("dgList").innerHTML=A.map(a=>{ const [stl,stc]=STATUS[a.status];
    return `<div class="dgitem${S.anomSel===a.id?" sel":""} ${a.status}"><button type="button" class="dgrow" data-pick="${a.id}"><span class="ad-num" style="background:${anomCol(a)}">${a.id}</span><span class="dgtxt"><b>${ATYPE[a.type].label}</b><small class="num">${perLabel(a.i0,a.i1)} · ${fmtShort(anomDur(a))}</small></span><span class="chip ${stc}">${stl}</span></button>${S.anomSel===a.id?anomDetail(a):""}</div>` }).join("");
}
$("dgX").onchange=e=>{ S.diagX=+e.target.value; S.anoms=detectAnomalies(); S.imp=new Map(); S.anomSel=null; renderKpis(); renderPanel(); renderChart() };
function focusAnom(id,zoom){
  S.anomSel=S.anomSel===id&&!zoom?null:id; renderDiag(); renderChart();
  const a=S.anoms.find(x=>x.id===id); if(!a||!chart) return;
  const d=S.ds, pad=Math.max(3*(d.t[a.i1]-d.t[a.i0]),3600000), lo=Math.max(d.t[0],d.t[a.i0]-pad), hi=Math.min(d.t[d.t.length-1],d.t[a.i1]+pad);
  if(S.anomSel) chart.dispatchAction({type:"dataZoom",startValue:lo,endValue:hi});
}
/* zones, pastilles et aperçu de la réparation sur la courbe (vue Diagnostic uniquement) */
function diagChart(T){
  const d=S.ds, A=S.anoms||[], areas=[], pins=[], ghost=[];
  const span=d.t[d.t.length-1]-d.t[0], minW=Math.max(d.step*1000,span*.004);
  for(const a of A){
    let t0=d.t[a.i0], t1=d.t[a.i1]; if(t1-t0<minW){ const m=(t0+t1)/2; t0=m-minW/2; t1=m+minW/2 }
    const focus=(S.anomHover??S.anomSel)===a.id, col=a.status==="fixed"?T.nw:a.status==="ignored"?T.muted:anomCol(a);
    areas.push([{xAxis:t0,itemStyle:{color:col,opacity:focus?.32:(a.status==="open"?.2:.12),borderColor:col,borderWidth:focus?1.5:0}},{xAxis:t1}]);
    let qtop=0; for(let i=a.i0;i<=a.i1;i++) qtop=Math.max(qtop,S.qn[i]);
    pins.push({value:[(t0+t1)/2,qtop],itemStyle:{color:col},label:{formatter:a.status==="fixed"?"✓":String(a.id)}});
    if(focus&&a.status==="open"){ const r=impactOf(a,a.method); if(r){
      ghost.push({lv:r.gh.map((v,k)=>[d.t[r.lo+k],v]),q:r.gq.map((v,k)=>[d.t[r.lo+k],v]),levelChanged:a.method!=="qmotif"&&a.method!=="gapline"});
      if(r.c.src) areas.push([{xAxis:d.t[r.c.src[0]],itemStyle:{color:T.nw,opacity:.06,borderColor:T.nw,borderWidth:1.2,borderType:"dashed"},label:{show:true,position:"insideTop",formatter:"Motif",color:T.nw,fontSize:11,fontWeight:"bold"}},{xAxis:d.t[r.c.src[1]]}]) } }
  }
  return {areas,pins,ghost};
}
function anomAtPixel(px,py){
  if(!chart||S.view!=="diag"||!S.anoms||!S.anoms.length) return null;
  let g=null; if(chart.containPixel({gridIndex:0},[px,py])) g=0; else if(chart.containPixel({gridIndex:1},[px,py])) g=1; if(g==null) return null;
  const x=chart.convertFromPixel({gridIndex:g},[px,py])[0], x2=chart.convertFromPixel({gridIndex:g},[px+9,py])[0], tol=Math.abs(x2-x), d=S.ds;
  const span=d.t[d.t.length-1]-d.t[0], minW=Math.max(d.step*1000,span*.004)/2;
  let best=null; for(const a of S.anoms){ const m=(d.t[a.i0]+d.t[a.i1])/2, t0=Math.min(d.t[a.i0],m-minW)-tol, t1=Math.max(d.t[a.i1],m+minW)+tol; if(x>=t0&&x<=t1) best=a }
  return best;
}
let cardTimer=null;
function showCard(a,px){
  const c=$("anomCard"); clearTimeout(cardTimer);
  if(!a){ cardTimer=setTimeout(()=>{ if(c.matches(":hover")) return; c.hidden=true; if(S.anomHover!=null){ S.anomHover=null; renderChart() } },260); return }
  if(S.anomHover!==a.id||c.hidden){ S.anomHover=a.id; c.innerHTML=`<button class="ad-close" type="button" data-closecard aria-label="Fermer">×</button>`+anomDetail(a); c.hidden=false; renderChart() }
  // la carte se place à côté de la zone, sans la masquer
  const box=$("chartSec").getBoundingClientRect(), w=c.offsetWidth, chartX=$("chart").offsetLeft, d=S.ds;
  const x0=chart.convertToPixel({gridIndex:0},[d.t[a.i0],0])[0], x1=chart.convertToPixel({gridIndex:0},[d.t[a.i1],0])[0];
  let left=chartX+Math.max(x1,px)+16;
  if(left+w>box.width-8) left=chartX+Math.min(x0,px)-w-16;
  if(left<8) left=Math.min(Math.max(8,chartX+px+18),box.width-w-8);
  c.style.left=left+"px"; c.style.top=($("chart").offsetTop+28)+"px";
}
$("anomCard").addEventListener("mouseleave",()=>showCard(null));
document.addEventListener("click",e=>{
  const pick=e.target.closest("[data-pick]"); if(pick){ focusAnom(+pick.dataset.pick,false); return }
  const box=e.target.closest("[data-anom]"); if(!box||!S.anoms) return;
  const a=S.anoms.find(x=>x.id===+box.dataset.anom); if(!a) return;
  const cause=e.target.closest("[data-cause]"), act=e.target.closest("[data-do]");
  if(cause){ a.cause=cause.dataset.cause; if(a.type==="flat") a.method=defaultMethod(a); rerenderAnom(a); return }
  if(act){ $("anomCard").hidden=true; S.anomHover=null;
    if(act.dataset.do==="fix") applyRepair(a); else if(act.dataset.do==="ignore") ignoreAnom(a); else reopenAnom(a); return }
});
document.addEventListener("change",e=>{ const r=e.target.closest("[data-method]"); if(!r) return; const box=r.closest("[data-anom]"); const a=S.anoms&&S.anoms.find(x=>x.id===+box.dataset.anom); if(!a) return; a.method=r.value; rerenderAnom(a) });
function rerenderAnom(a){ if(!$("anomCard").hidden&&S.anomHover===a.id) $("anomCard").innerHTML=anomDetail(a); if(S.view==="diag") renderDiag(); renderChart() }

/* ---------- Volumes ---------- */
function renderVolumes(){
  const d=S.ds, ch=changed();
  $("volHead").innerHTML=`<tr><th>Période</th><th>Vol. fichier (m³)</th><th>Vol. corrigé (m³)</th><th>Écart</th><th class="bar">Comparaison</th></tr>`;
  const rows=intervals(d.t,S.vo,S.vn,S.step);
  const max=Math.max(...rows.map(r=>Math.max(r.vo,r.vn)),1e-9);
  const lab=r=>{ const day=S.step>=86400; const s=day?fmtD(r.from):`${fmtD(r.from)} ${fmtHM(r.from)}`; const e=day?fmtD(r.to):fmtHM(r.to); return `${s} → ${e}${r.partial?` (${fmtShort((r.to-r.from)/1000)})`:""}` };
  const pct=(a,b)=>{ if(!ch||!(a>0)) return "–"; const p=(b-a)/a*100; if(Math.abs(p)<0.05) return "="; return (p>0?"+":"")+nf(p,Math.abs(p)<10?1:0)+" %" };
  $("volBody").innerHTML=rows.map(r=>`<tr class="${r.partial?"partiel":""}${ch&&Math.abs(r.vn-r.vo)>5e-4?" diff":""}"><td>${lab(r)}</td><td>${nf(r.vo)}</td><td>${ch?nf(r.vn):"–"}</td><td>${pct(r.vo,r.vn)}</td>
      <td class="bar"><div class="bars">${ch?`<i class="n" style="width:${r.vn/max*100}%"></i>`:""}<i class="o" style="width:${r.vo/max*100}%"></i></div></td></tr>`).join("");
  const to=rows.reduce((s,r)=>s+r.vo,0), tn=rows.reduce((s,r)=>s+r.vn,0);
  if(isM()) $("volBody").closest("table").classList.toggle("unchanged",!ch);
  $("volFoot").innerHTML=`<tr><td>Total (${rows.length} intervalles)</td><td>${nf(to)}</td><td>${ch?nf(tn):"–"}</td><td>${pct(to,tn)}</td><td></td></tr>`;
}
$("stepSelect").onchange=e=>{S.step=+e.target.value; if(S.ds) renderVolumes()};
function renderJournal(){ $("journal").innerHTML=S.log.map(l=>`<li><b>${esc(l.action)}</b><span>${esc(l.detail)}</span><span>${new Date(l.at).toLocaleString("fr-FR")}</span></li>`).join("") }

/* ---------- Zoom ---------- */
$("btnZoom").onclick=()=>setZoomMode(!S.zoomMode);
$("btnReset").onclick=()=>chart&&chart.dispatchAction({type:"dataZoom",start:0,end:100});

/* ---------- Ouverture ---------- */
const emptyMode=()=>!S.ds;
/* Sans enregistrement ouvert : l'interface de travail est affichée, la carte de la courbe sert de zone de dépôt, le reste est inactif. */
const NEED_DATA=["btnReport","btnExport","stepSelect","actLevels","actLaw","actLoads","actDiag"];
function setNoData(on){
  document.body.classList.toggle("nodata",on); $("dropzone").hidden=!on;
  for(const id of NEED_DATA) $(id).disabled=on;
  if(!on) return;
  $("intro").hidden=true; $("modBadge").hidden=true; $("emptyErr").hidden=true; setView("home");
  $("volHead").innerHTML=`<tr><th>Période</th><th>Volume (m³)</th></tr>`;
  $("volBody").innerHTML=`<tr><td colspan="2" class="nd">Les volumes apparaîtront à l'ouverture d'un enregistrement.</td></tr>`; $("volFoot").innerHTML="";
  $("journal").innerHTML=`<li class="nd">Aucune modification.</li>`;
}
function showFileError(html){ const e=$("fileErr"); e.innerHTML=html+'<button class="link" type="button" id="fileErrClose">Fermer</button>'; e.hidden=false; $("fileErrClose").onclick=()=>e.hidden=true; e.scrollIntoView({block:"nearest"}) }
async function openFile(f){
  $("emptyErr").hidden=true; $("fileErr").hidden=true;
  try{ const ds=await readFile(f); loadDataset(ds,false); toast(`${f.name} ouvert : ${ds.t.length} mesures`) }
  catch(err){ console.warn(err);
    const html = err instanceof NativeError
      ? (err.already?`<b>« ${esc(f.name)} » n'est pas accepté.</b> ${esc(ALREADY)}`
        :`<b>« ${esc(f.name)} » n'est pas reconnu comme un enregistrement du BUL'R2.</b> Ouvrez le fichier Excel ou CSV exporté par l'appareil.<ul>${err.reasons.slice(0,3).map(r=>`<li>${esc(r.charAt(0).toUpperCase()+r.slice(1))}.</li>`).join("")}</ul>`)
      : `<b>« ${esc(f.name)} » n'a pas pu être lu.</b> ${esc(err.message||"")}`;
    if(emptyMode()){ const e=$("emptyErr"); e.innerHTML=html; e.hidden=false } else showFileError(html) }
}
$("btnOpen").onclick=()=>$("fileInput").click();
$("fileInput").onchange=e=>{const f=e.target.files[0]; e.target.value=""; if(f) openFile(f)};
let dragDepth=0;
addEventListener("dragenter",e=>{ if(e.dataTransfer&&[...e.dataTransfer.types].includes("Files")){dragDepth++; if(emptyMode()) $("dropzone").classList.add("over"); else if(S.view!=="levels"&&S.view!=="law") $("drop").hidden=false} });
addEventListener("dragleave",()=>{ dragDepth=Math.max(0,dragDepth-1); if(!dragDepth){ $("drop").hidden=true; $("dropzone").classList.remove("over") } });
addEventListener("dragover",e=>e.preventDefault());
addEventListener("drop",e=>{ e.preventDefault(); dragDepth=0; $("drop").hidden=true; $("dropzone").classList.remove("over"); const f=e.dataTransfer.files[0]; if(f) openFile(f) });
$("dropzone").onclick=e=>{ if(!e.target.closest("button,a,.dz-err")) $("fileInput").click() };
$("btnOpen2").onclick=e=>{e.stopPropagation(); $("fileInput").click()};

/* ---------- Export Excel ---------- */
/* ---------- Graphiques Excel natifs ----------
   ExcelJS ne sait pas créer de graphiques : on ajoute au classeur généré les parties DrawingML
   (graphiques Excel natifs, modifiables, reliés aux données des onglets). */
const xesc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const XNS='xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const xRun=(sz,col,b)=>`<a:defRPr sz="${sz}" b="${b?1:0}"><a:solidFill><a:srgbClr val="${col}"/></a:solidFill><a:latin typeface="Arial"/><a:cs typeface="Arial"/></a:defRPr>`;
const xTxPr=(sz,col,rot)=>`<c:txPr><a:bodyPr${rot!=null?` rot="${rot}" vert="horz"`:""}/><a:lstStyle/><a:p><a:pPr>${xRun(sz,col)}</a:pPr><a:endParaRPr lang="fr-FR"/></a:p></c:txPr>`;
const xTitle=(text,sz,col)=>`<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr>${xRun(sz,col,1)}</a:pPr><a:r><a:rPr lang="fr-FR" sz="${sz}" b="1"><a:solidFill><a:srgbClr val="${col}"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${xesc(text)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
const xAxTitle=text=>`<c:title><c:tx><c:rich><a:bodyPr rot="-5400000" vert="horz"/><a:lstStyle/><a:p><a:pPr>${xRun(900,"456161")}</a:pPr><a:r><a:rPr lang="fr-FR" sz="900" b="0"><a:solidFill><a:srgbClr val="456161"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${xesc(text)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
const xGrid=`<c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E3EAEA"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>`;
const xAxLine=`<c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="BFCFCF"/></a:solidFill></a:ln></c:spPr>`;
const xNoLine=`<c:spPr><a:ln><a:noFill/></a:ln></c:spPr>`;
const xWrap=(title,plot,legend)=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace ${XNS}><c:roundedCorners val="0"/><c:chart>${xTitle(title,1200,"1A4D4D")}<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>${plot}</c:plotArea>${legend?`<c:legend><c:legendPos val="t"/><c:overlay val="0"/>${xTxPr(900,"456161")}</c:legend>`:""}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="D2DDDD"/></a:solidFill></a:ln></c:spPr>${xTxPr(900,"456161")}</c:chartSpace>`;
function xBarChart(o){ // o: {title, sheet, catCol, rows:[r0,r1], series:[{name,col,color}], skip, yTitle}
  const ref=c=>`'${o.sheet.replace(/'/g,"''")}'!$${c}$${o.rows[0]}:$${c}$${o.rows[1]}`;
  const ser=o.series.map((s,i)=>`<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${xesc(s.name)}</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="${s.color}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr><c:invertIfNegative val="0"/><c:cat><c:strRef><c:f>${ref(o.catCol)}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${ref(s.col)}</c:f></c:numRef></c:val></c:ser>`).join("");
  const plot=`<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${ser}<c:gapWidth val="${o.series.length>1?70:45}"/><c:overlap val="${o.series.length>1?-5:0}"/><c:axId val="5001"/><c:axId val="5002"/></c:barChart>`
   +`<c:catAx><c:axId val="5001"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/>${xAxLine}${xTxPr(800,"456161",-2700000)}<c:crossAx val="5002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:tickLblSkip val="${o.skip}"/><c:noMultiLvlLbl val="0"/></c:catAx>`
   +`<c:valAx><c:axId val="5002"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/>${xGrid}${xAxTitle(o.yTitle)}<c:numFmt formatCode="${o.fmt||"#,##0.0"}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>${xNoLine}${xTxPr(800,"456161")}<c:crossAx val="5001"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
  return xWrap(o.title,plot,o.series.length>1);
}
function xLineChart(o){ // nuage de points relié : x = date (numéro de série Excel), y = débit
  const ref=c=>`'${o.sheet.replace(/'/g,"''")}'!$${c}$${o.rows[0]}:$${c}$${o.rows[1]}`;
  const ser=o.series.map((s,i)=>`<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${xesc(s.name)}</c:v></c:tx><c:spPr><a:ln w="${s.w||19050}" cap="rnd"><a:solidFill><a:srgbClr val="${s.color}"/></a:solidFill>${s.dash?'<a:prstDash val="dash"/>':""}<a:round/></a:ln></c:spPr><c:marker><c:symbol val="none"/></c:marker><c:xVal><c:numRef><c:f>${ref(o.xCol)}</c:f></c:numRef></c:xVal><c:yVal><c:numRef><c:f>${ref(s.col)}</c:f></c:numRef></c:yVal><c:smooth val="0"/></c:ser>`).join("");
  const plot=`<c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>${ser}<c:axId val="6001"/><c:axId val="6002"/></c:scatterChart>`
   +`<c:valAx><c:axId val="6001"/><c:scaling><c:orientation val="minMax"/><c:max val="${o.xmax}"/><c:min val="${o.xmin}"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="${o.xfmt}" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/>${xAxLine}${xTxPr(800,"456161")}<c:crossAx val="6002"/><c:crosses val="autoZero"/><c:crossBetween val="midCat"/><c:majorUnit val="${o.xunit}"/></c:valAx>`
   +`<c:valAx><c:axId val="6002"/><c:scaling><c:orientation val="minMax"/>${o.ymin!=null?`<c:min val="${o.ymin}"/>`:""}</c:scaling><c:delete val="0"/><c:axPos val="l"/>${xGrid}${xAxTitle(o.yTitle)}<c:numFmt formatCode="${o.fmt||"#,##0.0"}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>${xNoLine}${xTxPr(800,"456161")}<c:crossAx val="6001"/><c:crosses val="autoZero"/><c:crossBetween val="midCat"/></c:valAx>`;
  return xWrap(o.title,plot,o.series.length>1);
}
async function injectCharts(buf,sheetFile,charts){ // charts: [{xml, from:[col,row], to:[col,row]}]
  const zip=await JSZip.loadAsync(buf);
  const anchors=charts.map((c,i)=>`<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${c.from[0]}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${c.from[1]}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${c.to[0]}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${c.to[1]}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i+2}" name="Graphique ${i+1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${i+1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`).join("");
  zip.file("xl/drawings/drawing1.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors}</xdr:wsDr>`);
  zip.file("xl/drawings/_rels/drawing1.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${charts.map((c,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${i+1}.xml"/>`).join("")}</Relationships>`);
  charts.forEach((c,i)=>zip.file(`xl/charts/chart${i+1}.xml`,c.xml));
  const relPath=`xl/worksheets/_rels/${sheetFile}.rels`; const relDrawing=`<Relationship Id="rIdDrw1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>`;
  const existing=zip.file(relPath);
  if(existing){ const r=await existing.async("string"); zip.file(relPath,r.replace("</Relationships>",relDrawing+"</Relationships>")) }
  else zip.file(relPath,`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relDrawing}</Relationships>`);
  let sx=await zip.file(`xl/worksheets/${sheetFile}`).async("string");
  const tail=["<legacyDrawing","<legacyDrawingHF","<picture","<oleObjects","<controls","<webPublishItems","<tableParts","<extLst","</worksheet>"].map(t=>sx.indexOf(t)).filter(k=>k>=0);
  const at=Math.min(...tail); sx=sx.slice(0,at)+'<drawing r:id="rIdDrw1"/>'+sx.slice(at); zip.file(`xl/worksheets/${sheetFile}`,sx);
  let ct=await zip.file("[Content_Types].xml").async("string");
  ct=ct.replace("</Types>",`<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>${charts.map((c,i)=>`<Override PartName="/xl/charts/chart${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join("")}</Types>`);
  zip.file("[Content_Types].xml",ct);
  return zip.generateAsync({type:"arraybuffer",compression:"DEFLATE"});
}
const excelSerial=ms=>ms/86400000+25569;

async function exportExcel(){
  if(!window.ExcelJS){ toast("Module Excel indisponible."); return }
  const d=S.ds, n=d.t.length, s=stats(), ch=changed();
  const wb=new ExcelJS.Workbook(); wb.creator="COMETEC Bilan"; wb.created=new Date();
  const BR="FF1A4D4D", SOFT="FFCCDCDC", RED="FFE3000B", AMB="FFFFF1DC";
  const hdr=row=>{row.eachCell(c=>{c.font={bold:true,color:{argb:"FFFFFFFF"}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:BR}};c.alignment={vertical:"middle",horizontal:"center",wrapText:true};c.border={bottom:{style:"thin",color:{argb:RED}}}}); row.height=32};
  const lab=c=>{c.font={bold:true};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:SOFT}}};
  const asDate=ms=>new Date(ms);

  // Feuille 1 « Bilan » : les mesures en colonnes A à H (en-tête figé, on peut descendre librement), le résumé du bilan à droite (J:K)
  const ws=wb.addWorksheet("Bilan",{views:[{state:"frozen",ySplit:1,xSplit:1,topLeftCell:"B2"}]});
  ws.columns=[{width:19},{width:13},{width:13},{width:15},{width:15},{width:15},{width:15},{width:10},{width:3},{width:30},{width:46}];
  const hr=ws.getRow(1); hr.values=["Date / heure","Niveau du fichier (mm)","Niveau corrigé (mm)","Débit du fichier (m³/h)","Débit corrigé (m³/h)","Volume cumulé fichier (m³)","Volume cumulé corrigé (m³)","Modifié"]; hdr(hr);
  for(let i=0;i<n;i++){
    const row=ws.getRow(2+i);
    row.values=[asDate(d.t[i]),+d.h[i].toFixed(3),+S.hc[i].toFixed(3),isFinite(d.qo[i])?d.qo[i]:null,+S.qn[i].toFixed(4),+(S.vo[i]-S.vo[0]).toFixed(4),+(S.vn[i]-S.vn[0]).toFixed(4),S.mod[i]?"oui":""];
    if(S.mod[i]) for(const c of [3,5,7,8]) row.getCell(c).fill={type:"pattern",pattern:"solid",fgColor:{argb:AMB}};
  }
  for(let i=0;i<n;i++){ const row=ws.getRow(2+i); row.getCell(1).numFmt="dd/mm/yyyy hh:mm:ss"; [2,3].forEach(c=>row.getCell(c).numFmt="0.0"); [4,5,6,7].forEach(c=>row.getCell(c).numFmt="0.000") }
  const info=[...(S.isExample?[["Données","DÉMONSTRATION – SITE TEST, données fictives"]]:[]),["Site",d.meta.site||""],["Début",asDate(d.t[0])],["Fin",asDate(d.t[n-1])],["Pas d'enregistrement (s)",d.step],["Mode d'origine",d.meta.mode||""],["Fichier source",d.fileName],
    ["Table H/Q du site",S.siteLaw?`${S.siteLaw.name}${S.check&&S.check.ok?` (vérifiée, écart médian ${nf(S.check.median*100,1)} %)`:""}`:"—"],
    ["Nouvelle loi H/Q",S.newLaw?S.newLaw.name:"—"],["Anomalies détectées",S.anoms&&S.anoms.length?`${S.anoms.length} (${S.anoms.filter(a=>a.status==="fixed").length} réparée(s), ${S.anoms.filter(a=>a.status==="ignored").length} ignorée(s)) – voir l'onglet « Anomalies »`:"aucune"],["Corrections de niveau",S.corr.length?`${S.corr.length} correction(s), ${S.mod.reduce((a,b)=>a+b,0)} mesure(s) modifiée(s)`:"aucune"],
    ["Volume total – fichier (m³)",+s.vo.toFixed(3)],["Volume total – corrigé (m³)",+s.vn.toFixed(3)],["Débit maximal corrigé (m³/h)",+S.qn[s.iq].toFixed(3)],["Débit moyen corrigé (m³/h)",+s.qmoy.toFixed(3)]];
  { const C=loadsCalc(); if(C.ehO!=null) info.push(["Charge organique (EH, base DBO5)",(C.ehOlt?"< ":"")+Math.round(C.ehO)]); if(C.any) info.push(["Charges polluantes","voir l'onglet « Charges polluantes »"]) }
  const tcell=ws.getCell("J1"); tcell.value=`Bilan ${d.meta.site||""} – BUL'R2`; tcell.font={bold:true,size:14,color:{argb:BR}};
  info.forEach((r,i)=>{ const lc=ws.getCell(3+i,10), vc=ws.getCell(3+i,11); lc.value=r[0]; lab(lc); vc.value=r[1]; vc.alignment={horizontal:"left"}; vc.numFmt=r[1] instanceof Date?"dd/mm/yyyy hh:mm":"General" });
  const wg=wb.addWorksheet("Graphiques",{views:[{showGridLines:false}],pageSetup:{paperSize:9,orientation:"portrait",fitToPage:true,fitToWidth:1,fitToHeight:1,printArea:"A1:O53",horizontalCentered:true,margins:{left:0.4,right:0.4,top:0.5,bottom:0.5,header:0.2,footer:0.2}}});

  const stepLabel=$("stepSelect").selectedOptions[0].textContent;
  const wv=wb.addWorksheet(`Volumes ${stepLabel}`.slice(0,31),{views:[{state:"frozen",ySplit:1}]});
  wv.columns=[{width:18},{width:18},{width:18},{width:18},{width:10},{width:16}];
  const vh=wv.getRow(1); vh.values=["Début","Fin","Volume fichier (m³)","Volume corrigé (m³)","Durée couverte","Période"]; hdr(vh);
  const iv=intervals(d.t,S.vo,S.vn,S.step);
  const plab=r=>S.step>=86400?fmtD(r.from):`${fmtD(r.from)} ${fmtHM(r.from)}`;
  iv.forEach((r,i)=>{const row=wv.getRow(2+i); row.values=[asDate(r.from),asDate(r.to),+r.vo.toFixed(3),+r.vn.toFixed(3),fmtShort((r.to-r.from)/1000),plab(r)]; if(Math.abs(r.vn-r.vo)>5e-4) row.getCell(4).fill={type:"pattern",pattern:"solid",fgColor:{argb:AMB}}});
  const tr=wv.getRow(2+iv.length); tr.values=["Total","",+iv.reduce((a,r)=>a+r.vo,0).toFixed(3),+iv.reduce((a,r)=>a+r.vn,0).toFixed(3),""]; tr.font={bold:true};
  [1,2].forEach(c=>wv.getColumn(c).numFmt="dd/mm/yyyy hh:mm"); [3,4].forEach(c=>wv.getColumn(c).numFmt="0.000");

  const LC=loadsCalc();
  if(LC.any) loadsSheet(wb,hdr,lab,LC);
  if(S.anoms&&S.anoms.length){
    const wa=wb.addWorksheet("Anomalies",{views:[{state:"frozen",ySplit:1}]});
    wa.columns=[{width:6},{width:22},{width:17},{width:17},{width:10},{width:70},{width:12},{width:30},{width:60},{width:16}];
    const ah=wa.getRow(1); ah.values=["N°","Anomalie","Début","Fin","Durée","Analyse","Statut","Cause retenue","Réparation","Effet sur le volume (m³)"]; hdr(ah);
    const STL={open:"Non traitée",fixed:"Réparée",ignored:"Ignorée"}, FILL={open:"FFFDECEC",fixed:"FFE6F4F5",ignored:"FFF0F3F3"};
    S.anoms.forEach((a,k)=>{ const r=wa.getRow(2+k);
      r.values=[a.id,ATYPE[a.type].label,new Date(d.t[a.i0]),new Date(d.t[a.i1]),fmtShort(anomDur(a)),anomText(a),STL[a.status],a.status==="open"?"":(a.status==="ignored"?"Niveau jugé correct":a.cause),a.status==="fixed"?a.what:(a.status==="ignored"?"Aucune modification":""),a.status==="fixed"?+a.impact.toFixed(3):null];
      r.alignment={vertical:"top",wrapText:true}; r.getCell(7).fill={type:"pattern",pattern:"solid",fgColor:{argb:FILL[a.status]}} });
    [3,4].forEach(c=>wa.getColumn(c).numFmt="dd/mm/yyyy hh:mm"); wa.getColumn(10).numFmt="+0.000;-0.000;0";
    const nr=wa.getRow(3+S.anoms.length); nr.getCell(1).value=`Détection automatique sur le niveau enregistré. Une réparation n'est appliquée qu'après validation de l'opérateur. Le débit des niveaux réparés est calculé avec ${S.newLaw?`la loi « ${S.newLaw.name} »`:S.siteLaw?`la table du site « ${S.siteLaw.name} »`:"la loi hauteur/débit déduite de l'enregistrement"}. Une zone reconstituée reste une estimation.`;
    nr.getCell(1).font={italic:true,size:9,color:{argb:"FF6F8787"}}; wa.mergeCells(nr.number,1,nr.number,10); nr.getCell(1).alignment={wrapText:true}; nr.height=30;
  }
  if(S.corr.length){
    const wc=wb.addWorksheet("Corrections"); wc.columns=[{width:19},{width:19},{width:40},{width:12}];
    const h=wc.getRow(1); h.values=["Début","Fin","Correction","Mesures"]; hdr(h);
    S.corr.forEach((c,i)=>{wc.getRow(2+i).values=[asDate(d.t[c.i0]),asDate(d.t[c.i1]),c.sub.split(" · ")[0],c.i1-c.i0+1]});
    [1,2].forEach(c=>wc.getColumn(c).numFmt="dd/mm/yyyy hh:mm:ss");
  }
  const lawSheet=(title,law)=>{ const wl=wb.addWorksheet(title.slice(0,31)); wl.columns=[{width:16},{width:16},{width:14}];
    wl.getCell("A1").value=law.name; wl.getCell("A1").font={bold:true,color:{argb:BR}};
    const lh=wl.getRow(2); lh.values=["Hauteur (mm)","Débit (m³/h)","Débit (l/s)"]; hdr(lh);
    law.pts.forEach((p,i)=>{wl.getRow(3+i).values=[p[0],p[1],+(p[1]/3.6).toFixed(3)]}); wl.getColumn(2).numFmt="0.000"; wl.getColumn(3).numFmt="0.000" };
  if(S.siteLaw) lawSheet("Table du site",S.siteLaw);
  if(S.newLaw) lawSheet("Nouvelle loi H-Q",S.newLaw);
  const wj=wb.addWorksheet("Journal"); wj.columns=[{width:20},{width:38},{width:90}];
  const jh=wj.getRow(1); jh.values=["Date","Action","Détail"]; hdr(jh);
  S.log.forEach((l,i)=>{const r=wj.getRow(2+i); r.values=[new Date(l.at-new Date(l.at).getTimezoneOffset()*60000),l.action,l.detail]; r.getCell(3).alignment={wrapText:true,vertical:"top"}});
  wj.getColumn(1).numFmt="dd/mm/yyyy hh:mm";

  // Onglet « Graphiques » : en-tête, puis volumes par intervalle et débit dans le temps
  wg.getCell("A1").value=`Bilan ${d.meta.site||""} – BUL'R2`; wg.getCell("A1").font={bold:true,size:16,color:{argb:BR}};
  wg.getCell("A2").value=`Du ${fmtDT(d.t[0])} au ${fmtDT(d.t[n-1])} · volume total ${ch?"corrigé ":""}${nf(s.vn,2)} m³${ch?` (fichier : ${nf(s.vo,2)} m³)`:""}`; wg.getCell("A2").font={size:11,color:{argb:"FF456161"}};
  wg.getCell("A3").value=(S.isExample?"Données de démonstration (fictives) – ":"")+(ch?`Courbes corrigées${S.newLaw?` avec la loi ${S.newLaw.name}`:""}${S.corr.length?`, ${S.corr.length} correction(s) de niveau`:""} – COMETEC Bilan`:"Données enregistrées par l'appareil – COMETEC Bilan"); wg.getCell("A3").font={italic:true,size:9,color:{argb:"FF6F8787"}};
  const buf0=await wb.xlsx.writeBuffer();
  let buf=buf0;
  if(window.JSZip){ try{
    const vSheet=wv.name, nI=iv.length, step=S.step;
    const volSeries=ch?[{name:"Volume du fichier",col:"C",color:"C85A10"},{name:"Volume corrigé",col:"D",color:"00919B"}]:[{name:"Volume",col:"D",color:"00919B"}];
    const vTitle=`Volumes par intervalle de ${stepLabel} (m³)`;
    const x0=excelSerial(d.t[0]), x1=excelSerial(d.t[n-1]), span=x1-x0;
    const units=[1/288,1/144,1/96,1/48,1/24,2/24,3/24,4/24,6/24,12/24,1,2,7]; const xunit=units.find(u=>span/u<=10)||7;
    const qSeries=ch?[{name:"Débit du fichier",col:"D",color:"C85A10",dash:true,w:12700},{name:"Débit corrigé",col:"E",color:"00919B"}]:[{name:"Débit",col:"E",color:"00919B"}];
    const charts=[
      {xml:xBarChart({title:vTitle,sheet:vSheet,catCol:"F",rows:[2,1+nI],series:volSeries,skip:Math.max(1,Math.ceil(nI/16)),yTitle:"Volume (m³)",fmt:s.vn>=1000?"#,##0":"#,##0.0"}),from:[0,4],to:[14,27]},
      {xml:xLineChart({title:"Débit dans le temps (m³/h)",sheet:"Bilan",xCol:"A",rows:[2,1+n],series:qSeries,xmin:Math.floor(x0/xunit+1e-9)*xunit,xmax:Math.ceil(x1/xunit-1e-9)*xunit,xunit,xfmt:span<1?"hh:mm":"dd/mm hh:mm",yTitle:"Débit (m³/h)",fmt:S.qn[s.iq]>=1000?"#,##0":"#,##0.0"}),from:[0,29],to:[14,52]}
    ];
    buf=await injectCharts(buf0,"sheet2.xml",charts);
  }catch(err){ console.warn("Graphiques non ajoutés",err); buf=buf0 } }
  const day=new Date(d.t[0]); const stamp=`${day.getUTCFullYear()}-${p2(day.getUTCMonth()+1)}-${p2(day.getUTCDate())}`;
  const name=`Bilan_${(d.meta.site||"BULR2").replace(/[^\w-]+/g,"_")}_${stamp}${ch?"_corrige":""}.xlsx`;
  await saveFile(name,new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
}
/* Onglet « Charges polluantes » : formules Excel, le client peut corriger une concentration ou un ratio et tout se recalcule. */
function loadsSheet(wb,hdr,lab,C){
  const d=S.ds, out=C.hasOut||S.lab.out;
  const ws=wb.addWorksheet("Charges polluantes",{views:[{showGridLines:false}]});
  ws.columns=[{width:34},{width:16},{width:17},{width:15},{width:12},{width:16},{width:17},{width:13}];
  const EDIT={type:"pattern",pattern:"solid",fgColor:{argb:"FFE6F4F5"}};
  ws.getCell("A1").value="Charges polluantes et équivalents-habitants"; ws.getCell("A1").font={bold:true,size:14,color:{argb:"FF1A4D4D"}};
  ws.getCell("A2").value="Les cellules sur fond bleu (concentrations, ratios, capacité) peuvent être modifiées : les flux et les EH se recalculent."; ws.getCell("A2").font={italic:true,size:9,color:{argb:"FF6F8787"}};
  const kv=(r,k,v,fmt)=>{ const a=ws.getCell(r,1), b=ws.getCell(r,2); a.value=k; lab(a); b.value=v; if(fmt) b.numFmt=fmt; b.alignment={horizontal:"left"}; return b };
  kv(4,"Début du prélèvement",new Date(d.t[C.i0]),"dd/mm/yyyy hh:mm");
  kv(5,"Fin du prélèvement",new Date(d.t[C.i1]),"dd/mm/yyyy hh:mm");
  kv(6,"Volume écoulé sur la période (m³)",+C.vol.toFixed(3),"#,##0.000");
  kv(7,"Durée (h)",+C.durH.toFixed(4),"0.00");
  kv(8,"Volume journalier (m³/j)",{formula:"IF(B7>0,B6*24/B7,\"\")",result:+C.v24.toFixed(3)},"#,##0.00");
  kv(9,"Laboratoire, n° de rapport",C.lab||"");
  const H=11, hrow=ws.getRow(H);
  hrow.values=["Paramètre",out?"Entrée (mg/l)":"Concentration (mg/l)",out?"Flux entrée (kg/j)":"Flux (kg/j)","Ratio (g/EH/j)","EH",...(out?["Sortie (mg/l)","Flux sortie (kg/j)","Rendement"]:[])]; hdr(hrow);
  let r=H+1; const rowOf={};
  for(const x of C.rows){
    const row=ws.getRow(r); rowOf[x.p.k]=r;
    row.getCell(1).value=x.p.t;
    const cb=row.getCell(2); cb.value=x.ci&&!x.ci.bad?x.ci.v:null; cb.fill=EDIT; cb.numFmt=x.lt?'"< "#,##0.0##':"#,##0.0##";
    const cc=row.getCell(3); cc.value={formula:`IF(ISNUMBER(B${r}),B${r}*$B$8/1000,"")`,result:x.fi!=null?x.fi:""}; cc.numFmt=x.lt?'"< "#,##0.00':"#,##0.00";
    const cd=row.getCell(4); if(x.r){ cd.value=x.r; cd.numFmt="0.##"; if(x.p.k!=="dbo5") cd.fill=EDIT }
    const ce=row.getCell(5); ce.value={formula:`IF(AND(ISNUMBER(C${r}),ISNUMBER(D${r})),C${r}*1000/D${r},"")`,result:x.eh!=null?x.eh:""}; ce.numFmt=x.lt?'"< "#,##0':"#,##0";
    if(out){
      const cf=row.getCell(6); cf.value=x.co&&!x.co.bad?x.co.v:null; cf.fill=EDIT; cf.numFmt=x.lto?'"< "#,##0.0##':"#,##0.0##";
      const cg=row.getCell(7); cg.value={formula:`IF(ISNUMBER(F${r}),F${r}*$B$8/1000,"")`,result:x.fo!=null?x.fo:""}; cg.numFmt=x.lto?'"< "#,##0.00':"#,##0.00";
      const chh=row.getCell(8); chh.value={formula:`IF(AND(ISNUMBER(B${r}),ISNUMBER(F${r})),IF(B${r}>0,1-F${r}/B${r},""),"")`,result:x.rend!=null?x.rend:""}; chh.numFmt=x.rendGt?'"> "0.0%':"0.0%";
    }
    r++;
  }
  const rv=ws.getRow(r); rowOf.vol=r;
  rv.getCell(1).value="Volume (charge hydraulique)";
  rv.getCell(3).value={formula:"B8",result:+C.v24.toFixed(3)}; rv.getCell(3).numFmt='#,##0.00" m³/j"';
  rv.getCell(4).value=RATIOS.vol; rv.getCell(4).numFmt='0" l"'; rv.getCell(4).fill=EDIT;
  rv.getCell(5).value={formula:`IF(ISNUMBER(C${r}),C${r}*1000/D${r},"")`,result:C.ehH!=null?C.ehH:""}; rv.getCell(5).numFmt="#,##0";
  for(let k=H+1;k<=r;k++) ws.getRow(k).eachCell({includeEmpty:true},c=>{ c.border={bottom:{style:"hair",color:{argb:"FFD2DDDD"}}} });
  r+=2;
  const s0=r, rd=rowOf.dbo5, rco=rowOf.dco;
  kv(r++,"Charge organique (EH, base DBO5)",{formula:`E${rd}`,result:C.ehO!=null?C.ehO:""},C.ehOlt?'"< "#,##0':"#,##0");
  kv(r++,"Charge hydraulique (EH)",{formula:`E${rowOf.vol}`,result:C.ehH!=null?C.ehH:""},"#,##0");
  const capC=kv(r++,"Capacité nominale de la station (EH)",C.cap,"#,##0"); capC.fill=EDIT;
  kv(r++,"Taux de charge organique",{formula:`IF(AND(ISNUMBER(B${s0}),ISNUMBER(B${s0+2})),IF(B${s0+2}>0,B${s0}/B${s0+2},""),"")`,result:C.tco!=null?C.tco:""},"0%");
  const qC=kv(r++,"Débit de référence (m³/j)",C.qnom,"#,##0"); qC.fill=EDIT;
  kv(r++,"Taux de charge hydraulique",{formula:`IF(AND(ISNUMBER(B8),ISNUMBER(B${s0+4})),IF(B${s0+4}>0,B8/B${s0+4},""),"")`,result:C.tch!=null?C.tch:""},"0%");
  kv(r++,"Rapport DCO / DBO5",{formula:`IF(AND(ISNUMBER(B${rco}),ISNUMBER(B${rd})),IF(B${rd}>0,B${rco}/B${rd},""),"")`,result:C.dcoDbo!=null?C.dcoDbo:""},"0.00");
  r++;
  const note=ws.getCell(r,1); note.value=`1 EH = 60 g de DBO5 par jour. Flux (kg/j) = concentration (mg/l) × volume journalier (m³/j) / 1000. Volume journalier = volume de la période × 24 / durée.${out?" Rendement calculé sur les concentrations (même volume en entrée et en sortie).":""}`;
  note.font={size:9,color:{argb:"FF6F8787"}}; ws.mergeCells(r,1,r,8); note.alignment={wrapText:true,vertical:"top"}; ws.getRow(r).height=30;
}
async function saveFile(name,blob){
  if(window.claude&&typeof window.claude.use==="function"){
    const dl=await window.claude.use("downloads");
    if(dl){ try{ await dl.save({filename:name,data:blob}); toast(`${name} enregistré`) }catch(e){ if(e&&e.code!=="declined") toast("Export impossible ici : "+(e.message||e.code)) } return }
  }
  // Application installée ou navigateur récent : fenêtre « Enregistrer sous » de Windows
  if(window.showSaveFilePicker&&window.isSecureContext&&location.protocol.startsWith("http")){
    const ext=name.split(".").pop().toLowerCase(), types={xlsx:{description:"Classeur Excel",accept:{"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":[".xlsx"]}},pdf:{description:"Document PDF",accept:{"application/pdf":[".pdf"]}}};
    try{ const h=await window.showSaveFilePicker({suggestedName:name,types:types[ext]?[types[ext]]:undefined}); const w=await h.createWritable(); await w.write(blob); await w.close(); toast(`${h.name} enregistré`); return }
    catch(e){ if(e&&e.name==="AbortError") return; console.warn(e) }
  }
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000); toast(`${name} enregistré dans vos téléchargements`);
}
$("btnExport").onclick=()=>S.ds&&exportExcel().catch(e=>{console.error(e);toast("Export impossible : "+e.message)});

/* ---------- Rapport PDF du bilan ----------
   Fiche de bilan prête à joindre à un rapport d'étude : version corrigée uniquement, sans marque COMETEC,
   en-tête au nom (et au logo) de la société qui établit le rapport. */
const RP_FIELDS=["rpTitle","rpPoint","rpOwner","rpRef","rpCompany","rpOperator"];
let rpLogo=null; // {data, w, h}
function rpLoad(){ try{ const o=JSON.parse(localStorage.getItem("cometecBilanReport")||"{}"); for(const k of ["rpTitle","rpOwner","rpRef","rpCompany","rpOperator"]) if(o[k]) $(k).value=o[k]; if(o.logo) rpLogo=o.logo }catch(e){} rpLogoUi() }
function rpSave(){ if(S.isExample) return; try{ const o={}; for(const k of ["rpTitle","rpOwner","rpRef","rpCompany","rpOperator"]) o[k]=$(k).value; if(rpLogo) o.logo=rpLogo; localStorage.setItem("cometecBilanReport",JSON.stringify(o)) }catch(e){} }
function rpLogoUi(){ $("rpLogoName").textContent=rpLogo?(S.isExample&&rpLogo.demo?"Logo COMETEC (démonstration)":"Logo ajouté"):""; $("rpLogoDel").hidden=!rpLogo; $("rpLogoBtn").textContent=rpLogo?"Changer le logo":"Ajouter votre logo (facultatif)" }
/* Bilan de démonstration : rapport pré-rempli (jamais mémorisé). Hors démo : réglages de l'utilisateur. */
const RP_HELP="Ces informations apparaissent sur le rapport. Toutes sont facultatives et restent mémorisées sur cet ordinateur pour les prochains rapports.";
const DEMO_RP={rpTitle:"Fiche de bilan de mesure de débit",rpOwner:"Communauté de Communes X",rpRef:"Schéma directeur d'assainissement – Phase 2",rpCompany:"COMETEC",rpOperator:"Monsieur X",rpNotes:"Ceci est un TEST"};
let rpMode=null;
function demoLogo(){ return new Promise(res=>{ const el=document.querySelector("img.logo"); if(!el) return res(null);
  const img=new Image(); img.onload=()=>{ const sc=Math.min(1,300/img.height), c=document.createElement("canvas"); c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc);
    const g=c.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0,c.width,c.height);
    res({data:c.toDataURL("image/jpeg",0.92),w:c.width,h:c.height,demo:true}) }; img.onerror=()=>res(null); img.src=el.src }) }
async function rpPrepare(){
  const mode=S.isExample?"demo":"user";
  if(mode!==rpMode){
    for(const k of ["rpOwner","rpRef","rpCompany","rpOperator","rpNotes"]) $(k).value=""; $("rpTitle").value="Fiche de bilan de mesure de débit"; rpLogo=null;
    if(mode==="demo"){ for(const k in DEMO_RP) $(k).value=DEMO_RP[k]; rpLogo=await demoLogo() }
    rpMode=mode }
  if(mode==="user") rpLoad();
  $("rpHelp").textContent=mode==="demo"?"Bilan de démonstration : ces informations sont pré-remplies pour l'exemple. Vous pouvez les modifier ; elles ne seront pas mémorisées.":RP_HELP;
  rpLogoUi() }
$("btnReport").onclick=async()=>{ if(!S.ds) return; await rpPrepare(); $("rpPoint").value=$("rpPoint").value||S.ds.meta.site||""; $("rpNotes").value=$("rpNotes").value||""; $("rpInfo").textContent=changed()?"Le rapport présente uniquement les valeurs corrigées.":""; $("reportModal").hidden=false; $("rpPoint").focus() };
$("reportClose").onclick=()=>$("reportModal").hidden=true;
$("reportModal").addEventListener("click",e=>{ if(e.target.id==="reportModal") $("reportModal").hidden=true });
addEventListener("keydown",e=>{ if(e.key==="Escape"&&!$("reportModal").hidden) $("reportModal").hidden=true });
$("rpLogoBtn").onclick=()=>$("rpLogoInput").click();
$("rpLogoDel").onclick=()=>{ rpLogo=null; rpLogoUi(); rpSave() };
$("rpLogoInput").onchange=e=>{ const f=e.target.files[0]; e.target.value=""; if(!f) return;
  const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{
    // le logo est redimensionné (300 px de haut max) pour rester léger
    const sc=Math.min(1,300/img.height), c=document.createElement("canvas"); c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc);
    const g=c.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0,c.width,c.height);
    rpLogo={data:c.toDataURL("image/jpeg",0.92),w:c.width,h:c.height}; rpLogoUi(); rpSave() }; img.src=r.result }; r.readAsDataURL(f) };
$("reportForm").onsubmit=async e=>{ e.preventDefault(); rpSave(); $("rpGo").disabled=true; $("rpGo").textContent="Génération…";
  try{ await buildReport() ; $("reportModal").hidden=true }catch(err){ console.error(err); toast("Rapport impossible : "+err.message) }
  finally{ $("rpGo").disabled=false; $("rpGo").textContent="Générer le rapport PDF" } };

const pdfTxt=s=>String(s==null?"":s).replace(/[  ]/g," ").replace(/[–—]/g,"-").replace(/[’‘]/g,"'").replace(/→/g,"à").replace(/…/g,"...");
function chartImage(option,w,h){
  const box=$("pdfCharts"); box.style.width=w+"px"; box.style.height=h+"px";
  const c=echarts.init(box,null,{renderer:"canvas",width:w,height:h});
  c.setOption(Object.assign({animation:false,backgroundColor:"#ffffff",textStyle:{fontFamily:"Arial, Helvetica, sans-serif",color:"#33454d"}},option));
  const url=c.getDataURL({type:"png",pixelRatio:2,backgroundColor:"#ffffff"}); c.dispose(); return url;
}
async function buildReport(){
  const {jsPDF}=window.jspdf; const d=S.ds, n=d.t.length, st=stats();
  const INK=[38,50,56], MUT=[110,124,130], ACC=[0,145,155], LINE=[214,222,224], SOFT=[242,246,247];
  const f={title:$("rpTitle").value.trim()||"Fiche de bilan de mesure de débit",point:$("rpPoint").value.trim(),owner:$("rpOwner").value.trim(),ref:$("rpRef").value.trim(),company:$("rpCompany").value.trim(),operator:$("rpOperator").value.trim(),notes:$("rpNotes").value.trim()};
  const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait",compress:true}); const W=210,H=297,M=15, CW=W-2*M;
  const T=(s,x,y,o)=>doc.text(pdfTxt(s),x,y,o);
  const set=(sz,style,col)=>{ doc.setFont("helvetica",style||"normal"); doc.setFontSize(sz); doc.setTextColor(...(col||INK)) };
  // ---- données (version corrigée uniquement)
  let iqmin=0; for(let i=1;i<n;i++) if(S.qn[i]<S.qn[iqmin]) iqmin=i;
  const durH=st.dur, vol=st.vn, v24=vol/durH*24;
  const law=S.newLaw?`Table hauteur/débit « ${S.newLaw.name} »`:(S.siteLaw?`Table hauteur/débit « ${S.siteLaw.name} »`:"Loi hauteur/débit programmée dans l'appareil");
  const fmtFull=ms=>{const x=new Date(ms);return `${p2(x.getUTCDate())}/${p2(x.getUTCMonth()+1)}/${x.getUTCFullYear()} à ${p2(x.getUTCHours())}:${p2(x.getUTCMinutes())}`};
  const today=new Date(); const todayS=`${p2(today.getDate())}/${p2(today.getMonth()+1)}/${today.getFullYear()}`;
  // ---- en-tête et pied de page
  const header=()=>{
    let x=M;
    if(rpLogo){ const h=14, w=Math.min(48,rpLogo.w/rpLogo.h*h); doc.addImage(rpLogo.data,"JPEG",M,10,w,w/(rpLogo.w/rpLogo.h),"rpLogo"); x=M+w+6 }
    else if(f.company){ set(11,"bold",INK); T(f.company,M,17) }
    set(14,"bold",INK); T(f.title,W-M,15,{align:"right"});
    set(9,"normal",MUT); T([f.point&&`Point de mesure : ${f.point}`,`du ${fmtDT(d.t[0])} au ${fmtDT(d.t[n-1])}`].filter(Boolean).join("  ·  "),W-M,21,{align:"right"});
    doc.setDrawColor(...ACC); doc.setLineWidth(0.6); doc.line(M,27,W-M,27);
  };
  const footer=(p,tot)=>{ doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M,H-14,W-M,H-14); set(8,"normal",MUT);
    T([S.isExample&&"Données de démonstration (fictives)",f.company&&`Établi par ${f.company}`,f.operator&&`Opérateur : ${f.operator}`,`Édité le ${todayS}`].filter(Boolean).join("  ·  "),M,H-9); T(`Page ${p} / ${tot}`,W-M,H-9,{align:"right"}) };
  const section=(title,y)=>{ set(11,"bold",INK); T(title,M,y); doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(M,y+2,W-M,y+2); return y+8 };
  const kv=(rows,y,colW)=>{ // tableau clé / valeur sur deux colonnes
    const half=CW/2, lw=colW||34; let yy=y;
    for(let i=0;i<rows.length;i+=2){ let h=0;
      for(let k=0;k<2&&i+k<rows.length;k++){ const [a,b]=rows[i+k]; const x=M+k*half; set(8.5,"normal",MUT); T(a,x,yy); set(9.5,"bold",INK);
        const lines=doc.splitTextToSize(pdfTxt(b||"-"),half-lw-4); doc.text(lines,x+lw,yy); h=Math.max(h,lines.length*4.4) }
      yy+=Math.max(6.2,h+1.8) }
    return yy;
  };
  // ================= PAGE 1 =================
  header(); let y=36;
  y=section("Identification",y);
  y=kv([["Point de mesure",f.point||d.meta.site],["Maître d'ouvrage",f.owner],["Étude",f.ref],["Établi par",f.company],["Opérateur",f.operator],["Date d'édition",todayS]],y);
  y+=3; y=section("Conditions de mesure",y);
  y=kv([["Appareil","Débitmètre portable bulle à bulle BUL'R2"],["Principe","Hauteur d'eau mesurée par bullage, débit calculé par loi hauteur/débit"],["Loi hauteur/débit",law],["Début",fmtFull(d.t[0])],["Fin",fmtFull(d.t[n-1])],["Durée",fmtDur(durH*3600)],["Pas d'enregistrement",d.step>=60?`${nf(d.step/60,d.step%60?1:0)} min`:`${d.step} s`],["Nombre de mesures",n.toLocaleString("fr-FR")]],y,36);
  y+=3; y=section("Résultats",y);
  // vignettes de résultats
  let hmn=Infinity,hmx=-Infinity; for(const h of S.hc){ hmn=Math.min(hmn,h); hmx=Math.max(hmx,h) }
  const tile2=(durH>=20&&durH<=28)?["Volume ramené à 24 h",`${nf(v24,v24>=1000?0:2)} m³/j`,"volume ÷ durée × 24 h"]:["Hauteur d'eau",`${nf(hmn,0)} - ${nf(hmx,0)} mm`,"minimum - maximum"];
  const tiles=[["Volume écoulé",`${nf(vol,vol>=1000?0:2)} m³`,`sur ${fmtDur(durH*3600)}`],tile2,["Débit moyen",`${nf(st.qmoy,2)} m³/h`,`${nf(st.qmoy/3.6,2)} l/s`],["Débit maximal",`${nf(S.qn[st.iq],2)} m³/h`,`le ${fmtDT(d.t[st.iq])}`],["Débit minimal",`${nf(S.qn[iqmin],2)} m³/h`,`le ${fmtDT(d.t[iqmin])}`]];
  const tw=(CW-4*3)/5;
  tiles.forEach((tl,i)=>{ const x=M+i*(tw+3); doc.setFillColor(...SOFT); doc.roundedRect(x,y,tw,20,1.5,1.5,"F");
    set(7.5,"normal",MUT); T(tl[0],x+3,y+5); set(11,"bold",INK); T(tl[1],x+3,y+11.5); set(7,"normal",MUT); T(tl[2],x+3,y+16.5) });
  y+=26;
  // graphique débit + hauteur
  const pts=(arr)=>d.t.map((t,i)=>[t,arr[i]]);
  const gridC={axisLine:{lineStyle:{color:"#b8c6c9"}},axisLabel:{color:"#55676d",fontSize:20},splitLine:{lineStyle:{color:"#e6ecee"}}};
  const timeAx=(idx,show)=>({type:"time",gridIndex:idx,...gridC,splitLine:{show:false},axisLabel:{show,color:"#55676d",fontSize:20,hideOverlap:true,formatter:v=>{const x=new Date(v);return (x.getUTCHours()===0&&x.getUTCMinutes()===0)?fmtD(v):fmtHM(v)}}});
  const img1=chartImage({
    grid:[{left:110,right:30,top:50,height:330},{left:110,right:30,top:470,height:170}],
    xAxis:[timeAx(0,false),timeAx(1,true)],
    yAxis:[{type:"value",gridIndex:0,scale:true,name:"Débit (m³/h)",nameTextStyle:{color:"#55676d",fontSize:20,align:"left"},...gridC,axisLabel:{color:"#55676d",fontSize:20,formatter:v=>v.toLocaleString("fr-FR")}},
           {type:"value",gridIndex:1,scale:true,name:"Hauteur d'eau (mm)",nameTextStyle:{color:"#55676d",fontSize:20,align:"left"},...gridC,splitNumber:3,axisLabel:{color:"#55676d",fontSize:20,formatter:v=>v.toLocaleString("fr-FR")}}],
    series:[{type:"line",xAxisIndex:0,yAxisIndex:0,data:pts(S.qn),showSymbol:false,sampling:"lttb",lineStyle:{width:2.4,color:"#00919B"},areaStyle:{color:"#00919B",opacity:.08}},
            {type:"line",xAxisIndex:1,yAxisIndex:1,data:pts(S.hc),showSymbol:false,sampling:"lttb",lineStyle:{width:2.2,color:"#1A4D4D"}}]
  },1600,720);
  set(10,"bold",INK); T("Débit et hauteur d'eau",M,y); y+=2;
  const ih=CW*720/1600; doc.addImage(img1,"PNG",M,y,CW,ih,"rpChart1","FAST"); /* graphiques compressés (sinon ~30 Mo) */ y+=ih+6;
  // observations : texte libre saisi par l'utilisateur, en bas de la page 1 si la place suffit
  const obs=[];
  if(f.notes) obs.push(f.notes);
  const obsLines=obs.map(o=>{ set(9.5,"normal",INK); return doc.splitTextToSize(pdfTxt(o),CW) });
  const obsH=10+obsLines.reduce((a,l)=>a+l.length*4.6+2.5,0);
  const drawObs=yy=>{ yy=section("Observations",yy); set(9.5,"normal",INK); for(const l of obsLines){ doc.text(l,M,yy); yy+=l.length*4.6+2.5 } return yy };
  let obsDone=false;
  if(obs.length&&y+obsH<H-20){ y=drawObs(y); obsDone=true }
  // ================= PAGE 2 =================
  doc.addPage(); header(); y=36;
  // ---- charges polluantes (si des analyses ont été saisies)
  const LC=loadsCalc();
  if(LC.any){
    y=section("Charges polluantes",y);
    set(8.5,"normal",MUT);
    const per=`Échantillon moyen du ${fmtFull(d.t[LC.i0])} au ${fmtFull(d.t[LC.i1])} · volume écoulé ${nf(LC.vol,LC.vol>=1000?0:2)} m³`+(Math.abs(LC.durH-24)>0.05?` en ${fmtDur(LC.durH*3600)}, soit ${nf(LC.v24,LC.v24>=1000?0:2)} m³/j`:"")+(LC.lab?` · Analyses : ${LC.lab}`:"");
    const pl=doc.splitTextToSize(pdfTxt(per),CW); doc.text(pl,M,y); y+=pl.length*4+2;
    // vignettes
    const lt=f=>f?"< ":"";
    const tl=[];
    if(LC.ehO!=null) tl.push(["Charge organique",`${lt(LC.ehOlt)}${nf(LC.ehO,0)} EH`,`${lt(LC.ehOlt)}${fmtKg(LC.by.dbo5.fi)} kg DBO5/j`]);
    if(LC.ehH!=null) tl.push(["Charge hydraulique",`${nf(LC.ehH,0)} EH`,`${nf(LC.v24,1)} m³/j · ${nf(RATIOS.vol,0)} l/EH/j`]);
    if(LC.tco!=null) tl.push(["Taux de charge organique",`${lt(LC.ehOlt)}${nf(LC.tco*100,0)} %`,`capacité ${nf(LC.cap,0)} EH`]);
    if(LC.tch!=null) tl.push(["Taux de charge hydraulique",`${nf(LC.tch*100,0)} %`,`référence ${nf(LC.qnom,0)} m³/j`]);
    if(LC.dcoDbo!=null) tl.push(["Rapport DCO / DBO5",nf(LC.dcoDbo,2),"biodégradabilité"]);
    if(tl.length){ const tw2=(CW-(tl.length-1)*3)/tl.length;
      tl.forEach((t,i)=>{ const x=M+i*(tw2+3); doc.setFillColor(...SOFT); doc.roundedRect(x,y,tw2,18,1.5,1.5,"F");
        const fit=(s,sz,st,col)=>{ let z=sz; set(z,st,col); while(z>5.5&&doc.getTextWidth(pdfTxt(s))>tw2-5){ z-=0.25; set(z,st,col) } };
        fit(t[0],7.5,"normal",MUT); T(t[0],x+3,y+5); fit(t[1],11,"bold",INK); T(t[1],x+3,y+11); fit(t[2],7,"normal",MUT); T(t[2],x+3,y+15.5) });
      y+=23 }
    // tableau des paramètres
    const out=LC.hasOut;
    const lc=out?[{t:"Paramètre",w:28,a:"left"},{t:"Entrée (mg/l)",w:28,a:"right"},{t:"Flux entrée (kg/j)",w:32,a:"right"},{t:"EH",w:22,a:"right"},{t:"Sortie (mg/l)",w:26,a:"right"},{t:"Flux sortie (kg/j)",w:24,a:"right"},{t:"Rendement",w:20,a:"right"}]
                :[{t:"Paramètre",w:45,a:"left"},{t:"Concentration (mg/l)",w:45,a:"right"},{t:"Flux (kg/j)",w:45,a:"right"},{t:"Équivalents-habitants",w:45,a:"right"}];
    doc.setFillColor(...INK); doc.rect(M,y-4.5,CW,6.5,"F"); set(8,"bold",[255,255,255]);
    { let x=M; for(const c of lc){ T(c.t,c.a==="right"?x+c.w-2:x+2,y,{align:c.a}); x+=c.w } } y+=6.5;
    const cv=(c)=>c&&!c.bad?(c.lt?"< ":"")+nf(c.v,c.v<10?2:(c.v<100?1:0)):"-";
    for(const [k,x] of LC.rows.filter(x=>x.fi!=null||x.fo!=null).entries()){
      if(k%2){ doc.setFillColor(...SOFT); doc.rect(M,y-3.9,CW,5.4,"F") }
      const vals=out?[x.p.t,cv(x.ci),x.fi!=null?lt(x.lt)+fmtKg(x.fi):"-",x.eh!=null?lt(x.lt)+nf(x.eh,0):"-",cv(x.co),x.fo!=null?lt(x.lto)+fmtKg(x.fo):"-",x.rend!=null?(x.rendGt?"> ":"")+nf(x.rend*100,1)+" %":"-"]
                    :[x.p.t,cv(x.ci),lt(x.lt)+fmtKg(x.fi),x.eh!=null?lt(x.lt)+nf(x.eh,0):"-"];
      let xx=M; set(8.5,"normal",INK); lc.forEach((c,i)=>{ T(vals[i],c.a==="right"?xx+c.w-2:xx+2,y,{align:c.a}); xx+=c.w }); y+=5.4;
    }
    doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.line(M,y-3.6,M+CW,y-3.6); y+=1;
    set(7.5,"normal",MUT);
    const nt=`Flux = concentration × volume journalier. 1 EH = 60 g DBO5/j ; autres ratios : DCO ${nf(RATIOS.dco,0)} g, MES ${nf(RATIOS.mes,0)} g, NTK ${nf(RATIOS.ntk,0)} g, Pt ${nf(RATIOS.pt,RATIOS.pt%1?1:0)} g par EH et par jour ; charge hydraulique ${nf(RATIOS.vol,0)} l/EH/j.`+(out?" Rendements calculés sur les concentrations.":"");
    const nl=doc.splitTextToSize(pdfTxt(nt),CW); doc.text(nl,M,y); y+=nl.length*3.6+6;
  }
  const stepLabel=$("stepSelect").selectedOptions[0].textContent;
  const iv=intervals(d.t,S.vo,S.vn,S.step);
  if(LC.any&&y+CW*500/1600+30>H-20){ doc.addPage(); header(); y=36 }
  y=section(`Volumes par intervalle de ${stepLabel}`,y);
  const img2=chartImage({
    grid:{left:110,right:30,top:40,bottom:110},
    xAxis:{type:"category",data:iv.map(r=>S.step>=86400?fmtD(r.from):`${fmtD(r.from)} ${fmtHM(r.from)}`),axisLabel:{color:"#55676d",fontSize:18,rotate:45,interval:Math.max(0,Math.ceil(iv.length/24)-1)},axisLine:{lineStyle:{color:"#b8c6c9"}},axisTick:{show:false}},
    yAxis:{type:"value",name:"Volume (m³)",nameTextStyle:{color:"#55676d",fontSize:20,align:"left"},...gridC,axisLabel:{color:"#55676d",fontSize:20,formatter:v=>v.toLocaleString("fr-FR")}},
    series:[{type:"bar",data:iv.map(r=>+r.vn.toFixed(3)),itemStyle:{color:"#00919B",borderRadius:[4,4,0,0]},barCategoryGap:"25%"}]
  },1600,500);
  const ih2=CW*500/1600; doc.addImage(img2,"PNG",M,y,CW,ih2,"rpChart2","FAST"); y+=ih2+5;
  // tableau des volumes (au pas choisi si 48 intervalles au plus, sinon à l'heure)
  const tStep=iv.length<=48?S.step:3600, tRows=tStep===S.step?iv:intervals(d.t,S.vo,S.vn,3600);
  const tLab=tStep>=86400?"24 heures":(tStep===S.step?stepLabel:"1 heure");
  y=section(`Tableau des volumes (pas de ${tLab})`,y);
  const cols=[{t:"Période",w:70,a:"left"},{t:"Volume (m³)",w:36,a:"right"},{t:"Débit moyen (m³/h)",w:40,a:"right"},{t:"Débit moyen (l/s)",w:34,a:"right"}];
  const thead=yy=>{ doc.setFillColor(...INK); doc.rect(M,yy-4.5,CW,6.5,"F"); set(8.5,"bold",[255,255,255]); let x=M; for(const c of cols){ T(c.t,c.a==="right"?x+c.w-2:x+2,yy,{align:c.a}); x+=c.w } return yy+6.5 };
  y=thead(y);
  tRows.forEach((r,k)=>{
    if(y>H-24){ doc.addPage(); header(); y=40; y=thead(y) }
    const durh=(r.to-r.from)/3600000, qm=durh>0?r.vn/durh:0;
    if(k%2) { doc.setFillColor(...SOFT); doc.rect(M,y-3.9,CW,5.4,"F") }
    const lab=(tStep>=86400?fmtD(r.from):`${fmtD(r.from)} ${fmtHM(r.from)} - ${fmtHM(r.to)}`)+(r.partial?` (${fmtShort((r.to-r.from)/1000)})`:"");
    const vals=[lab,nf(r.vn,vol>=1000?1:3),nf(qm,2),nf(qm/3.6,2)]; let x=M; set(8.5,"normal",INK);
    cols.forEach((c,i)=>{ T(vals[i],c.a==="right"?x+c.w-2:x+2,y,{align:c.a}); x+=c.w }); y+=5.4;
  });
  doc.setDrawColor(...INK); doc.setLineWidth(0.4); doc.line(M,y-3.6,M+CW,y-3.6);
  set(9,"bold",INK); T("Total",M+2,y+1); T(nf(tRows.reduce((a,r)=>a+r.vn,0),vol>=1000?1:3),M+cols[0].w+cols[1].w-2,y+1,{align:"right"}); y+=9;
  if(obs.length&&!obsDone){ if(y+obsH>H-20){ doc.addPage(); header(); y=40 } drawObs(y) }
  // pieds de page
  const tot=doc.getNumberOfPages(); for(let p=1;p<=tot;p++){ doc.setPage(p); footer(p,tot) }
  const dd=new Date(d.t[0]); const stamp=`${dd.getUTCFullYear()}-${p2(dd.getUTCMonth()+1)}-${p2(dd.getUTCDate())}`;
  const name=`Rapport_bilan_${(f.point||d.meta.site||"mesure").replace(/[^\w-]+/g,"_")}_${stamp}.pdf`;
  await saveFile(name,doc.output("blob"));
}


/* ---------- Bilan de démonstration SITE TEST ----------
   Données fictives intégrées à l'application : on peut tout essayer sans enregistrement. La table H/Q est préchargée. */
function startDemo(){
  if(!DEMO) return;
  const ds=parseNative(parseCSVText(DEMO.csv),"SITE_TEST.csv"); loadDataset(ds,true);
  logAction("Bilan de démonstration","SITE TEST : données fictives fournies par COMETEC pour découvrir l'application.");
  useSiteTable(DEMO.table.map(p=>p.slice()),"Table SITE TEST");
  $("rpPoint").value="SITE TEST"; rpMode=null;
  window.scrollTo({top:0});
  let done=false; try{ done=localStorage.getItem("cometecBilanTour")==="1" }catch(e){}
  if(!done) setTimeout(()=>startTour(),600);
}
function quitDemo(){ endTour(false); S.ds=null; S.isExample=false; setNoData(true); window.scrollTo({top:0}) }
$("btnDemo").onclick=e=>{ e.stopPropagation(); startDemo() };
$("btnQuitDemo").onclick=quitDemo;
$("btnTour").onclick=()=>startTour();
$("btnDemoLaw").onclick=()=>{ S.pendingLaw={name:"Loi démo SITE TEST",pts:DEMO.law2.map(p=>p.slice())}; lawMsg("",""); renderLawView() };
$("btnDemoLab").onclick=()=>{ const L=DEMO.lab; Object.assign(S.lab.c,{dco:L.dco,dbo5:L.dbo5,mes:L.mes,ntk:L.ntk}); S.lab.cap=L.cap; renderLoadsForm(); renderKpis(); renderPanelHome() };

/* Visite guidée : 4 bulles, au premier lancement de la démo, rejouable depuis le bandeau */
const TOUR=[
  {el:"actLevels",mtab:"outils",title:"Corriger des niveaux",text:"La table H/Q de SITE TEST est déjà chargée et validée. Repérez le pic parasite à 140 mm vers 06:00, sélectionnez-le sur la courbe et reliez-le en ligne droite."},
  {el:"actLaw",mtab:"outils",title:"Changer la loi hauteur/débit",text:"Cliquez sur « Utiliser la loi de démonstration » : tout le bilan est recalculé avec la nouvelle loi. Les charges polluantes ont aussi des analyses d'exemple prêtes à l'emploi."},
  {el:"actDiag",mtab:"outils",title:"Diagnostic du bilan",text:"Le diagnostic a repéré 4 anomalies : canne bouchée, canne hors de l'eau, une mesure à 0 et un niveau figé la nuit, invisible à l'œil. Ouvrez-le pour les voir sur la courbe et les réparer d'un clic."},
  {el:["btnExport","btnReport"],mel:["mExcel","mPdf"],mtab:"export",title:"Exporter en Excel et rapport PDF",text:"Exportez l'Excel complet (graphiques, anomalies, corrections, journal) ou le rapport PDF prêt à remettre. Les exports de démonstration sont marqués comme tels."}];
const tourEls=st=>[].concat(isM()&&st.mel?st.mel:st.el).map(id=>$(id)).filter(Boolean);
let tourI=-1;
function startTour(){ if(!S.ds) return; setView("home"); tourI=-1; nextTour() }
function nextTour(){ document.querySelectorAll(".tour-target").forEach(x=>x.classList.remove("tour-target")); tourI++; if(tourI>=TOUR.length) return endTour(true); showTour() }
function showTour(){
  const st=TOUR[tourI]; if(isM()&&st.mtab) setMTab(st.mtab); const els=tourEls(st), el=els[0], box=$("tour");
  $("tourStep").textContent=`Visite guidée · ${tourI+1} / ${TOUR.length}`; $("tourTitle").textContent=st.title; $("tourText").textContent=st.text;
  $("tourNext").textContent=tourI===TOUR.length-1?"Terminer":"Suivant";
  document.querySelectorAll(".tour-target").forEach(x=>x.classList.remove("tour-target")); els.forEach(x=>x.classList.add("tour-target"));
  el.scrollIntoView({block:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  box.hidden=false; setTimeout(placeTour,380); placeTour(); $("tourNext").focus({preventScroll:true});
}
function placeTour(){
  if(tourI<0||$("tour").hidden) return; const rs=tourEls(TOUR[tourI]).map(x=>x.getBoundingClientRect()), box=$("tour"), r={left:Math.min(...rs.map(q=>q.left)),top:Math.min(...rs.map(q=>q.top)),bottom:Math.max(...rs.map(q=>q.bottom))}; r.height=r.bottom-r.top; const w=box.offsetWidth, h=box.offsetHeight, vw=innerWidth, vh=innerHeight;
  if(vw<=700) return; // sur mobile : bulle fixée en bas de l'écran (CSS)
  let left=r.left-w-16, top=r.top+r.height/2-h/2;                         // à gauche de l'élément
  if(left<12){ left=Math.min(Math.max(12,r.left),vw-w-12); top=r.bottom+12; if(top+h>vh-12) top=r.top-h-12 } // sinon dessous ou dessus
  box.style.left=left+"px"; box.style.top=Math.max(12,Math.min(top,vh-h-12))+"px";
}
function endTour(done){
  document.querySelectorAll(".tour-target").forEach(x=>x.classList.remove("tour-target")); $("tour").hidden=true; tourI=-1;
  if(done!==false) try{ localStorage.setItem("cometecBilanTour","1") }catch(e){}
  if(isM()&&S.ds&&document.body.dataset.mtab!=="bilan") setMTab("bilan");
}
$("tourNext").onclick=nextTour; $("tourSkip").onclick=()=>endTour(true);
addEventListener("resize",placeTour); addEventListener("scroll",placeTour,{passive:true});
addEventListener("keydown",e=>{ if(e.key==="Escape"&&!$("tour").hidden) endTour(true) });


/* ---------- Version téléphone : onglets, écrans plein écran, retour ----------
   Actif uniquement sur écran étroit (même requête que le CSS) ; PC et tablette ne sont pas concernés. */
const MQ=matchMedia("(max-width:700px), (pointer:coarse) and (max-height:500px)");
function isM(){ return MQ.matches }
const VIEW_TITLE={levels:"Corriger des niveaux",law:"Loi hauteur/débit",diag:"Diagnostic du bilan",loads:"Charges polluantes"};
let mPushed=false;
function setMTab(t){
  const b=document.body; if(!t) t="bilan"; if(!isM()){ b.dataset.mtab=t; return }
  if(t!=="outils"&&S.view&&S.view!=="home") setView("home");
  b.dataset.mtab=t;
  document.querySelectorAll("#mnav [data-mtab]").forEach(x=>{ if(x.dataset.mtab===t) x.setAttribute("aria-current","page"); else x.removeAttribute("aria-current") });
  window.scrollTo({top:0});
}
function mSync(){
  const b=document.body, v=S.view||"home", tool=isM()&&v!=="home";
  if(isM()){ b.dataset.view=v; b.classList.toggle("mtool",tool); b.classList.toggle("mchart",tool&&(v==="levels"||v==="diag")) }
  else if(b.classList.contains("mtool")||b.classList.contains("mchart")) b.classList.remove("mtool","mchart");
  $("mTitle").textContent=VIEW_TITLE[v]||"";
  $("mSub").textContent=S.ds?[S.ds.meta.site,fmtDT(S.ds.t[0]),fmtShort((S.ds.t[S.ds.t.length-1]-S.ds.t[0])/1000)].filter(Boolean).join(" · "):"";
  const open=(S.anoms||[]).filter(a=>a.status==="open").length; $("mDot").hidden=!open; $("mDot").textContent=open||"";
}
document.querySelectorAll("#mnav [data-mtab]").forEach(x=>x.onclick=()=>{ if(document.body.dataset.mtab===x.dataset.mtab&&S.view==="home"){ window.scrollTo({top:0,behavior:"smooth"}); return } setMTab(x.dataset.mtab) });
{ // les fonctions de l'application gardent leur comportement ; on y accroche seulement la mise en page téléphone
  const sv=setView; setView=function(v){ const prev=S.view; sv(v); mSync();
    if(!isM()) return;
    if(v!=="home"){ if(document.body.dataset.mtab!=="outils") setMTab("outils"); if(!mPushed){ try{ history.pushState({mview:v},"") }catch(e){} mPushed=true } if(prev!==v) window.scrollTo({top:0}) }
    else if(mPushed){ mPushed=false; try{ history.back() }catch(e){} } };
  const rp=renderPanel; renderPanel=function(){ rp.apply(this,arguments); mSync() };
  const ld=loadDataset; loadDataset=function(){ const r=ld.apply(this,arguments); if(isM()){ document.body.classList.remove("mfiche-open"); setMTab("bilan") } mSync(); return r };
  const nd=setNoData; setNoData=function(on){ const r=nd.apply(this,arguments); if(on){ document.body.dataset.mtab="bilan"; mSync() } return r };
}
addEventListener("popstate",()=>{ if(mPushed){ mPushed=false; if(S.view!=="home") setView("home") } });
$("mBack").onclick=()=>setView("home");
let opDirSign=1;
document.querySelectorAll("#opDir [data-dir]").forEach(x=>x.onclick=()=>{ opDirSign=+x.dataset.dir; document.querySelectorAll("#opDir [data-dir]").forEach(y=>y.setAttribute("aria-pressed",y===x)) });
document.addEventListener("click",e=>{ if(e.target.closest("[data-closecard]")){ $("anomCard").hidden=true; if(S.anomHover!=null){ S.anomHover=null; renderChart() } } });
$("mFicheMore").onclick=()=>{ const o=document.body.classList.toggle("mfiche-open"); $("mFicheMore").setAttribute("aria-expanded",o); $("mFicheMore").textContent=o?"Moins de détails":"Détails de l'enregistrement" };
$("mExcel").onclick=()=>$("btnExport").click();
$("mPdf").onclick=()=>$("btnReport").click();
MQ.addEventListener?.("change",()=>{ mSync(); if(S.ds) renderVolumes(); if(!isM()) window.scrollTo({top:0}) });
document.body.dataset.mtab=document.body.dataset.mtab||"bilan";


/* ---------- Accueil COMETEC : page d'ouverture avec logo animé ---------- */
function hubOn(){ return document.body.classList.contains("onhub") }
function showHub(anim){
  const h=$("hub"), lg=$("hubLogo"); document.body.classList.remove("onsim","onprod","onctrl"); document.body.classList.add("onhub"); h.classList.remove("hub-anim"); window.scrollTo({top:0});
  if(anim&&!matchMedia("(prefers-reduced-motion: reduce)").matches){
    lg.style.setProperty("--hub-dy","0px"); const r=lg.getBoundingClientRect();
    lg.style.setProperty("--hub-dy",Math.max(0,innerHeight/2-(r.top+r.height/2))+"px"); void h.offsetWidth; h.classList.add("hub-anim") }
  document.body.classList.remove("hub-pre");
}
function simOn(){ return document.body.classList.contains("onsim") }
function enterApp(push){ if(!hubOn()&&!simOn()&&!document.body.classList.contains("onprod")&&!document.body.classList.contains("onctrl")) return; document.body.classList.remove("onhub","onsim","onprod","onctrl","hub-pre"); $("hub").classList.remove("hub-anim"); if(push!==false) try{ history.pushState({app:1},"") }catch(e){} window.scrollTo({top:0}) }
$("hubOpen").onclick=()=>enterApp();
$("hubDemo").onclick=()=>{ enterApp(); startDemo() };
document.querySelectorAll("header.top .logo, header.top .appicon").forEach(el=>{ el.classList.add("tohub"); el.title="Accueil COMETEC";
  el.addEventListener("click",()=>{ if(history.state&&history.state.app) history.back(); else showHub(false) }) });
addEventListener("popstate",()=>{ const st=history.state;
  if(st&&st.pdf){ if(!pdfOn()){ const it=findItem(st.pdf); if(it){ showProd(st.prod===1?null:st.prod,false); openPdf(it,false) } } return }
  if(pdfOn()){ closePdf(); if(st&&st.prod&&prodOn()&&(st.prod===1?null:st.prod)===PF.cat) return }
  if(st&&st.prod){ showProd(st.prod===1?null:st.prod,false) }
  else if(st&&st.sim){ if(!simOn()) showSim(false) }
  else if(st&&st.ctrl){ if(!ctrlOn()) showCtrl(false) }
  else if(st&&(st.app||st.mview)){ if(hubOn()||simOn()||prodOn()||ctrlOn()) enterApp(false) }
  else if(!hubOn()) showHub(false) });
{ const ld=loadDataset; loadDataset=function(){ if(hubOn()) enterApp(); return ld.apply(this,arguments) } }


/* ---------- Nos produits : documentations par famille ---------- */
// Adresse des PDF : dossier docs/ à côté de l'application publiée ; ailleurs (fichier local, aperçu) → site en ligne
const DOC_BASE=window.CMT_LOCAL?"docs/":(location.hostname==="cometec38.github.io")?"/Bilan/docs/":(location.protocol.startsWith("http")&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname))?"docs/":"https://cometec38.github.io/Bilan/docs/";
const WATER={EU:{l:"Eaux usées",c:"#8A5A2B",b:"#F3E6D8",p:'<circle cx="12" cy="12" r="6.5"/><path d="M7.2 9.5h9.6M6.2 12h11.6M7.2 14.5h9.6"/>'},
  EP:{l:"Eau potable",c:"#1769C2",b:"#E2EEFA",p:'<path d="M12 5.2c2.8 3.4 4.4 5.6 4.4 7.8a4.4 4.4 0 0 1-8.8 0c0-2.2 1.6-4.4 4.4-7.8z"/><path d="M10.2 13.6a1.9 1.9 0 0 0 1.8 1.6"/>'},
  EB:{l:"Eau brute",c:"#1E7A5A",b:"#DFF2E9",p:'<path d="M4 10c1.3-1.2 2.7-1.2 4 0s2.7 1.2 4 0 2.7-1.2 4 0 2.7 1.2 4 0M4 15c1.3-1.2 2.7-1.2 4 0s2.7 1.2 4 0 2.7-1.2 4 0 2.7 1.2 4 0"/>'},
  PL:{l:"Eaux pluviales",c:"#4A5D9C",b:"#E6E9F6",p:'<path d="M7.5 13.5a3.5 3.5 0 0 1-.4-7A5 5 0 0 1 16.8 8a3 3 0 0 1 .2 5.5z"/><path d="M9 16l-1 2.5M12.5 16l-1 2.5M16 16l-1 2.5"/>'}};
const wIcon=(k,title)=>{ const w=WATER[k]; return `<svg class="wi" viewBox="0 0 24 24" role="img" aria-label="${w.l}"><title>${title?w.l:w.l}</title><circle class="bg" cx="12" cy="12" r="12" fill="${w.b}"/><g fill="none" stroke="${w.c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${w.p}</g></svg>` };
const G_INSTALL={k:"i",l:"Installation",o:[["PO","Portable"],["FI","Fixe"]]};
const PROD_CATS=[{id:"debitmetrie",name:"Débitmétrie",desc:"Débitmètres pour réseaux d'assainissement, rivières, canaux et conduites en charge.",ico:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 34c5-6 9-6 14 0s9 6 14 0 6-5 8-3"/><path d="M12 22l7-9 6 6 9-11"/><path d="M28 8h6v6"/></svg>',
  groups:[{k:"m",l:"Mesure",o:[["SL","Surface libre"],["EC","En charge"]],main:true},G_INSTALL,{k:"w",l:"Type d'eau",o:[["EU","Eaux usées"],["EP","Eau potable"],["EB","Eau brute"],["PL","Eaux pluviales"]],water:true}],
  items:[
  ["raven-eye","Débitmètre radar hauteur-vitesse RAVEN-EYE","Sans contact, installation au-dessus du conduit, insensible à la nature de l'effluent","SL FI EU EP EB PL",0.8],
  ["beluga-av","Débitmètre Doppler hauteur-vitesse BELUGA AV","Capteur Doppler et pression, ultra-compact, Modbus","SL FI EU EB PL",0.5],
  ["beluga","Débitmètre Doppler hauteur-vitesse BELUGA","Installation sans modification du conduit, fonctionne en refoulement","SL FI EU EB PL",0.7],
  ["raven-eye-beluga-solutions-autonomes","RAVEN-EYE & BELUGA Solutions autonomes","Solutions autonomes hauteur / vitesse sur datalogger","SL PO FI EU EB PL",0.4],
  ["logr","Débitmètre portable LOG'R","Doppler hauteur-vitesse autonome pour le diagnostic de réseau, Wi-Fi","SL PO EU PL",0.5],
  ["bulr2","Débitmètre portable bulle à bulle BUL'R2","Débit sur canal de comptage, enregistreur intégré, asservissement préleveur","SL PO EU EB PL",0.3],
  ["debulle","Débitmètre bulle à bulle DEBULLE","Poste fixe sur canal de comptage, enregistreur intégré","SL FI EU EB PL",0.9],
  ["oc90","Débitmètre à ultrasons OC90","Canal de comptage, mesure de niveau à ultrasons, 2 voies","SL FI EU EB PL",0.6],
  ["phoenix","Débitmètre radar hauteur-vitesse PHOENIX","Rivières et grands canaux, sans contact avec l'écoulement","SL FI EB",0.7],
  ["flostick","Courantomètre électromagnétique FloStick","Lecture instantanée de la vitesse, enregistrement 2 000 valeurs","SL PO EU EB PL",0.5],
  ["fluvia","Courantomètre électromagnétique FLUVIA","Vitesse et calcul du débit, rivière, irrigation, assainissement","SL PO EU EB PL",2.3],
  ["radar-mate","Radar de vitesse portable RADAR‑MATE 2","Mesure de vitesse rapide et instantanée, sans contact, par radar de surface","SL PO EU EP EB PL",0.2],
  ["easyflow","Débitmètre par traçage au sel EASYFLOW","Jaugeage en quelques minutes sur cours d'eau à fort brassage","SL PO EB",0.4],
  ["torpee-mag","Débitmètre multipoint à insertion TORPEE-MAG","Électromagnétique, DN 100 à DN 2500, pose sans interruption du débit","EC FI EP EB",0.4],
  ["kf100","Débitmètre à temps de transit KF100","Poste fixe, capteur non intrusif, DN 10 à 3 000 mm","EC FI EP EB",0.3],
  ["kf200","Débitmètre portable à temps de transit KF200","Capteur non intrusif, DN 10 à 6 500 mm","EC PO EP EB",0.6],
  ["kf210","Débitmètre portable à temps de transit KF210","Portable IP67, capteur non intrusif, DN 50 à 2 500 mm","EC PO EP EB",0.4]
  ].map(([id,n,s,t,mo])=>({id,n,s,t:t.split(" "),mo,f:`debitmetrie/${id}.pdf`}))},
 {id:"preleveurs",name:"Préleveurs",desc:"Préleveurs d'échantillons portables et fixes, réfrigérés ou non, pour l'autosurveillance et les bilans.",ico:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="12" width="30" height="30" rx="5"/><path d="M17 12V6h14v6"/><path d="M16 22h16M16 30h16"/><path d="M24 34.5c1.6 0 2.6-1.1 2.6-2.4 0-1.5-2.6-4.4-2.6-4.4s-2.6 2.9-2.6 4.4c0 1.3 1 2.4 2.6 2.4z" stroke="#E3000B"/></svg>',
  groups:[{...G_INSTALL,main:true},{k:"p",l:"Prélèvement",o:[["VI","Pompe à vide"],["PE","Pompe péristaltique"],["EC","En charge"]]}],
  items:[
  ["eccomaxx-sp5c","Préleveur fixe réfrigéré ECCOMAXX SP5 C","Compact, mono ou multi-flacons, autosurveillance des stations d'épuration","FI VI",0.7],
  ["maxx-sp5-dk","Préleveur sur conduite en charge MAXX SP5 DK","Eau ou boue sur conduit sous pression jusqu'à 20 bars, prélèvement par électrovannes","FI EC",0.4],
  ["maxx-sp5b","Préleveur fixe réfrigéré MAXX SP5 B","Construction compacte en plastique, mono ou multi-flacons","FI PE",1.0],
  ["maxx-tp5w","Préleveur mural MAXX TP5 W","Mono-flacon, montage mural, associable à un réfrigérateur","FI PE",0.4],
  ["maxx-p6","Préleveur portable MAXX P6","Léger et compact, mono ou multi-flacons","PO VI PE",2.2],
  ["maxx-tp5p","Préleveur portable MAXX TP5 P","Mono ou multi-flacons, isotherme ou réfrigéré","PO VI",1.3],
  ["maxx-tp5c","Préleveur portable MAXX TP5 C","Préleveur de terrain, mono ou multi-flacons, isotherme ou réfrigéré","PO PE",1.8]
  ].map(([id,n,s,t,mo,x])=>({id,n,s,t:t.split(" "),mo,x,f:`preleveurs/${id}.pdf`}))},
 {id:"canaux",name:"Canaux de mesure",desc:"Canaux jaugeurs Venturi et Palmer-Bowlus : le niveau mesuré en amont donne directement le débit.",ico:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11h11l6 7h6l6-7h11"/><path d="M4 37h11l6-7h6l6 7h11"/><path d="M9 24h28" stroke="#E3000B"/><path d="M32 20l5 4-5 4" stroke="#E3000B"/></svg>',
  groups:[],
  items:[
  ["venturi-amv","Canal Venturi AMV","Mesure de débit en canal ouvert à surface libre, liquides clairs ou chargés, de 5 à 3 300 m³/h","",0.4,"Canal ouvert · ISO 4359"],
  ["palmer-bowlus","Canal jaugeur Palmer-Bowlus","Canal circulaire en fibre de verre, à poser dans un conduit gravitaire DN 100 à 800 depuis un regard, jusqu'à 1 800 m³/h","",0.3,"Conduite circulaire"]
  ].map(([id,n,s,t,mo,x])=>({id,n,s,t:t?t.split(" "):[],mo,x,f:`canaux/${id}.pdf`}))},
 {id:"capteurs",name:"Capteurs / Détecteurs",desc:"Pluviomètres, détection d'hydrocarbures, de surverse et de boue, mesure de niveau en piézomètre.",ico:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="24" cy="22" r="4.5"/><path d="M24 27v15"/><path d="M16 14a11 11 0 0 0 0 16M32 14a11 11 0 0 1 0 16"/><path d="M10 8a19 19 0 0 0 0 28M38 8a19 19 0 0 1 0 28" stroke="#E3000B"/></svg>',
  groups:[],
  items:[
  ["pluvio-pro","Pluviomètre à auget basculant Pluvio PRO","Pluviomètre professionnel, orifice 200 cm², résolution 0,1 à 0,5 mm, étalonné manuellement (± 2 %)",0.7,"Pluie"],
  ["pluvio-meteo","Pluviomètre à auget basculant Pluvio METEO","Pluviomètre météorologique, orifice 200 cm², avec drain pour récupérer l'eau en vue d'analyse",0.3,"Pluie"],
  ["ldi-row","Détecteur optique d'hydrocarbure LDI ROW","Détection sans contact d'un film d'hydrocarbure dès 1 µm, sorties contact, 4-20 mA et RS485",1.3,"Hydrocarbures"],
  ["enviroflu","Sonde HAP TriOS enviroFlu","Fluoromètre UV : concentration d'hydrocarbures dans l'eau, sans réactif ni prélèvement, sortie 4-20 mA",0.4,"Hydrocarbures"],
  ["dts01","Détecteur de surverse DTS01","Détection par conductivité, relais pour mesurer les temps de surverse et déclencher un préleveur",0.1,"Surverse"],
  ["dtr01","Détecteur de niveau de boue DTR01","Détecteur optique à sonde lestée pour contrôler le niveau de boue des fosses, en assainissement collectif ou non",0.5,"Boues"],
  ["piezo-bf","Sondes piézométriques à ruban série BF","Mesure manuelle du niveau d'eau en piézomètre, puits ou forage : ruban gradué au mm, signal sonore et lumineux",0.5,"Niveau"]
  ].map(([id,n,s,mo,x])=>({id,n,s,t:[],mo,x,f:`capteurs/${id}.pdf`}))},
 {id:"qualite",name:"Qualité de l'eau",desc:"Sondes, transmetteurs et analyseurs physico-chimiques CHEMITEC, MESmètre portable et sonde HAP.",ico:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 6h14M20 6v13L9.5 37.5A4 4 0 0 0 13 43.5h22a4 4 0 0 0 3.5-6L28 19V6"/><path d="M14.5 31h19" stroke="#E3000B"/><circle cx="21" cy="37" r="1.6" fill="#E3000B" stroke="none"/><circle cx="27.5" cy="35.5" r="1.2" fill="#E3000B" stroke="none"/></svg>',
  groups:[],
  items:[
  ["gamme-physico-chimique","Sondes et contrôleurs physico-chimiques","Présentation de la gamme CHEMITEC : pH/redox, conductivité, chlore, oxygène dissous, turbidité, MES, transmetteurs et analyseurs",0.6,"Gamme complète"],
  ["serie-4001","Analyseur photométrique en ligne SÉRIE 4001","Chlore libre, total et combiné, dioxyde de chlore, ozone, acide peracétique ; étalonnage à chaque cycle",0.2,"Analyseur"],
  ["serie-46","Transmetteur analogique SÉRIE 46","1 ou 2 capteurs (pH, redox, conductivité, chlore, oxygène, turbidité, MES), 4-20 mA, relais, Modbus",0.3,"Transmetteur"],
  ["serie-50","Transmetteur numérique SÉRIE 50","2 à 4 capteurs numériques plug & play, écran couleur, enregistreur 250 000 valeurs",0.6,"Transmetteur"],
  ["s401-dig-n","Électrode de pH/T° numérique S401 DIG/N","pH 0 à 14 et température, précision ± 0,05 pH, sortie Modbus RTU",0.3,"Sonde"],
  ["s401-vg","Électrode de pH analogique S401/VG","Électrode en verre, signal mV, adaptée aux eaux peu conductrices (dès 5 µS/cm)",0.3,"Sonde"],
  ["s423-c-opt","Sonde optique d'oxygène dissous S423/C/OPT","0 à 20 mg/L par luminescence, sans pièce mobile, Modbus RTU ou 4-20 mA",0.4,"Sonde"],
  ["s461-tn","Sonde de turbidité numérique S461/TN","0 à 1 000 ou 4 000 NTU, infrarouge à 90° selon ISO 7027, RS485 ou 4-20 mA",0.5,"Sonde"],
  ["r812","MESmètre portable R812","Portable de terrain multi-paramètres : MES, oxygène dissous, pH, redox ; capteurs interchangeables, enregistrement",0.3,"Portable"]
  ].map(([id,n,s,mo,x])=>({id,n,s,t:[],mo,x,f:`qualite/${id}.pdf`}))}];
PROD_CATS.find(c=>c.id==="qualite").items.push({...PROD_CATS.find(c=>c.id==="capteurs").items.find(i=>i.id==="enviroflu")});  /* la sonde HAP figure dans les deux familles (même PDF) */
const PF={cat:null,sel:{},q:""};
function prodOn(){ return document.body.classList.contains("onprod") }
function curCat(){ return PROD_CATS.find(x=>x.id===PF.cat) }
function showProd(cat,push){
  document.body.classList.remove("onhub","onsim","onctrl"); $("hub").classList.remove("hub-anim"); document.body.classList.add("onprod");
  if(push!==false) try{ history.pushState({prod:cat||1},"") }catch(e){}
  const changed=PF.cat!==(cat||null); PF.cat=cat||null; $("prodCats").hidden=!!cat; $("prodList").hidden=!cat;
  const c=curCat(); $("prodTitle").textContent=c?c.name:"Nos produits"; $("prodBackLab").textContent=c?"Nos produits":"Accueil";
  if(c&&changed){ PF.sel={}; c.groups.forEach(g=>PF.sel[g.k]=new Set()); PF.q=""; $("pfQ").value="";
    $("pfGroups").hidden=!c.groups.length; $("pfQ").closest(".pf-search").hidden=c.items.length<5;  /* petite famille : ni filtres ni recherche */
    $("pfGroups").innerHTML=c.groups.map(g=>`<div class="pf-g" role="group" aria-label="${g.l}"><span>${g.l}</span><div class="pf-chips">${g.o.map(([v,l])=>`<button class="pf-chip" type="button" aria-pressed="false" data-g="${g.k}" data-v="${v}">${g.water?wIcon(v):""}${l}</button>`).join("")}</div></div>`).join("") }
  if(c) renderProdList(); window.scrollTo({top:0}) }
$("hubProd").onclick=()=>showProd(null);
$("prodBack").onclick=()=>{ if(history.state&&history.state.prod) history.back(); else if(PF.cat) showProd(null,false); else showHub(false) };
$("pcGrid").innerHTML=PROD_CATS.map(c=>`<button class="pc-card" type="button" data-cat="${c.id}"><span class="pc-ico">${c.ico}</span><b>${c.name}</b><small>${c.desc}</small><span class="pc-n">${c.items.length} documentations</span></button>`).join("");
$("pcGrid").onclick=e=>{ const b=e.target.closest("[data-cat]"); if(b) showProd(b.dataset.cat) };
$("pfGroups").onclick=e=>{ const b=e.target.closest(".pf-chip"); if(!b) return; const set=PF.sel[b.dataset.g]; if(set.has(b.dataset.v)) set.delete(b.dataset.v); else set.add(b.dataset.v); b.setAttribute("aria-pressed",set.has(b.dataset.v)); renderProdList() };
$("pfQ").addEventListener("input",()=>{ PF.q=$("pfQ").value; renderProdList() });
$("pfReset").onclick=()=>{ for(const k in PF.sel) PF.sel[k].clear(); PF.q=""; $("pfQ").value=""; document.querySelectorAll(".pf-chip").forEach(b=>b.setAttribute("aria-pressed","false")); renderProdList() };
const norm=t=>t.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
function renderProdList(){
  const c=curCat(); if(!c) return; const q=norm(PF.q.trim()), S=PF.sel;
  const ok=it=>c.groups.every(g=>!S[g.k].size||it.t.some(v=>S[g.k].has(v)))&&(!q||norm(it.n+" "+it.s).includes(q));
  const list=c.items.filter(ok);
  const tags=it=>(it.x?`<span class="tag m">${esc(it.x)}</span>`:"")+c.groups.filter(g=>!g.water).map(g=>g.o.filter(([v])=>it.t.includes(v)).map(([,l])=>`<span class="tag${g.main?" m":""}">${l}</span>`).join("")).join("")
    +c.groups.filter(g=>g.water).map(g=>`<span class="pw">${g.o.filter(([v])=>it.t.includes(v)).map(([v])=>wIcon(v)).join("")}</span>`).join("");
  $("pl").innerHTML=list.map(it=>`<li><a href="${DOC_BASE+it.f}" target="_blank" rel="noopener" data-id="${it.id}" aria-label="${esc(it.n)} : documentation commerciale (PDF)">
    <span class="pn">${esc(it.n)}</span>
    <span class="ps">${esc(it.s)}</span>
    <span class="pt">${tags(it)}</span>
    <span class="pdf"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="M9 14h6M9 17.5h4"/></svg>PDF<small>${nf(it.mo||0,1)} Mo</small></span></a></li>`).join("");
  $("plEmpty").hidden=list.length>0;
  const nf_=Object.values(S).reduce((n,x)=>n+x.size,0)+(q?1:0);
  $("pfCount").textContent=`${list.length} appareil${list.length>1?"s":""}${nf_?` sur ${c.items.length}`:""}`; $("pfReset").hidden=!nf_;
}


/* ---------- Lecteur de documentation intégré (téléphone) : PDF.js, avec retour et partage ---------- */
const LIB_BASE=window.CMT_LOCAL?"lib/pdfjs/":(location.hostname==="cometec38.github.io")?"/Bilan/lib/pdfjs/":(location.protocol.startsWith("http")&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname))?"lib/pdfjs/":"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
let pdfLibP=null;
function loadPdfJs(){ if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if(!pdfLibP) pdfLibP=new Promise((res,rej)=>{ const sc=document.createElement("script"); sc.src=LIB_BASE+"pdf.min.js";
    sc.onload=()=>{ window.pdfjsLib.GlobalWorkerOptions.workerSrc=LIB_BASE+"pdf.worker.min.js"; res(window.pdfjsLib) }; sc.onerror=()=>{ pdfLibP=null; rej(new Error("lecteur indisponible")) }; document.head.appendChild(sc) });
  return pdfLibP }
const PV={doc:null,item:null,zoom:1,token:0};
const ZOOMS=[1,1.5,2,3];
function pdfOn(){ return document.body.classList.contains("onpdf") }
function findItem(id){ for(const c of PROD_CATS){ const it=c.items.find(x=>x.id===id); if(it) return it } return null }
async function openPdf(it,push){
  if(!pdfOn()) PV.scroll=window.scrollY; document.body.classList.add("onpdf"); $("pdfv").hidden=false; $("pdfvTitle").textContent=it.n; PV.item=it; PV.zoom=1;
  $("pdfvBody").innerHTML=`<p class="pdfv-msg">Chargement de la documentation…</p>`;
  if(push!==false) try{ history.pushState({prod:PF.cat||1,pdf:it.id},"") }catch(e){}
  const tok=++PV.token;
  try{ const lib=await loadPdfJs(); const doc=await lib.getDocument({url:DOC_BASE+it.f}).promise; if(tok!==PV.token){ doc.destroy(); return } PV.doc=doc; await renderPdf() }
  catch(e){ if(tok!==PV.token) return; $("pdfvBody").innerHTML=`<p class="pdfv-msg">Impossible d'afficher la documentation ici${navigator.onLine===false?" : pas de connexion Internet":""}.<br><br><a href="${DOC_BASE+it.f}" target="_blank" rel="noopener">Ouvrir le PDF</a></p>` } }
async function renderPdf(){
  const doc=PV.doc, tok=PV.token, body=$("pdfvBody"); if(!doc) return;
  const avail=Math.max(200,body.clientWidth-16), dpr=Math.min(window.devicePixelRatio||1,3);
  body.innerHTML=""; const pages=[];
  for(let n=1;n<=doc.numPages;n++){ const d=document.createElement("div"); d.className="pdfv-page"; body.appendChild(d); pages.push(d) }
  for(let n=1;n<=doc.numPages;n++){
    const page=await doc.getPage(n); if(tok!==PV.token) return;
    const v1=page.getViewport({scale:1}), cssW=avail*PV.zoom, scale=cssW/v1.width, vp=page.getViewport({scale:scale*dpr});
    const c=document.createElement("canvas"); c.width=Math.floor(vp.width); c.height=Math.floor(vp.height);
    pages[n-1].style.width=cssW+"px"; pages[n-1].style.aspectRatio=`${v1.width} / ${v1.height}`; pages[n-1].appendChild(c);
    await page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise; if(tok!==PV.token) return }
}
function closePdf(){ PV.token++; if(PV.doc){ try{ PV.doc.destroy() }catch(e){} } PV.doc=null; document.body.classList.remove("onpdf"); $("pdfv").hidden=true; $("pdfvBody").innerHTML=""; window.scrollTo({top:PV.scroll||0}) }
function setZoom(d){ const i=Math.max(0,Math.min(ZOOMS.length-1,ZOOMS.indexOf(PV.zoom)+d)); if(ZOOMS[i]===PV.zoom) return;
  const b=$("pdfvBody"), fy=b.scrollTop/Math.max(1,b.scrollHeight); PV.zoom=ZOOMS[i]; renderPdf().then(()=>{ b.scrollTop=fy*b.scrollHeight }) }
$("pdfvIn").onclick=()=>setZoom(1); $("pdfvOut").onclick=()=>setZoom(-1);
$("pdfvBack").onclick=()=>{ if(history.state&&history.state.pdf) history.back(); else closePdf() };
$("pdfvShare").onclick=async()=>{ const it=PV.item; if(!it) return; const url=new URL(DOC_BASE+it.f,location.href).href, name=("COMETEC - "+it.n).replace(/[\\/:*?"<>|]/g,"")+".pdf";
  try{ if(navigator.canShare){ const blob=await (await fetch(url)).blob(); const file=new File([blob],name,{type:"application/pdf"}); if(navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:it.n}); return } }
    if(navigator.share){ await navigator.share({title:it.n,url}); return } }catch(e){ if(e&&e.name==="AbortError") return }
  const a=document.createElement("a"); a.href=url; a.download=name; a.target="_blank"; document.body.appendChild(a); a.click(); a.remove() };
let pdfRz=null; addEventListener("resize",()=>{ if(!pdfOn()) return; clearTimeout(pdfRz); pdfRz=setTimeout(renderPdf,250) });
$("pl").addEventListener("click",e=>{ const a=e.target.closest("a[data-id]"); if(!a||!isM()) return; e.preventDefault(); const it=findItem(a.dataset.id); if(it) openPdf(it) });

/* ---------- Simulateur de débit : Q = S × V ou Manning-Strickler ---------- */
const SIM={meth:"sv",shape:"circ",dims:{circ:"",rect:""},iu:"mm",ku:"ks",shown:false,vCalc:null};
function simNum(id){ const v=$(id).value.trim().replace(/\s/g,"").replace(",","."); if(v==="") return null; const n=Number(v); return isFinite(n)?n:NaN }
function wetted(sh,D,H){ // D, H en mm → S (m²), P (m)
  if(sh==="circ"){ const r=D/2000, h=Math.max(0,Math.min(H,D))/1000; if(h>=2*r) return {S:Math.PI*r*r,P:2*Math.PI*r}; if(h<=0) return {S:0,P:0};
    const th=2*Math.acos((r-h)/r); return {S:r*r/2*(th-Math.sin(th)),P:r*th} }
  const L=D/1000, h=Math.max(0,H)/1000; return {S:L*h,P:L+2*h} }
function strickler(w,Ks,I){ if(!(w.S>0)) return 0; return Ks*Math.pow(w.S/w.P,2/3)*Math.sqrt(I) } // V en m/s
function showSim(push){ document.body.classList.remove("onhub","onprod","onctrl"); $("hub").classList.remove("hub-anim"); document.body.classList.add("onsim"); if(push!==false) try{ history.pushState({sim:1},"") }catch(e){} window.scrollTo({top:0}); simDraw() }
$("hubSim").onclick=()=>showSim();
$("simBack").onclick=()=>{ if(history.state&&history.state.sim) history.back(); else showHub(false) };
function radio(sel,attr,val){ document.querySelectorAll(sel).forEach(b=>b.setAttribute("aria-checked",b.dataset[attr]===val)) }
function simLabels(){
  const ms=SIM.meth==="ms", c=SIM.shape==="circ";
  $("simVWrap").hidden=ms; $("simMsWrap").hidden=!ms;
  $("simHLab").textContent=ms&&c?"Niveau d'eau (facultatif)":"Niveau d'eau";
  $("simH").placeholder=ms&&c?"vide = conduite pleine":"ex. 120";
  document.querySelectorAll(".sim-mode .smsub").forEach(x=>{ const sh=x.closest(".sim-mode").dataset.shape; x.textContent=sh==="circ"?(ms?"Diamètre, pente, rugosité":"Diamètre DN, niveau, vitesse"):(ms?"Largeur, niveau, pente, rugosité":"Largeur, niveau, vitesse") });
  $("simIntro").innerHTML=ms?(c?"Renseignez le diamètre, la pente du radier et la rugosité : la capacité de la conduite à pleine section est calculée par la formule de <b>Manning-Strickler</b>. Ajoutez un niveau d'eau pour connaître le débit à ce niveau.":"Renseignez la largeur, le niveau d'eau, la pente du radier et la rugosité : le débit est calculé par la formule de <b>Manning-Strickler</b>.")
    :"Choisissez la forme de l'écoulement, renseignez les dimensions, le niveau d'eau et la vitesse moyenne : le débit est calculé par <b>Q = S × V</b>.";
  $("simFoot").textContent=ms?"Résultat théorique en régime uniforme : écoulement à surface libre, pente du radier constante, sans mise en charge ni influence de l'aval (remous). V = Ks × Rh^(2/3) × √I, Q = S × V.":"Résultat théorique : la vitesse saisie est considérée comme la vitesse moyenne sur toute la section mouillée.";
  $("simCap").textContent=c?"Coupe de la conduite circulaire":"Coupe du canal rectangulaire";
}
function simReset(){ $("simErr").hidden=true; $("simRes").hidden=true; SIM.shown=false; SIM.vCalc=null }
function simSetShape(sh){
  SIM.dims[SIM.shape]=$("simDim").value; SIM.shape=sh; $("simDim").value=SIM.dims[sh]||"";
  radio(".sim-mode","shape",sh);
  $("simDimLab").textContent=sh==="circ"?"Diamètre de la conduite (DN)":"Largeur du canal";
  $("simDim").placeholder=sh==="circ"?"ex. 300":"ex. 400";
  simLabels(); simReset(); simDraw(); simSave() }
function simSetMeth(m){ SIM.meth=m; radio(".sim-meth button","meth",m); simLabels(); simReset(); simDraw(); simSave() }
document.querySelectorAll(".sim-mode").forEach(b=>b.onclick=()=>simSetShape(b.dataset.shape));
document.querySelectorAll(".sim-meth button").forEach(b=>b.onclick=()=>simSetMeth(b.dataset.meth));
document.querySelectorAll("[data-iu]").forEach(b=>b.onclick=()=>{ SIM.iu=b.dataset.iu; radio("[data-iu]","iu",SIM.iu); simLive(); simSave() });
document.querySelectorAll("[data-ku]").forEach(b=>b.onclick=()=>{ if(SIM.ku===b.dataset.ku) return; const v=simNum("simKs");
  SIM.ku=b.dataset.ku; radio("[data-ku]","ku",SIM.ku); if(v>0) $("simKs").value=SIM.ku==="n"?nf(1/v,4):nf(1/v,0); simLive(); simSave() });
$("simMat").onchange=()=>{ const k=+$("simMat").value; if(k>0) $("simKs").value=SIM.ku==="n"?nf(1/k,4):String(k); else { $("simKs").value=""; $("simKs").focus() } simLive(); simSave() };
function ksVal(){ const v=simNum("simKs"); if(!(v>0)) return v; return SIM.ku==="n"?1/v:v }
function slopeVal(){ const v=simNum("simI"); if(!(v>0)) return v; return SIM.iu==="pc"?v/100:v/1000 }
const f1=(x,d)=>nf(x,d);
function simDraw(){
  const sh=SIM.shape, ms=SIM.meth==="ms", D=simNum("simDim"), H=simNum("simH");
  const V=ms?SIM.vCalc:simNum("simV");
  const okD=D>0, hEmpty=H==null, full=ms&&sh==="circ"&&hEmpty, okH=full||(H!=null&&H>=0&&!isNaN(H)), okV=V!=null&&!isNaN(V);
  const vLab=ms?(okV?"V ≈ "+f1(V,2)+" m/s":"V"):(okV?"V = "+f1(V,2)+" m/s":"V");
  const defs=`<defs><linearGradient id="simWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3FB3BC"/><stop offset="1" stop-color="#0E6E75"/></linearGradient>
    <marker id="arR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#E3000B"/></marker>
    <marker id="arT" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#00838C"/></marker>
    <clipPath id="simClip"><circle cx="160" cy="160" r="100"/></clipPath></defs>`;
  let g="";
  const vsym=(x,y)=>`<g class="${okV?"":"ghost"}"><circle class="vsym" cx="${x}" cy="${y}" r="9"/><circle class="vdot" cx="${x}" cy="${y}" r="3"/><text class="vtxt" x="${x+15}" y="${y+5}">${vLab}</text></g>`;
  if(sh==="circ"){
    const cx=160, cy=160, R=100, W=13, Dv=okD?D:300;
    let fill=full?1:(okH?Math.min(1,H/Dv):0.4); const ys=cy+R-fill*2*R;
    g+=`<circle class="wall" cx="${cx}" cy="${cy}" r="${R+W}"/><circle class="wall-edge" cx="${cx}" cy="${cy}" r="${R+W}"/><circle class="inner" cx="${cx}" cy="${cy}" r="${R}"/>`;
    g+=`<g class="${okH?"":"ghost"}"><rect class="water" clip-path="url(#simClip)" x="${cx-R}" y="${ys}" width="${2*R}" height="${cy+R-ys+1}"/>`;
    if(fill>0&&fill<1){ const half=Math.sqrt(Math.max(0,R*R-(ys-cy)**2)); g+=`<line class="surf" x1="${cx-half}" y1="${ys}" x2="${cx+half}" y2="${ys}"/>` }
    g+=`</g><circle class="wall-edge" cx="${cx}" cy="${cy}" r="${R}"/>`;
    g+=`<g class="${okD?"":"ghost"}"><line class="ext" x1="${cx-R}" y1="${cy}" x2="${cx-R}" y2="36"/><line class="ext" x1="${cx+R}" y1="${cy}" x2="${cx+R}" y2="36"/>
      <line class="dim" x1="${cx-R+1}" y1="42" x2="${cx+R-1}" y2="42" marker-start="url(#arR)" marker-end="url(#arR)"/>
      <text class="dimtxt" x="${cx}" y="33" text-anchor="middle">DN ${okD?f1(D,0):"?"}${okD?" mm":""}</text></g>`;
    const xd=cx+R+W+26, yb=cy+R, half=Math.sqrt(Math.max(0,R*R-(ys-cy)**2));
    if(fill>0&&!full){ g+=`<g class="${okH?"":"ghost"}"><line class="hext" x1="${cx}" y1="${yb}" x2="${xd+6}" y2="${yb}"/><line class="hext" x1="${cx+half}" y1="${ys}" x2="${xd+6}" y2="${ys}"/>
      <line class="hdim" x1="${xd}" y1="${yb-1}" x2="${xd}" y2="${ys+1}" marker-start="url(#arT)" marker-end="url(#arT)"/>
      <text class="htxt" transform="translate(${xd+18} ${(yb+ys)/2}) rotate(-90)" text-anchor="middle">h${okH?" = "+f1(H,0)+" mm":""}</text></g>` }
    if(full) g+=`<text class="htxt" transform="translate(${xd+10} ${cy}) rotate(-90)" text-anchor="middle">Section pleine</text>`;
    if(cy+R-ys>30) g+=vsym(cx-30,full?cy+4:(ys+cy+R)/2+(fill>0.9?0:4));
  } else {
    const Lv=okD?D:400, Hv=okH?Math.max(H,0):Lv*0.35, maxW=220, maxH=165;
    const sc=Math.min(maxW/Lv, Hv>0?maxH/Hv:Infinity), Wp=Lv*sc, Hp=Hv*sc, W=12, yf=262, cx=160, x0=cx-Wp/2;
    const wallH=Math.min(200,Math.max(Hp+40,90));
    g+=`<rect class="wall" x="${x0-W}" y="${yf-wallH}" width="${W}" height="${wallH+W}"/><rect class="wall" x="${x0+Wp}" y="${yf-wallH}" width="${W}" height="${wallH+W}"/><rect class="wall" x="${x0-W}" y="${yf}" width="${Wp+2*W}" height="${W}"/>
      <rect class="inner" x="${x0}" y="${yf-wallH}" width="${Wp}" height="${wallH}"/>
      <path class="wall-edge" d="M${x0-W} ${yf-wallH}V${yf+W}H${x0+Wp+W}V${yf-wallH}H${x0+Wp}V${yf}H${x0}V${yf-wallH}Z"/>`;
    g+=`<g class="${okH?"":"ghost"}"><rect class="water" x="${x0}" y="${yf-Hp}" width="${Wp}" height="${Hp}"/>${Hp>0?`<line class="surf" x1="${x0}" y1="${yf-Hp}" x2="${x0+Wp}" y2="${yf-Hp}"/>`:""}</g>`;
    const yt=yf-wallH;
    g+=`<g class="${okD?"":"ghost"}"><line class="ext" x1="${x0}" y1="${yt}" x2="${x0}" y2="${Math.min(36,yt-6)}"/><line class="ext" x1="${x0+Wp}" y1="${yt}" x2="${x0+Wp}" y2="${Math.min(36,yt-6)}"/>
      <line class="dim" x1="${x0+1}" y1="${Math.min(42,yt-12)}" x2="${x0+Wp-1}" y2="${Math.min(42,yt-12)}" marker-start="url(#arR)" marker-end="url(#arR)"/>
      <text class="dimtxt" x="${cx}" y="${Math.min(33,yt-21)}" text-anchor="middle">L ${okD?"= "+f1(D,0)+" mm":"?"}</text></g>`;
    const xd=x0+Wp+W+26;
    if(Hp>0) g+=`<g class="${okH?"":"ghost"}"><line class="hext" x1="${x0+Wp}" y1="${yf}" x2="${xd+6}" y2="${yf}"/><line class="hext" x1="${x0+Wp}" y1="${yf-Hp}" x2="${xd+6}" y2="${yf-Hp}"/>
      <line class="hdim" x1="${xd}" y1="${yf-1}" x2="${xd}" y2="${yf-Hp+1}" marker-start="url(#arT)" marker-end="url(#arT)"/>
      <text class="htxt" transform="translate(${xd+18} ${yf-Hp/2}) rotate(-90)" text-anchor="middle">h${okH?" = "+f1(H,0)+" mm":""}</text></g>`;
    if(Hp>30) g+=vsym(cx-30,yf-Hp/2+4);
  }
  $("simSvg").innerHTML=defs+g;
}
const dq=q=>q<100?2:q<1000?1:0;
const fQh=q=>f1(q,dq(q)), fS=S=>f1(S,S<0.1?4:3)+" m²";
function simCalc(show){
  const sh=SIM.shape, ms=SIM.meth==="ms", D=simNum("simDim"), H=simNum("simH");
  const err=m=>{ if(show){ $("simErr").textContent=m; $("simErr").hidden=false; $("simRes").hidden=true; SIM.shown=false; SIM.vCalc=null; simDraw() } return false };
  if(D==null||isNaN(D)||D<=0) return err(sh==="circ"?"Indiquez le diamètre de la conduite (DN) en mm.":"Indiquez la largeur du canal en mm.");
  const hOpt=ms&&sh==="circ";
  if(!(hOpt&&H==null)&&(H==null||isNaN(H)||H<0)) return err("Indiquez le niveau d'eau en mm.");
  if(sh==="circ"&&H!=null&&H>D) return err(`Le niveau d'eau (${f1(H,0)} mm) dépasse le diamètre de la conduite (DN ${f1(D,0)}). Vérifiez les valeurs.`);
  let V, Ks, I;
  if(ms){ I=slopeVal(); Ks=ksVal();
    if(I==null||isNaN(I)||I<=0) return err("Indiquez la pente du radier (supérieure à 0).");
    if(Ks==null||isNaN(Ks)||Ks<=0) return err("Indiquez la rugosité (Ks ou n).") }
  else { V=simNum("simV"); if(V==null||isNaN(V)) return err("Indiquez la vitesse moyenne en m/s."); if(V<0) return err("La vitesse doit être positive.") }
  const full=hOpt&&H==null, Hc=full?D:H, w=wetted(sh,D,Hc);
  if(ms) V=strickler(w,Ks,I);
  const S=w.S, Qs=S*V*1000, Qh=S*V*3600; SIM.vCalc=ms?V:null;
  $("simErr").hidden=true;
  $("srQh").textContent=fQh(Qh); $("srQs").textContent=f1(Qs,dq(Qs));
  document.querySelector("#simRes .sr-lab").textContent=full?"Capacité à pleine section":(ms?"Débit au niveau saisi":"Débit");
  const det=[["Section mouillée S",fS(S)]];
  if(ms) det.push(["Vitesse moyenne calculée",f1(V,2)+" m/s"]);
  if(sh==="circ") det.push(["Taux de remplissage (h / DN)",f1(Hc/D*100,0)+" %"]); else det.push(["Section L × h",`${f1(D,0)} × ${f1(H,0)} mm`]);
  if(ms){ det.push(["Rayon hydraulique Rh",f1(w.P>0?w.S/w.P*1000:0,1)+" mm"]); det.push([SIM.ku==="n"?"Rugosité n (Ks)":"Rugosité Ks (n)",SIM.ku==="n"?`${f1(1/Ks,4)} (${f1(Ks,0)})`:`${f1(Ks,0)} (${f1(1/Ks,4)})`]);
    det.push(["Pente",`${f1(I*1000,2)} mm/m · ${f1(I*100,3)} %`]) }
  if(ms&&sh==="circ"&&!full){ const wf=wetted("circ",D,D), Vf=strickler(wf,Ks,I); det.push(["Capacité à pleine section",fQh(wf.S*Vf*3600)+" m³/h"]) }
  det.push(["Débit journalier équivalent",f1(Qh*24,Qh*24<100?1:0)+" m³/j"]);
  $("srDet").innerHTML=det.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  // tableau débit / remplissage (Manning, conduite circulaire)
  if(ms&&sh==="circ"){ const rows=[0.1,0.25,0.5,0.75,0.94,1]; const cur=full?1:Hc/D;
    $("srTab").innerHTML=`<table><caption>Débit selon le remplissage (même pente, même rugosité)</caption><thead><tr><th>Remplissage</th><th>Niveau</th><th>Vitesse</th><th>Débit</th></tr></thead><tbody>`+
      rows.map(p=>{ const ww=wetted("circ",D,p*D), vv=strickler(ww,Ks,I), q=ww.S*vv*3600; return `<tr${Math.abs(p-cur)<1e-6?' class="cur"':""}><td>${f1(p*100,0)} %${p===0.94?" (débit maxi)":""}</td><td>${f1(p*D,0)} mm</td><td>${f1(vv,2)} m/s</td><td>${fQh(q)} m³/h · ${f1(q/3.6,dq(q/3.6))} l/s</td></tr>` }).join("")+`</tbody></table>`;
    $("srTab").hidden=false } else $("srTab").hidden=true;
  const notes=[]; if(!ms&&sh==="circ"&&H===D) notes.push("Conduite pleine : toute la section est prise en compte.");
  if(V>5) notes.push("Vitesse inhabituellement élevée pour un écoulement gravitaire : vérifiez la valeur.");
  if(ms&&I>0.1) notes.push("Pente très forte (plus de 10 %) : l'écoulement est probablement torrentiel, résultat à considérer avec prudence.");
  if(ms&&(Ks<20||Ks>130)) notes.push("Rugosité en dehors des valeurs usuelles (Ks entre 20 et 130) : vérifiez la saisie.");
  $("srNote").textContent=notes.join(" ");
  const r=$("simRes"); if(r.hidden||show){ r.hidden=false; r.classList.remove("res-pop"); void r.offsetWidth; r.classList.add("res-pop") } SIM.shown=true; simDraw(); return true }
function simLive(){ if(SIM.shown){ if(!simCalc(false)){ $("simRes").hidden=true; SIM.shown=false; SIM.vCalc=null } } $("simErr").hidden=true; simDraw() }
$("simForm").onsubmit=e=>{ e.preventDefault(); if(simCalc(true)&&isM()) $("simRes").scrollIntoView({block:"nearest",behavior:"smooth"}); simSave() };
["simDim","simH","simV","simI","simKs"].forEach(id=>$(id).addEventListener("input",()=>{ if(id==="simKs"){ const k=ksVal(); const m=[...$("simMat").options].find(o=>o.value&&k>0&&Math.abs(+o.value-k)<0.5); $("simMat").value=m?m.value:"" } simLive(); simSave() }));
function simSave(){ try{ SIM.dims[SIM.shape]=$("simDim").value; localStorage.setItem("cometecSim",JSON.stringify({meth:SIM.meth,shape:SIM.shape,dims:SIM.dims,h:$("simH").value,v:$("simV").value,i:$("simI").value,iu:SIM.iu,ks:$("simKs").value,ku:SIM.ku,mat:$("simMat").value})) }catch(e){} }
try{ const o=JSON.parse(localStorage.getItem("cometecSim")||"null"); if(o){ const t=o.shape==="rect"?"rect":"circ"; SIM.dims=Object.assign({circ:"",rect:""},o.dims||{}); $("simH").value=o.h||""; $("simV").value=o.v||"";
  if(o.i!=null) $("simI").value=o.i; if(o.iu) { SIM.iu=o.iu; radio("[data-iu]","iu",SIM.iu) } if(o.ku){ SIM.ku=o.ku; radio("[data-ku]","ku",SIM.ku) } if(o.mat!=null) $("simMat").value=o.mat; if(o.ks!=null) $("simKs").value=o.ks;
  SIM.meth=o.meth==="ms"?"ms":"sv"; radio(".sim-meth button","meth",SIM.meth); SIM.shape=t; $("simDim").value=SIM.dims[t]||""; simSetShape(t) } }catch(e){}
simLabels(); simDraw();
showHub(true);

/* ---------- Application installable (version publiée sur un site web) ---------- */
let installEvt=null;
addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); installEvt=e; $("btnInstall").hidden=false; if(matchMedia("(pointer:coarse)").matches) $("hubInstallTxt").innerHTML="<b>Installez l'application COMETEC</b> sur ce téléphone : ouverture directe depuis l'écran d'accueil, fonctionne même sans connexion."; $("hubInstall").hidden=false; $("hubInstallGo").hidden=false });
addEventListener("appinstalled",()=>{ installEvt=null; $("btnInstall").hidden=true; $("hubInstall").hidden=true; toast("L'application COMETEC est installée sur cet appareil") });
$("btnInstall").onclick=async()=>{ if(!installEvt) return; installEvt.prompt(); let ok=false; try{ ok=(await installEvt.userChoice).outcome==="accepted" }catch(e){} if(ok){ installEvt=null; $("btnInstall").hidden=true; $("hubInstall").hidden=true } };
$("hubInstallGo").onclick=()=>$("btnInstall").onclick();
{ // iPhone / iPad : pas d'installation automatique possible, on explique le geste (Safari › Partager › Sur l'écran d'accueil)
  const iOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  if(iOS&&!standalone){ $("hubInstallTxt").innerHTML="<b>Installez l'application COMETEC</b> : dans Safari, touchez le bouton Partager puis « Sur l'écran d'accueil »."; $("hubInstallGo").hidden=true; $("hubInstall").hidden=false } }
// ouverture d'un fichier par double-clic quand l'application installée est associée aux .csv / .xlsx
if("launchQueue" in window) window.launchQueue.setConsumer(async p=>{ if(p.files&&p.files.length){ const f=await p.files[0].getFile(); openFile(f) } });
if("serviceWorker" in navigator&&location.protocol.startsWith("http")&&document.querySelector('link[rel="manifest"]')) navigator.serviceWorker.register("sw.js").catch(e=>console.warn("Mode hors ligne indisponible",e));

/* ---------- Thème ---------- */
const rethem=()=>{ if(S.ds){ renderChart(); renderHQ(); renderCheckChart() } };
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",rethem);
new MutationObserver(rethem).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});

/* ---------- Démarrage ---------- */
(function start(){
  if(!EXAMPLE||true){ setNoData(true); return } // plus d'exemple client : la démo SITE TEST est proposée sur l'écran d'accueil
  const rows=EXAMPLE.rows.map(r=>r.map(v=>(typeof v==="number"&&v>1e11)?new Date(v):v));
  const ds=parseNative(rows,EXAMPLE.name); ds.sheet=EXAMPLE.sheet; loadDataset(ds,true);
  if(!window.echarts) toast("Le module graphique n'a pas pu être chargé.");
})();


/* ---------- Constat de vérification RAVEN-EYE au banc RAV-TRACK (Espace COMETEC) ----------
   Assistant pas à pas → rapport PDF COMETEC. Brouillon (avec photos) gardé sur l'appareil (IndexedDB),
   nom de l'intervenant, banc et signature mémorisés (localStorage). Rien n'est envoyé en ligne. */
const CV_STEPS=["Dossier","Client","Instrument","Ouvrage","Configuration","Réglage 1","Réglage 2","Réglage 3","Intervenant","Rapport"];
const CV_TOL=10; // écart maximum toléré, en %
const CV_BANC={bancN:"001",bancSerie:"001",bancFab:"05/06/2023",bancCtrl:"07/01/2026"};
const CV={d:null,step:1};
const cvDB={p:null,
  open(){ if(!this.p) this.p=new Promise(res=>{ try{ const r=indexedDB.open("cometec-constat",1); r.onupgradeneeded=()=>r.result.createObjectStore("kv"); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null) }catch(e){ res(null) } }); return this.p },
  async get(k){ const db=await this.open(); if(!db) return null; return new Promise(res=>{ try{ const q=db.transaction("kv").objectStore("kv").get(k); q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null) }catch(e){ res(null) } }) },
  async set(k,v){ const db=await this.open(); if(!db) return; try{ db.transaction("kv","readwrite").objectStore("kv").put(v,k) }catch(e){} },
  async del(k){ const db=await this.open(); if(!db) return; try{ db.transaction("kv","readwrite").objectStore("kv").delete(k) }catch(e){} } };
const cvPrefs={ get(){ try{ return JSON.parse(localStorage.getItem("cvPrefs")||"{}") }catch(e){ return {} } }, set(o){ try{ localStorage.setItem("cvPrefs",JSON.stringify(Object.assign(this.get(),o))) }catch(e){} } };
const cvNum=s=>{ s=String(s==null?"":s).trim().replace(/\s/g,"").replace(",","."); return s===""?NaN:Number(s) };
const cvToday=()=>{ const t=new Date(); return `${t.getFullYear()}-${p2(t.getMonth()+1)}-${p2(t.getDate())}` };
function cvDate(iso,plusYears){ const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||""); if(!m) return null; const d=new Date(+m[1]+(plusYears||0),+m[2]-1,+m[3]); if(plusYears&&d.getMonth()!==+m[2]-1) d.setDate(0); return d }
const cvLong=d=>d?d.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):"–";
function cvNo(f){ const d=cvDate(f.date); return /^\d{7}$/.test(f.devis||"")?String(d?d.getFullYear():new Date().getFullYear())+f.devis:"" }
function cvReg(f,n){ const vt=cvNum(f["vt"+n]), rs=["a","b","c"].map(c=>cvNum(f["r"+n+c]));
  if(!(vt>0)||rs.some(x=>!(x>=0))) return {vt,rs,done:false};
  const vr=Math.round(rs.reduce((a,b)=>a+b,0)/3*1000+1e-9)/1000, m=(vt+vr)/2, e=(vr-m)/m*100;   // formule COMETEC, Vraw arrondi au millième
  return {vt,rs,vr,e,ok:Math.abs(e)<=CV_TOL,done:true} }
function cvAll(f){ const R=[1,2,3].map(n=>cvReg(f,n)), done=R.every(r=>r.done); const mean=done?R.reduce((a,r)=>a+r.e,0)/3:NaN; return {R,done,mean,ok:done&&R.every(r=>r.ok)} }
const cvPct=(e,minus)=>!isFinite(e)?"–":(e>0.0049?"+":e<-0.0049?(minus||"−"):"")+nf(Math.abs(e),2)+" %";
function cvNewDraft(){ const p=cvPrefs.get(); const d={f:Object.assign({date:cvToday(),type:"RAVEN-EYE 2"},CV_BANC),img:{},step:1,t:Date.now()};
  ["bancN","bancSerie","bancFab","bancCtrl"].forEach(k=>{ if(p[k]) d.f[k]=p[k] }); if(p.interv) d.f.interv=p.interv; if(p.sig) d.img.sig=p.sig; return d }
let cvT=null;
function cvSave(){ clearTimeout(cvT); cvT=setTimeout(()=>{ if(CV.d){ CV.d.t=Date.now(); CV.d.step=CV.step; cvDB.set("draft",CV.d) } },300) }
function ctrlOn(){ return document.body.classList.contains("onctrl") }
function showCtrl(push){ document.body.classList.remove("onhub","onprod","onsim"); $("hub").classList.remove("hub-anim"); document.body.classList.add("onctrl");
  if(push!==false) try{ history.pushState({ctrl:1},"") }catch(e){} window.scrollTo({top:0}); cvStartScreen() }
async function cvStartScreen(){ $("cvWiz").hidden=true; $("cvStart").hidden=false; $("ctrlTitle").textContent="Constat RAVEN-EYE";
  const d=await cvDB.get("draft"); const has=d&&d.f&&(d.f.devis||d.f.societe||d.f.vt1);
  $("cvResume").hidden=!has; if(has){ $("cvResumeT").textContent=(cvNo(d.f)?`Constat N° ${cvNo(d.f)}`:"Constat en cours")+(d.example?" (exemple)":"");
    $("cvResumeS").textContent=[d.f.societe,d.f.lieu,`modifié le ${new Date(d.t).toLocaleDateString("fr-FR")} à ${new Date(d.t).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`].filter(Boolean).join(" · ");
    $("cvResumeGo").onclick=()=>cvOpen(d,d.step||1) } }
function cvOpen(d,step){ CV.d=d; $("cvStart").hidden=true; $("cvWiz").hidden=false;
  document.querySelectorAll("#cvForm [data-k]").forEach(el=>{ const v=d.f[el.dataset.k]; el.value=v==null?(el.tagName==="SELECT"?el.options[0].value:""):v });
  ["site","cap1","cap2","cap3"].forEach(cvShowImg); $("cvSigMem").checked=!!cvPrefs.get().sig; cvSigDraw(); cvGo(step||1) }
$("hubCtrl").onclick=()=>showCtrl();
try{ if(history.state&&(history.state.ctrl||history.state.sim||history.state.prod)&&hubOn()) history.replaceState(null,"") }catch(e){}  // après un rechargement, l'appli repart de l'accueil
$("ctrlBack").onclick=()=>{ if(history.state&&history.state.ctrl) history.back(); else showHub(false) };
$("cvNew").onclick=async()=>{ const d=await cvDB.get("draft"); if(d&&d.f&&(d.f.devis||d.f.societe||d.f.vt1)&&!d.example&&!confirmCv()) return; const n=cvNewDraft(); cvDB.set("draft",n); cvOpen(n,1) };
function confirmCv(){ return window.confirm("Un constat est en cours sur cet appareil. Le remplacer par un nouveau constat vierge ?") }
$("cvDemo").onclick=async()=>{ const cur=await cvDB.get("draft"); if(cur&&cur.f&&(cur.f.devis||cur.f.societe||cur.f.vt1)&&!cur.example&&!confirmCv()) return;
  const d=cvNewDraft(); d.example=true; Object.assign(d.f,{devis:"1234567",lieu:"Déversoir d'orage DO-12, rue de l'Exemple, 00000 Ville-Test",societe:"Communauté de Communes X",adresse:"1 place de la Mairie",cp:"00000",ville:"Ville-Test",contact:"Monsieur X",tel:"",mail:"",type:"RAVEN-EYE 2",serie:"RE-000000",
    ouvrage:"Il s'agit d'un profil rectangulaire. Point de mesure réglementaire de type A2 (déversoir en tête de station).",
    config:"Le RAVEN-EYE est installé dans le sens amont et est raccordé sur un automate en Modbus RS485.\nLa communication entre le débitmètre et l'automate est fonctionnelle.\nLe contrôle des différents organes constituant le débitmètre (RAVEN-EYE, câble, support) montre qu'ils sont en bon état.",
    vt1:"0,70",r1a:"0,72",r1b:"0,72",r1c:"0,70",vt2:"0,50",r2a:"0,48",r2b:"0,47",r2c:"0,47",vt3:"0,35",r3a:"0,36",r3b:"0,35",r3c:"0,35"});
  if(!d.f.interv) d.f.interv="Prénom NOM"; cvDB.set("draft",d); cvOpen(d,1); toast("Exemple chargé : données fictives, modifiables") };
// ---- navigation entre étapes
$("cvDots").innerHTML=CV_STEPS.map((l,i)=>`<li><button type="button" data-go="${i+1}">${i+1}. ${l}</button></li>`).join("");
$("cvDots").onclick=e=>{ const b=e.target.closest("[data-go]"); if(b) cvGo(+b.dataset.go) };
$("cvPrev").onclick=()=>cvGo(CV.step-1);
$("cvNext").onclick=()=>cvGo(CV.step+1);
function cvGo(n){ n=Math.max(1,Math.min(CV_STEPS.length,n)); CV.step=n;
  document.querySelectorAll("#cvForm .cv-step").forEach(fs=>fs.hidden=+fs.dataset.step!==n);
  $("cvStepLab").textContent=CV_STEPS[n-1]; $("cvStepN").textContent=`Étape ${n} sur ${CV_STEPS.length}`; $("cvBarFill").style.width=(n/CV_STEPS.length*100)+"%";
  document.querySelectorAll("#cvDots button").forEach((b,i)=>{ if(i+1===n) b.setAttribute("aria-current","step"); else b.removeAttribute("aria-current"); b.classList.toggle("done",cvStepDone(i+1)) });
  $("cvPrev").hidden=n===1; $("cvNext").hidden=n===CV_STEPS.length; $("cvNext").textContent=n===CV_STEPS.length-1?"Récapitulatif":"Suivant";
  cvLive(); if(n===9) requestAnimationFrame(cvSigDraw); if(n===10) cvSummary(); cvSave(); window.scrollTo({top:0}) }
function cvStepDone(n){ const f=CV.d?CV.d.f:{}; return [()=>/^\d{7}$/.test(f.devis||"")&&f.date&&f.lieu,()=>!!f.societe,()=>!!f.serie,()=>!!(CV.d&&CV.d.img.site)&&!!f.ouvrage,()=>!!f.config,
  ()=>cvReg(f,1).done,()=>cvReg(f,2).done,()=>cvReg(f,3).done,()=>!!f.interv&&!!(CV.d&&CV.d.img.sig),()=>false][n-1]() }
// ---- saisie
$("cvForm").addEventListener("input",e=>{ const el=e.target.closest("[data-k]"); if(!el||!CV.d) return;
  if(el.dataset.k==="devis") el.value=el.value.replace(/\D/g,"").slice(0,7);
  CV.d.f[el.dataset.k]=el.value; if(el.dataset.k==="interv"&&$("cvSigMem").checked) cvPrefs.set({interv:el.value});
  if(/^banc/.test(el.dataset.k)) cvPrefs.set({[el.dataset.k]:el.value}); cvLive(); cvSave() });
$("cvForm").addEventListener("change",e=>{ const el=e.target.closest("[data-k]"); if(el&&CV.d){ CV.d.f[el.dataset.k]=el.value; cvLive(); cvSave() } });
$("cvForm").addEventListener("submit",e=>e.preventDefault());
function cvLive(){ if(!CV.d) return; const f=CV.d.f; const no=cvNo(f);
  $("cvNo").textContent=no||(f.devis?`${f.devis.length}/7 chiffres`:"–"); $("cvNext1").textContent=cvLong(cvDate(f.date,1));
  [1,2,3].forEach(n=>{ const r=cvReg(f,n), box=$("cvRes"+n);
    if(!r.done){ box.className="cv-res"; box.innerHTML=(r.vt>0||r.rs.some(x=>x>=0))?`<span>Renseignez Vtrack et les 3 mesures Vraw pour calculer l'écart.</span>`:""; return }
    box.className="cv-res "+(r.ok?"ok":"ko");
    box.innerHTML=`<span>Vraw retenu <b>${nf(r.vr,3)} m/s</b></span><span>Écart <b>${cvPct(r.e)}</b></span><span class="cv-v">${r.ok?"OK":"HORS TOLÉRANCE"}</span>` }) }
// ---- images (photo du point de mesure, captures Fuzion)
function cvLoadImg(file,max){ return new Promise((res,rej)=>{ const u=URL.createObjectURL(file), im=new Image();
  im.onload=()=>{ let w=im.naturalWidth,h=im.naturalHeight; const k=Math.min(1,(max||1800)/Math.max(w,h)); w=Math.round(w*k); h=Math.round(h*k);
    const c=document.createElement("canvas"); c.width=w; c.height=h; const g=c.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0,0,w,h); g.drawImage(im,0,0,w,h); URL.revokeObjectURL(u);
    res({data:c.toDataURL("image/jpeg",0.88),w,h}) };
  im.onerror=()=>{ URL.revokeObjectURL(u); rej(new Error("image illisible")) }; im.src=u }) }
function cvShowImg(k){ const box=document.querySelector(`.cv-photo[data-img="${k}"]`), im=CV.d&&CV.d.img[k];
  box.querySelector(".cv-ph-empty").hidden=!!im; box.querySelector(".cv-ph-full").hidden=!im; if(im) box.querySelector("img").src=im.data }
$("cvForm").addEventListener("change",async e=>{ const inp=e.target.closest("[data-pick]"); if(!inp||!inp.files||!inp.files[0]||!CV.d) return;
  const k=inp.dataset.pick; try{ CV.d.img[k]=await cvLoadImg(inp.files[0],k==="site"?1600:1800); cvShowImg(k); cvSave() }catch(err){ toast("Image illisible : choisissez un fichier JPEG ou PNG.") } inp.value="" });
$("cvForm").addEventListener("click",e=>{ const b=e.target.closest("[data-drop]"); if(!b||!CV.d) return; delete CV.d.img[b.dataset.drop]; cvShowImg(b.dataset.drop); cvSave() });
// ---- signature
const cvSc=$("cvSig"), cvSg=cvSc.getContext("2d"); let cvDraw=null;
function cvSigDraw(){ cvSg.clearRect(0,0,cvSc.width,cvSc.height); const s=CV.d&&CV.d.img.sig; $("cvSigHint").hidden=!!s;
  if(s){ const im=new Image(); im.onload=()=>cvSg.drawImage(im,0,0,cvSc.width,cvSc.height); im.src=s.data } }
const cvPos=e=>{ const r=cvSc.getBoundingClientRect(); return [(e.clientX-r.left)*cvSc.width/r.width,(e.clientY-r.top)*cvSc.height/r.height] };
cvSc.addEventListener("pointerdown",e=>{ cvDraw={p:cvPos(e),moved:false}; try{ cvSc.setPointerCapture(e.pointerId) }catch(_){} $("cvSigHint").hidden=true; e.preventDefault() });
cvSc.addEventListener("pointermove",e=>{ if(!cvDraw) return; const p=cvPos(e); cvSg.lineWidth=4; cvSg.lineCap="round"; cvSg.lineJoin="round"; cvSg.strokeStyle="#10233F";
  cvSg.beginPath(); cvSg.moveTo(...cvDraw.p); cvSg.lineTo(...p); cvSg.stroke(); cvDraw.p=p; cvDraw.moved=true });
const cvSigEnd=()=>{ if(!cvDraw) return; const mv=cvDraw.moved; cvDraw=null; if(!mv||!CV.d) return;
  CV.d.img.sig={data:cvSc.toDataURL("image/png"),w:cvSc.width,h:cvSc.height}; if($("cvSigMem").checked) cvPrefs.set({sig:CV.d.img.sig,interv:CV.d.f.interv||""}); cvSave() };
cvSc.addEventListener("pointerup",cvSigEnd); cvSc.addEventListener("pointercancel",cvSigEnd);
$("cvSigClear").onclick=()=>{ if(!CV.d) return; delete CV.d.img.sig; cvSigDraw(); if($("cvSigMem").checked) cvPrefs.set({sig:null}); cvSave() };
$("cvSigMem").onchange=()=>{ if($("cvSigMem").checked) cvPrefs.set({sig:CV.d&&CV.d.img.sig||null,interv:CV.d&&CV.d.f.interv||""}); else cvPrefs.set({sig:null,interv:""}) };
// ---- récapitulatif
function cvMissing(f,img){ const block=[], warn=[];
  if(!/^\d{7}$/.test(f.devis||"")) block.push("le numéro de devis (7 chiffres)"); if(!cvDate(f.date)) block.push("la date de l'intervention");
  if(!f.societe) block.push("la société du client"); if(!f.lieu) block.push("le lieu du contrôle");
  [1,2,3].forEach(n=>{ if(!cvReg(f,n).done) block.push(`les vitesses du réglage ${n}`) });
  if(!f.serie) warn.push("Numéro de série de l'instrument non renseigné"); if(!img.site) warn.push("Photo du point de mesure absente");
  [1,2,3].forEach(n=>{ if(!img["cap"+n]) warn.push(`Capture Fuzion du réglage ${n} absente`) });
  if(!f.ouvrage) warn.push("Description de l'ouvrage vide"); if(!f.config) warn.push("Configuration de l'équipement vide");
  if(!f.interv) warn.push("Nom de l'intervenant absent"); if(!img.sig) warn.push("Signature absente");
  return {block,warn} }
function cvSummary(){ const f=CV.d.f, A=cvAll(f), M=cvMissing(f,CV.d.img), no=cvNo(f);
  $("cvSum").innerHTML=`<div class="cv-sum">
    <div class="cv-sum-id"><span>Constat N°</span><b>${esc(no||"–")}</b><span>Client</span><b>${esc(f.societe||"–")}</b><span>Lieu</span><b>${esc(f.lieu||"–")}</b><span>Intervention</span><b>${cvLong(cvDate(f.date))}</b><span>Prochaine inspection</span><b>${cvLong(cvDate(f.date,1))}</b></div>
    <div class="cv-tabw"><table class="cv-tab"><thead><tr><th>Réglage</th><th>Vtrack (m/s)</th><th>Vraw (m/s)</th><th>Écart</th><th>Résultat</th></tr></thead><tbody>
    ${A.R.map((r,i)=>`<tr><td>${i+1}</td><td>${r.vt>0?nf(r.vt,2):"–"}</td><td>${r.done?nf(r.vr,3):"–"}</td><td class="${r.done?(r.ok?"ok":"ko"):""}">${r.done?cvPct(r.e):"–"}</td><td class="${r.done?(r.ok?"ok":"ko"):""}">${r.done?(r.ok?"OK":"Hors tolérance"):"à compléter"}</td></tr>`).join("")}
    </tbody></table></div>
    ${A.done?`<p class="cv-mean">Écart moyen sur le contrôle de vitesse : <b class="${Math.abs(A.mean)<=CV_TOL?"ok":"ko"}">${cvPct(A.mean)}</b> (tolérance ± ${CV_TOL} %)</p>
    <div class="cv-verdict ${A.ok?"":"ko"}"><span>Instrument</span><span><b>${A.ok?"CONFORME":"NON CONFORME"}</b><br><small>aux spécifications requises</small></span></div>`:""}
    ${M.block.length?`<p class="cv-err">Pour générer le rapport, il manque : ${M.block.join(", ")}.</p>`:""}
    ${M.warn.length?`<ul class="cv-warn">${M.warn.map(w=>`<li>${w}</li>`).join("")}</ul>`:""}
    <div class="cv-end"><button type="button" class="cv-btn big" id="cvPdf" ${M.block.length?"disabled":""}>Générer le rapport PDF</button>
    <button type="button" class="cv-btn ghost" id="cvDone">Terminer et revenir à l'accueil</button></div></div>`;
  $("cvPdf").onclick=cvExport; $("cvDone").onclick=()=>{ if(history.state&&history.state.ctrl) history.back(); else showHub(false) } }
async function cvExport(){ const b=$("cvPdf"); b.disabled=true; b.textContent="Création du rapport…";
  try{ const f=CV.d.f; const blob=await cvBuildPdf(CV.d); const name=`Constat de vérification RAVEN-EYE ${cvNo(f)}${f.societe?" - "+f.societe.replace(/[\\/:*?"<>|]/g,"").trim():""}.pdf`;
    const file=new File([blob],name,{type:"application/pdf"});
    if(matchMedia("(pointer:coarse)").matches&&navigator.canShare&&navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file],title:name}) }catch(e){ if(!e||e.name!=="AbortError") await saveFile(name,blob) } }
    else await saveFile(name,blob) }
  catch(e){ console.error(e); toast("Rapport impossible : "+e.message) }
  b.disabled=false; b.textContent="Générer le rapport PDF" }
// ---- rapport PDF (mise en page COMETEC)
function cvImgSize(src){ return new Promise(res=>{ const im=new Image(); im.onload=()=>res({w:im.naturalWidth,h:im.naturalHeight}); im.onerror=()=>res({w:3,h:1}); im.src=src }) }
async function cvBuildPdf(D){
  const {jsPDF}=window.jspdf; const f=D.f, img=D.img, A=cvAll(f), no=cvNo(f);
  const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait",compress:true}); const W=210,H=297,M=18,CW=W-2*M, TOP=34, BOT=262;
  const ARD=[26,77,77], RED=[227,0,11], INK=[25,25,25], MUT=[95,108,108], OKC=[24,135,66], KOC=[200,16,46];
  const T=(s,x,y,o)=>doc.text(pdfTxt(s),x,y,o);
  const set=(sz,st,col)=>{ doc.setFont("helvetica",st||"normal"); doc.setFontSize(sz); doc.setTextColor(...(col||INK)) };
  const pct=e=>cvPct(e,"-");
  const logoSrc=document.querySelector("#ctrl .sim-logo").src, ls=await cvImgSize(logoSrc);
  let y=TOP;
  const newPage=()=>{ doc.addPage(); y=TOP };
  const need=h=>{ if(y+h>BOT) newPage() };
  const section=(t,x,w)=>{ x=x||M; w=w||CW; need(14); set(12,"bold",ARD); T(t,x,y); doc.setDrawColor(...RED); doc.setLineWidth(0.5); doc.line(x,y+2,x+w,y+2); y+=8.5 };
  const para=(t,x,w,o)=>{ x=x||M; w=w||CW; o=o||{}; set(o.sz||10,o.st||"normal",o.col||INK); const L=doc.splitTextToSize(pdfTxt(t),w); for(const l of L){ need(5.2); doc.text(l,x,y); y+=5 } y+=o.gap==null?2:o.gap };
  const rows=(R,lw)=>{ lw=lw||52; for(const [a,b,col] of R){ const L=doc.splitTextToSize(pdfTxt(b||""),CW-lw); need(L.length*5+1.5); set(10,"normal",MUT); T(a,M,y); set(10,"bold",col||INK); doc.text(L,M+lw,y); y+=Math.max(6,L.length*5+1) } y+=3 };
  const image=(im,x,w,maxH)=>{ let h=w*im.h/im.w; if(h>maxH){ h=maxH; w=h*im.w/im.h } doc.addImage(im.data,"JPEG",x,y,w,h); return {w,h} };
  // ---------- page 1
  section("Délivré à");
  rows([["Société :",f.societe],["Adresse :",f.adresse],["CP / Ville :",[f.cp,f.ville].filter(Boolean).join(" ")],["Contact :",f.contact],["Téléphone :",f.tel],["Mail :",f.mail]].filter((r,i)=>i===0||r[1]));
  section("Dossier");
  rows([["Constat de vérification N° :",no],["N° de devis :",f.devis],["Date d'intervention :",cvLong(cvDate(f.date))],["Lieu du contrôle :",f.lieu],["Prochaine inspection suggérée :",cvLong(cvDate(f.date,1)),RED]],58);
  section("Instrument vérifié");
  rows([["Désignation :","Débitmètre RAVEN-EYE"],["Constructeur :","Flow-Tronic"],["Type :",f.type||"RAVEN-EYE"],["Numéro de série :",f.serie||"Non communiqué"],["Référence interne :",f.refint]].filter((r,i)=>i<4||r[1]));
  section("Référence de la procédure");
  para("Ce document ne peut pas être utilisé en lieu et place d'un certificat d'étalonnage. Ce document est réalisé suivant les recommandations du fascicule de documentation X 07-011 définissant le constat de vérification.");
  para(`La procédure de vérification est effectuée au moyen d'un système de contrôle par bande roulante RAV-TRACK N° ${f.bancN||"001"}${f.bancCtrl?`, contrôlé le ${f.bancCtrl}`:""}.`);
  // ---------- page 2 : ouvrage, configuration, méthode
  newPage();
  const y0=y; let yImg=y0;
  if(img.site){ const s=image(img.site,M,66,92); yImg=y0+s.h; }
  const tx=img.site?M+72:M, tw=img.site?CW-72:CW;
  section("Ouvrage et conditions hydrauliques",tx,tw); para(f.ouvrage||"Non renseigné.",tx,tw,{gap:4});
  section("Configuration de l'équipement mis en place",tx,tw); for(const l of String(f.config||"Non renseignée.").split(/\n+/)) para(l,tx,tw,{gap:2.5});
  y=Math.max(y,yImg)+8;
  section(`Outil de contrôle : banc d'étalonnage RAV-TRACK N° ${f.bancN||"001"}`);
  rows([["N° de série :",f.bancSerie],["Date de fabrication :",f.bancFab],["Dernier contrôle du banc :",f.bancCtrl]].filter(r=>r[1]),56);
  section("Mesures comparatives");
  para("Nous effectuons une comparaison sur la vitesse brute de surface.");
  para("La vitesse du RAVEN-EYE relevée sur le logiciel Fuzion « Vraw » (moyenne de 3 mesures successives) est comparée à la vitesse affichée sur la console de la bande roulante RAV-TRACK « Vtrack ».");
  para("Le calcul de l'écart est : (Vraw - ((Vtrack + Vraw) / 2)) / ((Vtrack + Vraw) / 2) × 100.");
  para(`L'écart maximum toléré est de ± ${CV_TOL} %.`,M,CW,{st:"bold"});
  // ---------- réglages
  newPage(); section("Contrôle du capteur de vitesse");
  A.R.forEach((r,i)=>{ const cap=img["cap"+(i+1)]; const ih=cap?Math.min(CW*cap.h/cap.w,70):0; need(34+ih);
    set(10.5,"bold",INK); T(`Réglage ${i+1} :`,M,y); y+=5.6;
    const line=(a,b,col,bold)=>{ set(10,"normal",INK); T(a,M,y); const w=doc.getTextWidth(pdfTxt(a)); set(10,bold?"bold":"normal",col||INK); T(b,M+w+2.2,y); y+=5.2 };
    line("Vitesse indiquée par le banc RAV-TRACK, Vtrack :",`${nf(r.vt,2)} m/s`);
    line("Vitesses brutes relevées sur Fuzion, Vraw :",r.rs.map(v=>nf(v,2)).join(" / ")+" m/s");
    line("Vitesse moyenne indiquée par le RAVEN-EYE, Vraw :",`${nf(r.vr,3)} m/s`);
    line("Écart constaté :",pct(r.e),r.ok?INK:KOC,true);
    line("Conclusion :",r.ok?"OK":"HORS TOLÉRANCE",r.ok?OKC:KOC,true);
    y+=1.5; if(cap){ const s=image(cap,M,CW,70); y+=s.h } y+=9 });
  // ---------- résultats et conclusion
  need(62); section("Résultats obtenus");
  { const cols=[["Réglage",18],["Vtrack",24],["Vraw (3 mesures)",42],["Vraw retenu",26],["Écart",22],["Conclusion",CW-132]]; let x=M;
    doc.setFillColor(...ARD); doc.rect(M,y-4.6,CW,7,"F"); set(9,"bold",[255,255,255]); for(const [l,w] of cols){ T(l,x+2,y); x+=w } y+=7;
    A.R.forEach((r,i)=>{ x=M; const v=[String(i+1),nf(r.vt,2)+" m/s",r.rs.map(v=>nf(v,2)).join(" / "),nf(r.vr,3)+" m/s",pct(r.e),r.ok?"OK":"Hors tolérance"];
      v.forEach((t,j)=>{ const c=(j>=4)?(r.ok?(j===5?OKC:INK):KOC):INK; set(9.5,j>=4?"bold":"normal",c); T(t,x+2,y); x+=cols[j][1] });
      doc.setDrawColor(200,212,212); doc.setLineWidth(0.25); doc.line(M,y+2.6,M+CW,y+2.6); y+=7.2 }); y+=4 }
  { set(10.5,"normal",INK); const a="Nous constatons que l'écart moyen sur le contrôle de vitesse est de : "; T(a,M,y); set(10.5,"bold",Math.abs(A.mean)<=CV_TOL?OKC:KOC); T(pct(A.mean),M+doc.getTextWidth(pdfTxt(a.trim()))+2.4,y); y+=8 }
  para(A.ok?"Le RAVEN-EYE fonctionne correctement.":`Au moins un réglage présente un écart supérieur à la tolérance de ± ${CV_TOL} %.`,M,CW,{gap:6});
  need(70); section("Conclusion");
  set(10.5,"normal",INK); T("État de l'instrument :",M,y); y+=6;
  doc.setFillColor(...(A.ok?ARD:KOC)); doc.roundedRect(M+20,y,CW-40,16,2,2,"F");
  set(11,"normal",[255,255,255]); T("INSTRUMENT :",M+30,y+9.6); set(13,"bold",[255,255,255]); T(A.ok?"CONFORME":"NON CONFORME",M+20+(CW-40)*0.66,y+7.6,{align:"center"});
  set(9.5,"bold",[255,255,255]); T("aux spécifications requises",M+20+(CW-40)*0.66,y+12.6,{align:"center"}); y+=26;
  set(10.5,"normal",INK); T("Intervenant :",M,y); set(10.5,"bold",INK); T(f.interv||"",M+26,y); y+=8;
  set(10.5,"normal",INK); T("Signature :",M,y);
  if(img.sig){ doc.addImage(img.sig.data,"PNG",M+26,y-4,60,20,"cvsig","FAST") }
  // ---------- en-têtes et pieds sur toutes les pages
  const N=doc.getNumberOfPages(), lh=15, lw=lh*ls.w/ls.h;
  for(let p=1;p<=N;p++){ doc.setPage(p);
    doc.addImage(logoSrc,"PNG",M-2,9,lw,lh,"cvlogo","FAST");
    set(10.5,"normal",RED); T(`Constat de vérification N° ${no}`,W-M,15,{align:"right"}); T(`Date de l'intervention : ${cvLong(cvDate(f.date))}`,W-M,20.5,{align:"right"});
    if(D.example){ set(8.5,"bold",RED); T("EXEMPLE - DONNÉES FICTIVES",W-M,26,{align:"right"}) }
    set(8.5,"italic",MUT); T(`Page ${p} sur ${N}`,W-M,H-23,{align:"right"});
    doc.setFillColor(...ARD); doc.rect(0,H-18,W,18,"F"); set(8.5,"normal",[255,255,255]);
    T("COMETEC • Service technique • 9 bis, rue du Général Leclerc • 94520 MANDRES-LES-ROSES",W/2,H-11,{align:"center"});
    T("Tél : 01 48 90 40 79 • Fax : 01 48 90 41 02 • Mail : contact@cometec.fr • Web : www.cometec.fr",W/2,H-6,{align:"center"}) }
  doc.setProperties({title:`Constat de vérification RAVEN-EYE N° ${no}`,author:"COMETEC",subject:f.lieu||"",creator:"Application COMETEC"});
  return doc.output("blob") }

/* ---------- Contacter votre commercial : département → commercial, carte des secteurs ---------- */
const FRDEP=%%FRDEP%%;
const CT_COM={
  hugo:{n:"Hugo SACCANI",ini:"HS",reg:"Rhône-Alpes & Grand Est",tel:"06 02 53 93 16",mail:"hugo.saccani@cometec.fr",col:"#047876",
    d:"01 03 08 10 21 25 38 39 42 51 52 54 55 57 58 63 67 68 69 70 71 73 74 88 89 90"},
  olivier:{n:"Olivier PAILLARD",ini:"OP",reg:"Sud-Est & Export",tel:"06 49 90 51 38",mail:"olivier.paillard@cometec.fr",col:"#6B778D",
    d:"04 05 06 07 11 12 13 15 26 30 34 43 48 66 83 84 2A 2B"},
  alexis:{n:"Alexis CROZATIER",ini:"AC",reg:"Sud-Ouest & Outre-mer",tel:"07 56 01 20 67",mail:"alexis.crozatier@cometec.fr",col:"#5AA9A6",
    d:"09 16 17 19 23 24 31 32 33 40 46 47 64 65 79 81 82 85 86 87 971 972 973 974 975 976 977 978 984 986 987 988"},
  benoit:{n:"Benoît PARIS",ini:"BP",reg:"Nord-Ouest & Île-de-France",tel:"06 43 30 29 60",mail:"benoit.paris@cometec.fr",col:"#487CA7",
    d:"02 14 18 22 27 28 29 35 36 37 41 44 45 49 50 53 56 59 60 61 62 72 75 76 77 78 80 91 92 93 94 95"}};
const CT_ROLE="Ingénieur technico-commercial";
const CT_ORDER=["benoit","hugo","alexis","olivier"];
const CT_DEP={}; for(const k in CT_COM) CT_COM[k].d.split(" ").forEach(c=>CT_DEP[c]=k);
const CT_DOM={"971":"Guadeloupe","972":"Martinique","973":"Guyane","974":"La Réunion","975":"Saint-Pierre-et-Miquelon","976":"Mayotte","977":"Saint-Barthélemy","978":"Saint-Martin","984":"Terres australes","986":"Wallis-et-Futuna","987":"Polynésie française","988":"Nouvelle-Calédonie"};
let ctBuilt=false, ctPushed=false;
function ctName(c){ return (FRDEP.n&&FRDEP.n[c])||CT_DOM[c]||"" }
function ctBuild(){ if(ctBuilt) return; ctBuilt=true;
  const W=FRDEP.w, H=FRDEP.h, dom=[["971","Guadeloupe"],["972","Martinique"],["973","Guyane"],["974","Réunion"],["976","Mayotte"]];
  let svg=`<svg viewBox="-4 -4 ${W+8} ${H+8}" xmlns="http://www.w3.org/2000/svg">`;
  for(const c in FRDEP.d){ const k=CT_DEP[c]; svg+=`<path d="${FRDEP.d[c]}" data-d="${c}" fill="${k?CT_COM[k].col:"#B8C4C4"}"><title>${c} · ${esc(ctName(c))}</title></path>` }
  svg+=`<g class="dom" transform="translate(4 ${H-150})">`+dom.map(([c,n],i)=>`<g data-d="${c}" transform="translate(0 ${i*30})"><rect width="22" height="22" rx="5" fill="${CT_COM.alexis.col}" data-d="${c}"><title>${c} · ${n}</title></rect><text x="28" y="15">${n}</text></g>`).join("")+`</g></svg>`;
  $("ctMap").innerHTML=svg;
  $("ctLeg").innerHTML=CT_ORDER.map(k=>`<li><button type="button" data-k="${k}"><i style="background:${CT_COM[k].col}"></i><span><b>${CT_COM[k].n}</b><br>${CT_COM[k].reg}</span></button></li>`).join("");
  $("ctMap").addEventListener("click",e=>{ const el=e.target.closest("[data-d]"); if(!el) return; const d=el.dataset.d; if(CT_DEP[d]) ctShowCom(CT_DEP[d],d) });
  $("ctLeg").addEventListener("click",e=>{ const b=e.target.closest("[data-k]"); if(b) ctShowCom(b.dataset.k,null) });
}
function ctHighlight(k,dep){ const m=$("ctMap"); m.classList.toggle("sel",!!k); if(dep){ const sel=m.querySelector(`path[data-d="${dep}"]`); if(sel) sel.parentNode.insertBefore(sel,m.querySelector("g.dom")) }
  m.querySelectorAll("path,rect").forEach(p=>{ const kk=CT_DEP[p.dataset.d]; p.classList.toggle("on",!!k&&kk===k); p.classList.toggle("me",!!dep&&p.dataset.d===dep) }) }
function ctShowCom(k,dep){ const c=CT_COM[k]; if(!c) return;
  $("ctAv").textContent=c.ini; $("ctAv").style.background=c.col; $("ctName").textContent=c.n; $("ctRole").textContent=CT_ROLE;
  $("ctReg").textContent=c.reg+(dep?` · votre département : ${dep}${ctName(dep)?" "+ctName(dep):""}`:"");
  const tel="+33"+c.tel.replace(/\s/g,"").slice(1);
  $("ctCall").href="tel:"+tel; $("ctTel").textContent=c.tel;
  $("ctMail").href=`mailto:${c.mail}?subject=${encodeURIComponent("Demande depuis l'application COMETEC")}`; $("ctMailT").textContent=c.mail;
  $("ctHint").hidden=true; const card=$("ctCard"); card.hidden=false; card.style.animation="none"; void card.offsetWidth; card.style.animation="";
  ctHighlight(k,dep); $("contact").querySelector(".ct-in").scrollTo({top:0,behavior:"smooth"}) }
function ctReset(){ $("ctCard").hidden=true; $("ctHint").hidden=false; ctHighlight(null,null) }
function openContact(){ ctBuild(); const dl=$("contact"); if(dl.open) return;
  ctReset(); dl.querySelector(".ct-in").scrollTo(0,0);  /* rien n'est mémorisé : on retrouve son secteur à chaque fois */
  try{ dl.showModal() }catch(e){ dl.setAttribute("open","") }
  try{ history.pushState(Object.assign({},history.state||{},{contact:1}),""); ctPushed=true }catch(e){}
  $("ctClose").focus() }
function closeContact(fromPop){ const dl=$("contact"); if(dl.open) dl.close(); if(!fromPop&&ctPushed&&history.state&&history.state.contact){ ctPushed=false; history.back() } else ctPushed=false }
document.addEventListener("click",e=>{ if(e.target.closest("[data-contact]")) openContact() });
$("ctClose").onclick=()=>closeContact(false);
$("contact").addEventListener("cancel",e=>{ e.preventDefault(); closeContact(false) });
$("contact").addEventListener("click",e=>{ if(e.target===$("contact")) closeContact(false) });
$("ctExport").onclick=()=>{ ctShowCom("olivier",null); $("ctReg").textContent="Sud-Est & Export · clients hors de France" };
addEventListener("popstate",()=>{ if($("contact").open&&!(history.state&&history.state.contact)) closeContact(true) });
