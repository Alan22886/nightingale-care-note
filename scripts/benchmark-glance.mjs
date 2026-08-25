import { performance } from 'node:perf_hooks';
const base=process.env.NIGHTINGALE_BASE_URL||'http://localhost:3000'; const count=Number(process.env.REQUEST_COUNT||100); const timings=[];
await fetch(`${base}/api/session`);
for(let i=0;i<count;i++){const start=performance.now();const response=await fetch(`${base}/api/highlights`,{headers:{cookie:'nightingale_demo_identity=clinician_a'}});if(!response.ok)throw new Error(`Request failed: ${response.status}`);await response.arrayBuffer();timings.push(performance.now()-start);}
timings.sort((a,b)=>a-b);const p=(n)=>timings[Math.min(timings.length-1,Math.ceil((n/100)*timings.length)-1)];
console.log(JSON.stringify({requestCount:count,environment:`local warm path · Node ${process.version}`,p50Ms:+p(50).toFixed(2),p95Ms:+p(95).toFixed(2),p99Ms:+p(99).toFixed(2)},null,2));
