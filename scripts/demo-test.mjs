import{spawn}from'node:child_process';
const child=spawn('pnpm',['--filter','@ued/web','exec','playwright','test','--reporter=line'],{stdio:'inherit',env:{...process.env,PLAYWRIGHT_BASE_URL:process.env.PLAYWRIGHT_BASE_URL??'http://127.0.0.1:8088/demo'}});
child.once('exit',(code,signal)=>{if(signal)console.error(`Playwright terminated by ${signal}`);process.exit(code??1)});
