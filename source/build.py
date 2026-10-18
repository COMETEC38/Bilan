import base64, json, sys
VERSION='2.8.1'
import re, os, json, secrets, hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
# ---- Espace COMETEC : le module « constat RAVEN-EYE » est chiffré avec le code d'accès (jamais publié en clair)
_APP=open('app.js').read(); _SRC=open('src.html').read()
_mj=re.search(r'/\*CV-BEGIN\*/(.*?)/\*CV-END\*/',_APP,re.S); _mh=re.search(r'<!--CV-BEGIN-->(.*?)<!--CV-END-->',_SRC,re.S)
_code=os.environ.get('CV_CODE') or open('.cv_code').read().strip()
_norm=re.sub('[^A-Z0-9]','',_code.upper()); assert len(_norm)>=8, "code d'accès trop court"
_salt=secrets.token_bytes(16); _iv=secrets.token_bytes(12); _N=250000
_key=hashlib.pbkdf2_hmac('sha256',_norm.encode(),_salt,_N,32)
_ct=AESGCM(_key).encrypt(_iv,json.dumps({"html":_mh.group(1),"js":_mj.group(1)},ensure_ascii=False).encode(),None)
_b=lambda x: base64.b64encode(x).decode()
CV_LOCK=json.dumps({"s":_b(_salt),"i":_b(_iv),"n":_N,"d":_b(_ct)})
APP_PUB=_APP.replace(_mj.group(0),'/* module Espace COMETEC chiffré : voir CV_LOCK */'); SRC_PUB=_SRC.replace(_mh.group(0),'')
assert 'cvBuildPdf' not in APP_PUB and 'cvStartScreen' not in APP_PUB and 'id="cvWiz"' not in SRC_PUB
open('dist/app_public.js','w').write(APP_PUB); open('dist/src_public.html','w').write(SRC_PUB)   # sources publiées dans le dépôt (sans le module en clair)
s=SRC_PUB.replace('%%VERSION%%',VERSION).replace('%%APP%%',APP_PUB.replace('%%CV_LOCK%%',CV_LOCK)).replace('%%DEMO%%',open('demo.json').read())
logo='data:image/png;base64,'+base64.b64encode(open('logo_new.png','rb').read()).decode()
for _k in ['base','wave','o']: s=s.replace('%%HUB_'+_k.upper()+'%%','data:image/png;base64,'+base64.b64encode(open('hub/l_'+_k+'.png','rb').read()).decode())  # logo d'accueil en 3 calques animés
import os
ex=open('example.json').read() if os.path.exists('example.json') else 'null'  # exemple facultatif (données client, non publié)
s0=s.replace('%%LOGO%%',logo).replace('%%EXAMPLE%%','null')
s=s.replace('%%LOGO%%',logo).replace('%%EXAMPLE%%','null')  # plus de données client : la démo SITE TEST les remplace
cdn=('<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"></script>\n'
     '<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>\n'
     '<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>\n'
     '<script src="https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js"></script>')
open('dist/artifact.html','w').write(s.replace('%%LIBS%%',cdn))
def inline(path):
    js=open(path).read().replace('</script','<\\/script')
    return '<script>'+js+'</script>'
libs=inline('node_modules/echarts/dist/echarts.min.js')+'\n'+inline('node_modules/jszip/dist/jszip.min.js')+'\n'+inline('node_modules/jspdf/dist/jspdf.umd.min.js')+'\n'+inline('node_modules/exceljs/dist/exceljs.min.js')
body=s.replace('%%LIBS%%',libs)
fav='data:image/png;base64,'+base64.b64encode(open('favicon-64.png','rb').read()).decode()
head='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" type="image/png" href="'+fav+'"><style>:root{color-scheme:light dark}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style></head><body>'
open('dist/COMETEC_Bilan_exemple.html','w').write(head+body+'</body></html>')
open('dist/COMETEC_Bilan.html','w').write(head+s0.replace('%%LIBS%%',libs)+'</body></html>')
print('ok')

# ---------- Version web installable (à déposer sur un site en HTTPS) ----------
import os, shutil, json, hashlib
web='dist/web'; shutil.rmtree(web,ignore_errors=True); os.makedirs(web+'/icons')
for f in ['icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','favicon-64.png']: shutil.copy(f,web+'/icons/'+f)
whead=('<!doctype html><html lang="fr"><head><meta charset="utf-8">'
 '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
 '<meta name="theme-color" content="#1A4D4D"><meta name="description" content="COMETEC Bilan : traitement des bilans des débitmètres portables BUL\'R2">'
 '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" type="image/png" href="icons/favicon-64.png">'
 '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">'
 '<style>:root{color-scheme:light dark}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style></head><body>')
open(web+'/index.html','w').write(whead+s0.replace('%%LIBS%%',libs)+'</body></html>')
manifest={"name":"COMETEC Bilan","short_name":"COMETEC Bilan","description":"Traitement des bilans pour débitmètres portables BUL'R2","lang":"fr","start_url":"./","scope":"./","display":"standalone","background_color":"#F2F5F5","theme_color":"#1A4D4D",
 "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icons/icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}],
 "file_handlers":[{"action":"./","accept":{"text/csv":[".csv"],"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":[".xlsx"]}}]}
open(web+'/manifest.webmanifest','w').write(json.dumps(manifest,ensure_ascii=False,indent=2))
h=hashlib.sha1(open(web+'/index.html','rb').read()).hexdigest()[:8]
sw=f"""// COMETEC Bilan {VERSION} – fonctionnement hors ligne
const CACHE='cometec-bilan-{VERSION}-{h}';
const FILES=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png','icons/favicon-64.png'];
self.addEventListener('install',e=>{{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())) }});
self.addEventListener('activate',e=>{{ e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim())) }});
// réseau d'abord (pour avoir toujours la dernière version), cache si pas d'Internet
self.addEventListener('fetch',e=>{{ if(e.request.method!=='GET') return;
  const same=new URL(e.request.url).origin===location.origin;
  // même origine : toujours revalider auprès du serveur (pas de copie en cache HTTP), pour recevoir les mises à jour tout de suite
  const req=same?new Request(e.request.url,{{cache:'no-cache',credentials:'same-origin'}}):e.request;
  e.respondWith(fetch(req).then(r=>{{ const copy=r.clone(); if(r.ok&&new URL(e.request.url).origin===location.origin) caches.open(CACHE).then(c=>c.put(e.request,copy)); return r }}).catch(()=>caches.match(e.request,{{ignoreSearch:true}}).then(r=>r||caches.match('index.html')))) }});
"""
open(web+'/sw.js','w').write(sw)
shutil.copy('LISEZMOI_web.txt',web+'/LISEZMOI.txt')
shutil.copytree('docs',web+'/docs')
os.makedirs(web+'/lib/pdfjs',exist_ok=True)  # lecteur PDF (chargé seulement à l'ouverture d'une documentation sur téléphone)
for _f in ['pdf.min.js','pdf.worker.min.js']: shutil.copy('node_modules/pdfjs-dist/legacy/build/'+_f,web+'/lib/pdfjs/'+_f)  # documentations PDF (rubrique « Nos produits »), servies à côté de l'application
print('web ok',VERSION,h)
