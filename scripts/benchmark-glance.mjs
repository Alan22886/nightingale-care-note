import { performance } from 'node:perf_hooks';

const base = process.env.NIGHTINGALE_BASE_URL || 'http://localhost:3000';
const requestCount = Math.max(100, Number(process.env.REQUEST_COUNT || 100));
const warmupCount = Math.max(10, Number(process.env.WARMUP_COUNT || 15));
const patientId = process.env.NIGHTINGALE_BENCHMARK_PATIENT_ID || '20000000-0000-4000-8000-000000000007';
const endpoint = `/api/highlights?patientId=${encodeURIComponent(patientId)}`;

const session = await fetch(`${base}/api/session`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ role: 'clinician' }),
});
if (!session.ok) throw new Error(`Authentication failed: ${session.status}`);
await session.arrayBuffer();
const setCookies = typeof session.headers.getSetCookie === 'function'
  ? session.headers.getSetCookie()
  : [session.headers.get('set-cookie')].filter(Boolean);
const cookie = setCookies.map((value) => value.split(';', 1)[0]).join('; ');
if (!cookie) throw new Error('Authentication did not return a reusable session cookie');

let failures = 0;
async function request(measured) {
  const started = performance.now();
  const response = await fetch(`${base}${endpoint}`, { headers: { cookie }, cache: 'no-store' });
  await response.arrayBuffer();
  if (!response.ok) {
    failures += 1;
    throw new Error(`Glance request failed: ${response.status}`);
  }
  return measured ? performance.now() - started : undefined;
}

for (let index = 0; index < warmupCount; index += 1) await request(false);
const timings = [];
for (let index = 0; index < requestCount; index += 1) timings.push(await request(true));
timings.sort((left, right) => left - right);
const percentile = (value) => timings[Math.min(timings.length - 1, Math.ceil((value / 100) * timings.length) - 1)];
const result = {
  endpoint,
  requestCount,
  warmupCount,
  failures,
  environment: `${base} · Node ${process.version}`,
  p50Ms: +percentile(50).toFixed(2),
  p95Ms: +percentile(95).toFixed(2),
  p99Ms: +percentile(99).toFixed(2),
  targetP95Ms: 300,
};
console.log(JSON.stringify(result, null, 2));
if (result.p95Ms > result.targetP95Ms) process.exitCode = 2;
