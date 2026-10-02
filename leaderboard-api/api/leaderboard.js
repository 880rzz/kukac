import {cors,redis} from './_lib.js';

export default async function handler(req,res){
  cors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
  try{
    const raw=await redis(['ZRANGE','kukac:leaderboard',0,49,'REV','WITHSCORES'])||[];
    const rows=[];
    for(let i=0;i<raw.length;i+=2){
      const profileId=String(raw[i]),score=Number(raw[i+1]||0);
      const metaRaw=await redis(['GET','kukac:player:'+profileId]);
      if(!metaRaw)continue;
      const m=JSON.parse(metaRaw);
      rows.push({rank:rows.length+1,nickname:m.nickname,score,level:Number(m.level||1),submittedAt:m.submittedAt});
    }
    res.setHeader('Cache-Control','public, max-age=10, s-maxage=20');
    return res.status(200).json({rows});
  }catch(e){
    console.error(e);
    return res.status(503).json({error:'leaderboard_unavailable',rows:[]});
  }
}
