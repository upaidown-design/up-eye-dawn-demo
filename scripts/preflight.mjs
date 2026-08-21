import{access,readFile,statfs}from'node:fs/promises';
import{resolve}from'node:path';
import{execFileSync}from'node:child_process';
import{createConnection}from'node:net';

const root=resolve(import.meta.dirname,'..');
const origin=process.env.DEMO_ORIGIN??'http://127.0.0.1:8088';
const checks=[];
const check=async(name,fn)=>{try{const detail=await fn();checks.push({name,status:'READY',detail})}catch(error){checks.push({name,status:'FAIL',detail:error instanceof Error?error.message:String(error)})}};
const jsonFile=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const fetchOk=async path=>{const response=await fetch(`${origin}${path}`,{signal:AbortSignal.timeout(5_000)});if(!response.ok)throw Error(`${response.status} ${response.statusText}`);return response};

await check('Node runtime',async()=>{
  const host=process.versions.node;
  const container=execFileSync('docker',['compose','exec','-T','api','node','--version'],{cwd:root,encoding:'utf8'}).trim();
  if(container!=='v24.18.0')throw Error(`API container expected v24.18.0, found ${container}`);
  return `container ${container}; host ${host}${host==='24.18.0'?'':' (Docker entrypoint does not use host Node)'}`;
});
await check('Docker daemon',async()=>{execFileSync('docker',['info'],{stdio:'ignore'});return'executable and daemon available'});
await check('Containers',async()=>{
  const required=['api','gateway','postgres','redis','worker'];
  const running=execFileSync('docker',['compose','ps','--services','--status','running'],{cwd:root,encoding:'utf8'}).trim().split(/\s+/).filter(Boolean);
  const missing=required.filter(name=>!running.includes(name));if(missing.length)throw Error(`not running: ${missing.join(', ')}`);
  const unhealthy=JSON.parse(`[${execFileSync('docker',['compose','ps','--format','json'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean).join(',')}]`).filter(item=>item.Health&&item.Health!=='healthy');
  if(unhealthy.length)throw Error(`unhealthy: ${unhealthy.map(item=>item.Service).join(', ')}`);return required.join(', ');
});
await check('API health',async()=>{const body=await fetchOk('/api/v1/health').then(r=>r.json());if(body.status!=='ok')throw Error(JSON.stringify(body));return body.classification});
await check('WebSocket',()=>new Promise((resolveCheck,reject)=>{const timer=setTimeout(()=>reject(Error('connection timeout')),5_000);const socket=new WebSocket(`${origin.replace(/^http/,'ws')}/socket.io`);socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.type!=='snapshot')return;clearTimeout(timer);socket.close();resolveCheck('initial snapshot received')});socket.addEventListener('error',()=>{clearTimeout(timer);reject(Error('connection failed'))})}));
await check('Frontend',async()=>{const text=await fetchOk('/demo/preflight').then(r=>r.text());if(!text.includes('id="root"'))throw Error('demo root missing');return'/demo/preflight'});
await check('Investor frontend',async()=>{const text=await fetchOk('/investor/').then(r=>r.text());if(!text.toLowerCase().includes('up-eye-dawn'))throw Error('investor content missing');return'/investor/'});
await check('Scenario file',async()=>{const data=await jsonFile('data/scenarios/new-york-investor-demo-v1.json');if(data.classification!=='SYNTHETIC'||!data.durationSeconds)throw Error('classification or duration missing');return`${data.id} · ${data.durationSeconds}s · SYNTHETIC`});
await check('Farm data',async()=>{const data=await jsonFile('data/farms/demo-farm-alpha.geojson');if(data.type!=='FeatureCollection'||!data.features?.length)throw Error('invalid/empty GeoJSON');return`${data.features.length} feature(s)`});
await check('NDVI fallback',async()=>{const data=await jsonFile('data/ndvi/ndvi-demo.json');if(data.classification!=='SYNTHETIC'||data.fallback!==true)throw Error('fallback is not explicitly synthetic');return'SYNTHETIC fallback=true'});
await check('Visual assets',async()=>{const manifest=await jsonFile('assets/manifest/assets-manifest.json');const paths=manifest.assets.map(asset=>asset.path).filter(path=>path.startsWith('apps/web/public/'));for(const path of paths)await access(resolve(root,path));return`${paths.length} public manifest assets present`});
await check('Disk availability',async()=>{const info=await statfs(root);const free=info.bavail*info.bsize;if(free<2*1024**3)throw Error(`only ${(free/1024**3).toFixed(1)} GiB free`);return`${(free/1024**3).toFixed(1)} GiB free`});
await check('Critical port 8088',()=>new Promise((resolveCheck,reject)=>{const socket=createConnection({host:'127.0.0.1',port:8088});socket.setTimeout(3_000);socket.once('connect',()=>{socket.destroy();resolveCheck('listening')});socket.once('timeout',()=>{socket.destroy();reject(Error('timeout'))});socket.once('error',reject)}));

for(const item of checks)console.log(`${item.status==='READY'?'✓':'✗'} ${item.name} · ${item.status} · ${item.detail}`);
const failed=checks.filter(item=>item.status==='FAIL');
if(failed.length){console.error(`NOT READY — ${failed.length} failed check(s): ${failed.map(item=>item.name).join(', ')}`);process.exit(1)}
console.log('READY FOR PRESENTATION');
