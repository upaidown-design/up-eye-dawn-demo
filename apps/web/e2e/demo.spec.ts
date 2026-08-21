import{test,expect}from'@playwright/test';
import{mkdir,copyFile}from'node:fs/promises';
import{resolve}from'node:path';

const fallback=resolve(import.meta.dirname,'../../../assets/meeting-fallback/new-york-2026');
const runId='run_new_york_001';

test('New York critical path is healthy, resettable and repeatable',async({page,request})=>{
  test.setTimeout(180_000);
  await mkdir(fallback,{recursive:true});
  const browserErrors:string[]=[];
  const externalRequests:string[]=[];
  await page.route(/^https?:\/\//,route=>{const url=new URL(route.request().url());if(url.hostname==='127.0.0.1'||url.hostname==='localhost')return route.continue();externalRequests.push(url.href);return route.abort('internetdisconnected')});
  page.on('pageerror',error=>browserErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')browserErrors.push(message.text())});

  const health=await request.get('/api/v1/health/live');
  expect(health.ok()).toBeTruthy();
  const initialReset=await request.post(`/api/v1/demo/runs/${runId}/reset`);
  expect(initialReset.ok()).toBeTruthy();
  await page.goto('/demo/preflight');
  await expect(page.getByRole('heading',{name:/Autonomous Field Intelligence/i})).toBeVisible();
  await expect(page.getByText('CONNECTED',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'START INVESTOR DEMO'}).click();
  await expect(page).toHaveURL(/\/demo\/investor-demo$/);
  const shell=page.locator('[data-phase]');
  await expect(shell).toHaveAttribute('data-phase','PREPARE');
  await expect(page.locator('[aria-label="sentinel-001"]')).toBeVisible();
  await expect(page.locator('[aria-label="drone-001"]')).toBeVisible();
  await expect(page.locator('[aria-label="rover-001"]')).toBeVisible();
  await page.screenshot({path:resolve(fallback,'01-farm-overview.png')});

  const stages=[
    ['SENTINEL',45,'02-sentinel.png'],
    ['LAUNCH',70,'03-drone-launch.png'],
    ['FLIGHT',120,'04-drone-route.png'],
    ['CAPTURE',200,'05-capture.png'],
    ['NDVI',235,'06-ndvi.png'],
    ['ANOMALY',265,'07-anomaly.png'],
    ['ROVER',320,'08-rover.png'],
    ['PROBE',365,'09-probe.png'],
    ['FUSION',395,'10-data-fusion.png'],
    ['REPORT',415,'11-report.png'],
  ]as const;
  for(const[phase,time,file]of stages){
    const response=await request.post(`/api/v1/demo/runs/${runId}/seek`,{data:{time}});
    expect(response.ok(),`seek to ${phase}`).toBeTruthy();
    await expect(shell).toHaveAttribute('data-phase',phase);
    if(phase==='NDVI')await expect(page.getByText('NDVI · SYNTHETIC')).toBeVisible();
    if(phase==='ANOMALY')await expect(page.getByLabel('Simulated anomaly')).toBeVisible();
    if(phase==='PROBE')await expect(page.getByText('SYNTHETIC SOIL SAMPLE')).toBeVisible();
    if(phase==='REPORT')await expect(page.getByText('REPORT READY')).toBeVisible();
    await page.screenshot({path:resolve(fallback,file)});
  }

  const reset=async()=>{
    await page.getByRole('button',{name:'RESET'}).click();
    await expect(shell).toHaveAttribute('data-phase','PREPARE');
    await expect(shell).toHaveAttribute('data-status','READY');
    await expect(shell).toHaveAttribute('data-simulation-time','0');
    await expect(page.getByText('REPORT READY')).toHaveCount(0);
    const snapshot=await request.get(`/api/v1/demo/runs/${runId}/snapshot`).then(r=>r.json());
    expect(snapshot).toMatchObject({simulationTime:0,sequence:0,speed:1,status:'READY',phase:'PREPARE',reportReady:false});
  };
  await reset();

  for(let run=1;run<=3;run+=1){
    expect((await request.post(`/api/v1/demo/runs/${runId}/speed`,{data:{speed:20}})).ok()).toBeTruthy();
    expect((await request.post(`/api/v1/demo/runs/${runId}/play`)).ok()).toBeTruthy();
    await expect.poll(async()=>request.get(`/api/v1/demo/runs/${runId}/snapshot`).then(r=>r.json()).then(s=>s.status),{message:`run ${run} completes`,timeout:35_000,intervals:[250,500,1000]}).toBe('COMPLETED');
    await expect(shell).toHaveAttribute('data-status','COMPLETED');
    await reset();
  }

  expect(browserErrors).toEqual([]);
  expect(externalRequests).toEqual([]);
  const video=page.video();
  await page.close();
  if(video)await copyFile(await video.path(),resolve(fallback,'new-york-demo-full-run.webm'));
});
