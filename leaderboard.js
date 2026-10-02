(() => {
'use strict';
const API=String(window.KUKAC_LEADERBOARD_API||'').replace(/\/$/,'');
const $=id=>document.getElementById(id);
const lang=()=>localStorage.getItem('kukac3d-lang')||'de';
const copy=key=>window.KUKAC_I18N?.[lang()]?.[key]??window.KUKAC_I18N?.de?.[key]??key;
let lastResult=null;
const enabled=()=>/^https:\/\//.test(API);

function setVisible(){
  for(const id of ['submitGlobalBtn','openGlobalLeaderboardBtn','globalLeaderboardTab']){
    const el=$(id); if(el)el.hidden=!enabled();
  }
}
function status(text,kind='info'){
  const el=$('submitGlobalStatus'); if(!el)return;
  el.textContent=text||''; el.dataset.kind=kind;
}
function setResult(result){lastResult=result;status('');}
async function submit(){
  if(!enabled()||!lastResult)return;
  const identity=window.KUKAC_ACCOUNT?.submissionIdentity?.();
  if(!identity)return status(copy('profileRequired'),'error');
  const btn=$('submitGlobalBtn'); if(btn)btn.disabled=true;
  status(copy('globalSubmitting'));
  try{
    const r=await fetch(API+'/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...identity,...lastResult})});
    if(!r.ok)throw new Error('http_'+r.status);
    status(copy('globalSubmitted'),'success');
    await loadGlobal();
  }catch(e){
    console.error(e);
    status(copy('globalSubmitFailed'),'error');
  }finally{if(btn)btn.disabled=false}
}
function row(p){
  const b=document.createElement('div');b.className='leader-row';
  const a=document.createElement('span');a.className='rank';a.textContent='#'+p.rank;
  const n=document.createElement('strong');n.textContent=p.nickname;
  const s=document.createElement('span');s.textContent=Number(p.score||0).toLocaleString();
  const l=document.createElement('small');l.textContent='LVL '+Number(p.level||1);
  b.append(a,n,s,l);return b;
}
async function loadGlobal(){
  if(!enabled())return;
  const box=$('globalLeaderboardBody'); if(!box)return;
  box.innerHTML=''; const loading=document.createElement('p');loading.className='loading-line';loading.textContent=copy('globalLoading');box.append(loading);
  try{
    const r=await fetch(API+'/api/leaderboard',{headers:{Accept:'application/json'}});
    if(!r.ok)throw new Error('http_'+r.status);
    const data=await r.json();box.innerHTML='';
    if(!data.rows?.length){const p=document.createElement('p');p.className='loading-line';p.textContent=copy('globalEmpty');box.append(p);return}
    data.rows.forEach(x=>box.append(row(x)));
  }catch(e){
    console.error(e);box.innerHTML='';const p=document.createElement('p');p.className='loading-line';p.textContent=copy('globalUnavailable');box.append(p);
  }
}
function showLocal(){
  $('leaderboardBody').hidden=false;$('globalLeaderboardBody').hidden=true;
  $('localLeaderboardTab').classList.add('active');$('globalLeaderboardTab').classList.remove('active');
  window.KUKAC_ACCOUNT?.loadLeaderboard?.();
}
async function showGlobal(){
  if(!enabled())return;
  $('leaderboardBody').hidden=true;$('globalLeaderboardBody').hidden=false;
  $('localLeaderboardTab').classList.remove('active');$('globalLeaderboardTab').classList.add('active');
  await loadGlobal();
}
$('submitGlobalBtn')?.addEventListener('click',submit);
$('openGlobalLeaderboardBtn')?.addEventListener('click',()=>{$('gameover').style.display='none';$('leaderboard').style.display='grid';showGlobal()});
$('localLeaderboardTab')?.addEventListener('click',showLocal);
$('globalLeaderboardTab')?.addEventListener('click',showGlobal);
setVisible();
window.KUKAC_GLOBAL={enabled:enabled(),setResult,loadGlobal,refreshLabels:setVisible};
})();
