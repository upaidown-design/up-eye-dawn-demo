import{spawn,spawnSync}from'node:child_process';

const managed=!process.env.PLAYWRIGHT_BASE_URL;
const compose=['compose','-f','compose.e2e.yaml'];
const run=(args,{required=true}={})=>{const result=spawnSync('docker',[...compose,...args],{stdio:'inherit'});if(required&&result.status!==0)throw new Error(`docker compose ${args.join(' ')} failed`)};

let exitCode=1;
try{
  if(managed){
    run(['down','--volumes','--remove-orphans'],{required:false});
    run(['up','-d','--build','--wait']);
  }
  const child=spawn('pnpm',['--filter','@ued/web','exec','playwright','test','--reporter=line'],{stdio:'inherit',env:{...process.env,PLAYWRIGHT_BASE_URL:process.env.PLAYWRIGHT_BASE_URL??'http://127.0.0.1:8090/demo',E2E_ORIGIN:process.env.E2E_ORIGIN??'http://127.0.0.1:8090',E2E_API_ORIGIN:process.env.E2E_API_ORIGIN??'http://127.0.0.1:4011',E2E_ADMIN_EMAIL:process.env.E2E_ADMIN_EMAIL??'e2e-owner@example.invalid',E2E_ADMIN_PASSWORD:process.env.E2E_ADMIN_PASSWORD??'E2E-Owner-Only-2026!'}});
  exitCode=await new Promise(resolve=>child.once('exit',(code,signal)=>{if(signal)console.error(`Playwright terminated by ${signal}`);resolve(code??1)}));
}finally{
  if(managed)run(['down','--volumes','--remove-orphans'],{required:false});
}
process.exit(exitCode);
