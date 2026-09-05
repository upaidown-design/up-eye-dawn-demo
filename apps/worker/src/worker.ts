import{workerStatus}from'./status.js';
console.log(JSON.stringify({level:'info',...workerStatus,message:'NDVI/report worker ready in deterministic fallback mode'}));setInterval(()=>{},60_000);
