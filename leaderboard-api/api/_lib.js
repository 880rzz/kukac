import crypto from 'node:crypto';

const REDIS_URL=process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN=process.env.UPSTASH_REDIS_REST_TOKEN;
export const ORIGIN=process.env.KUKAC_ORIGIN||'https://kukac.vipach.at';

export function cors(req,res){
  const origin=req.headers.origin||'';
  if(origin===ORIGIN)res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');
}
export async function redis(command){
  if(!REDIS_URL||!REDIS_TOKEN)throw new Error('storage_not_configured');
  const r=await fetch(REDIS_URL,{method:'POST',headers:{Authorization:'Bearer '+REDIS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(command)});
  if(!r.ok)throw new Error('redis_http_'+r.status);
  const j=await r.json();
  if(j.error)throw new Error('redis_'+j.error);
  return j.result;
}
export function cleanNickname(v){
  const s=String(v||'').trim();
  return /^[\p{L}\p{N}_-]{3,20}$/u.test(s)?s:null;
}
export function cleanId(v){
  const s=String(v||'');
  return /^[a-f0-9]{32}$/i.test(s)?s.toLowerCase():null;
}
export function number(v,min,max){
  const n=Number(v);
  return Number.isFinite(n)&&n>=min&&n<=max?Math.round(n):null;
}
export async function rateLimit(req){
  const raw=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  const salt=process.env.RATE_LIMIT_SALT||'kukac';
  const key='kukac:rate:'+crypto.createHash('sha256').update(salt+'|'+raw).digest('hex').slice(0,24);
  const count=Number(await redis(['INCR',key]));
  if(count===1)await redis(['EXPIRE',key,600]);
  return count<=20;
}
