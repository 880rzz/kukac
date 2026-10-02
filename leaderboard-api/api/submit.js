import {cors,redis,cleanNickname,cleanId,number,rateLimit} from './_lib.js';

export default async function handler(req,res){
  cors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
  try{
    if(!await rateLimit(req))return res.status(429).json({error:'rate_limited'});
    const b=req.body||{};
    const profileId=cleanId(b.profileId),nickname=cleanNickname(b.nickname);
    const score=number(b.score,0,1000000),level=number(b.level,1,100),playMs=number(b.playMs,2000,7200000);
    if(!profileId||!nickname||score===null||level===null||playMs===null)return res.status(400).json({error:'invalid_result'});
    if(score>Math.floor(playMs/250)+5000)return res.status(400).json({error:'implausible_result'});
    const existing=Number(await redis(['ZSCORE','kukac:leaderboard',profileId])||-1);
    if(score>existing){
      const meta=JSON.stringify({nickname,level,score,submittedAt:new Date().toISOString()});
      await redis(['ZADD','kukac:leaderboard',score,profileId]);
      await redis(['SET','kukac:player:'+profileId,meta]);
    }
    return res.status(200).json({ok:true,best:Math.max(existing,score)});
  }catch(e){
    console.error(e);
    return res.status(503).json({error:'leaderboard_unavailable'});
  }
}
