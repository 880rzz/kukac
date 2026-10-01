
(() => {
'use strict';
if(!window.THREE){document.body.innerHTML='<div style="padding:40px;color:white;font-family:system-ui">3D engine could not be loaded. Please check your connection and reload.</div>';return}
const GRID=20, HALF=GRID/2, LEVEL_STEP=80;
const params=new URLSearchParams(location.search);
const qaMode=params.get('qa')==='1';
let rngSeed=Number(params.get('seed')||0)>>>0;
function rand(){
  if(!rngSeed)return rand();
  rngSeed=(rngSeed+0x6D2B79F5)>>>0;
  let t=rngSeed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);
  return ((t^t>>>14)>>>0)/4294967296;
}
function haptic(pattern){if(navigator.vibrate)navigator.vibrate(pattern)}
const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x80c8ff,20,58);
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,0.1,200);
camera.position.set(0,19,18); camera.lookAt(0,0,0);

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
document.body.prepend(renderer.domElement);

const ambient=new THREE.HemisphereLight(0xdff3ff,0x507224,1.15); scene.add(ambient);
const sun=new THREE.DirectionalLight(0xffffff,1.1); sun.position.set(-10,22,12); sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-18;scene.add(sun);

const world=new THREE.Group(); scene.add(world);
const deco=new THREE.Group(); scene.add(deco);
const particles=new THREE.Group(); scene.add(particles);
const npcGroup=new THREE.Group(); scene.add(npcGroup);
const crowdGroup=new THREE.Group(); scene.add(crowdGroup);
const starLight=new THREE.PointLight(0xffd34d,1.8,8,2);starLight.visible=false;scene.add(starLight);

let snake=[], food=null, coin=null, obstacles=[], direction={x:1,z:0}, nextDirection={x:1,z:0};
let score=0, level=1, best=Number(localStorage.getItem('kukac3d-best')||0);
let baseInterval=155, boosting=false, shake=0;
let npcs=[], crowd=[], nextNpcRaid=Infinity;
const gameState={
  player:{lifeCount:5,shieldCharges:3,invulnerableUntilMs:0},
  session:{isRunning:false,isPaused:false,isDead:false,soundEnabled:true,comboCount:0,comboAt:0,lastStepAt:0},
  progression:{starCount:0,invasionReady:false,stolenCollectible:null,royalOn:false,royalDeadline:0,royalNextAt:160,dragonTriggered:false},
  world:{crowdMood:'calm',crowdMoodUntil:0},
  audio:{ambience:null,tension:null},
  qa:{enabled:qaMode}
};

const $=id=>document.getElementById(id);

const I18N=window.KUKAC_I18N;
let currentLang=localStorage.getItem('kukac3d-lang')||'de';
if(!I18N[currentLang])currentLang='de';
function t(k){return I18N[currentLang][k]??I18N.de[k]??k}
function applyLanguage(lang){
  if(!I18N[lang])lang='de';
  currentLang=lang;localStorage.setItem('kukac3d-lang',lang);
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-html]').forEach(el=>el.innerHTML=t(el.dataset.i18nHtml));
  $('langSelect').value=lang;
  if($('startLangSelect')) $('startLangSelect').value=lang;
  $('soundBtn').setAttribute('aria-label',lang==='de'?'Ton an/aus':lang==='tr'?'Sesi aç/kapat':lang==='uk'?'Увімкнути/вимкнути звук':lang==='hu'?'Hang ki/be':'Sound on/off');
  $('helpBtn').setAttribute('aria-label',lang==='de'?'Hilfe':lang==='tr'?'Yardım':lang==='uk'?'Допомога':lang==='hu'?'Súgó':'Help');
  $('pauseBtn').setAttribute('aria-label',t('pause'));
}

$('best').textContent=best;
$('langSelect').addEventListener('change',e=>applyLanguage(e.target.value));
$('startLangSelect').addEventListener('change',e=>applyLanguage(e.target.value));
applyLanguage(currentLang);

function mat(color,rough=0.55,metal=0.04){
  return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
}
const headMat=mat(0x4dde5b,0.36,0.08), bodyMat=mat(0x2fbd4a,0.48,0.03);
const bodyAlt=mat(0x22a83d,0.5,0.02), brickMat=mat(0xc85a31,0.7,0.02);
const goldMat=new THREE.MeshStandardMaterial({color:0xffce38,roughness:0.3,metalness:0.65,emissive:0x7a3f00,emissiveIntensity:0.18});
const starMat=new THREE.MeshStandardMaterial({color:0xffe866,roughness:0.28,metalness:0.16,emissive:0x8a5c00,emissiveIntensity:0.28});

window.KUKAC_WORLD.build({THREE,world,deco,GRID,mat,rand});


const {makeHumanoid,makeDragon}=window.KUKAC_ACTORS.create({THREE,mat});
function setCrowdMood(mood,duration=1800){
  gameState.world.crowdMood=mood;gameState.world.crowdMoodUntil=performance.now()+duration;
}
function buildCrowd(){
  while(crowdGroup.children.length)crowdGroup.remove(crowdGroup.children[0]);
  crowd=[];const colors=[0xffd447,0x3d8bea,0xe85b4a,0x8f61d8,0x42b883];
  for(let i=0;i<28;i++){
    const side=i%4,along=-8+(i%7)*2.5;
    const fan=makeHumanoid('fan',colors[i%colors.length]);
    if(side===0)fan.position.set(along,0,-12.2);
    if(side===1)fan.position.set(along,0,12.2);
    if(side===2)fan.position.set(-12.2,0,along);
    if(side===3)fan.position.set(12.2,0,along);
    fan.rotation.y=side===0?0:side===1?Math.PI:side===2?Math.PI/2:-Math.PI/2;
    fan.userData.phase=i*0.7;crowdGroup.add(fan);crowd.push(fan);
  }
  const queen=makeHumanoid('queen',0xe95cae);queen.position.set(0,0,-13.2);crowdGroup.add(queen);crowd.push(queen);
  for(let i=0;i<4;i++){
    const s=makeHumanoid('soldier',0xb11f2b);s.position.set(-4.5+i*3,0,-12.8);crowdGroup.add(s);crowd.push(s);
  }
  const dragon=makeDragon();dragon.position.set(8.5,4.6,-14);dragon.userData.phase=1.7;crowdGroup.add(dragon);crowd.push(dragon);
}
function crowdStartFor(kind){
  const source=kind==='dragon'?crowd.find(x=>x.userData.kind==='dragon'||x.userData.wings):kind==='soldier'?crowd.find(x=>x.userData.kind==='soldier'):crowd.filter(x=>x.userData.kind==='fan')[Math.floor(rand()*Math.max(1,crowd.filter(x=>x.userData.kind==='fan').length))];
  return source?source.position.clone():new THREE.Vector3(0,0.1,-11.5);
}
function spawnNpcRaid(now,forcedKind=null){
  if(!gameState.session.isRunning||gameState.session.isPaused||gameState.session.isDead)return;
  let pool=level>=4?['hero','soldier','dragon']:level>=2?['hero','soldier']:['hero'];
  if(gameState.progression.stolenCollectible)pool=['soldier'];
  const kind=forcedKind||pool[Math.floor(rand()*pool.length)];
  const obj=kind==='dragon'?makeDragon():makeHumanoid(kind,kind==='hero'?0x38a169:0xb11f2b);
  const start=crowdStartFor(kind);
  if(kind!=='dragon')start.y=0.1;
  const target=food?food.position.clone():snake[0].position.clone();
  obj.position.copy(start);obj.lookAt(target.x,obj.position.y,target.z);
  obj.scale.multiplyScalar(kind==='dragon'?1.25:1.2);
  const role=kind==='soldier'?'blocker':'thief';
  obj.userData={...obj.userData,kind,role,state:'in',start:start.clone(),target:target.clone(),born:now,speed:kind==='dragon'? 0.07:kind==='hero'? 0.095:0.07,steal:false};
  npcGroup.add(obj);npcs.push(obj);
  showCombo(kind==='dragon'?t('raidDragon'):t('raidInvader'));sound('raid');
}
function triggerRoyalEvent(now){
  if(gameState.progression.royalOn||gameState.session.isDead)return;
  gameState.progression.royalOn=true;gameState.progression.royalDeadline=now+10000;gameState.progression.royalNextAt+=160;showEvent(t('eventRoyal'),3200);sound('level');setCrowdMood('celebrate',3200);haptic([40,40,80]);
  if(food){food.userData.royal=true;food.scale.setScalar(1.35);starLight.intensity=2.8;}
  const queen=crowd.find(x=>x.userData.kind==='queen');if(queen)queen.scale.setScalar(1.22);
  setTimeout(()=>{if(gameState.session.isRunning&&!gameState.session.isDead)spawnNpcRaid(performance.now(),'soldier')},650);
  setTimeout(()=>{if(gameState.session.isRunning&&!gameState.session.isDead)spawnNpcRaid(performance.now(),'soldier')},1200);
}
function triggerDragonEvent(now){
  if(gameState.progression.dragonTriggered||level<4)return;
  gameState.progression.dragonTriggered=true;showEvent(t('eventDragon'),3200);sound('raid');setCrowdMood('danger',3500);haptic([80,50,80]);
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.8,1.08,32),new THREE.MeshBasicMaterial({color:0xff4b35,transparent:true,opacity:0.72,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;const target=food?food.position:snake[0].position;ring.position.set(target.x,0.08,target.z);scene.add(ring);
  let pulse=0;const warn=setInterval(()=>{pulse++;ring.scale.setScalar(1+(pulse%2)*0.35);ring.material.opacity=pulse%2? 0.35:0.72},140);
  setTimeout(()=>{clearInterval(warn);scene.remove(ring);if(gameState.session.isRunning&&!gameState.session.isDead)spawnNpcRaid(performance.now(),'dragon')},1100);
}
function updateNPCs(now){
  if(now>gameState.world.crowdMoodUntil)gameState.world.crowdMood='calm';
  const moodAmp=gameState.world.crowdMood==='celebrate'?1.35:gameState.world.crowdMood==='danger'?1.05:gameState.world.crowdMood==='tense'? 0.8:0.55;
  crowd.forEach((f,i)=>{
    const a=f.userData.arms;
    if(a){a[0].rotation.z=Math.sin(now*0.007+(f.userData.phase||i))*moodAmp;a[1].rotation.z=-Math.sin(now*0.007+(f.userData.phase||i))*moodAmp}
    f.position.y=Math.abs(Math.sin(now*0.005+(f.userData.phase||i)))*(0.05+moodAmp*0.06);
    if(f.userData.wings){f.userData.wings[0].rotation.y=Math.sin(now*0.005)*0.5;f.userData.wings[1].rotation.y=-Math.sin(now*0.005)*0.5;f.position.x=8.5+Math.sin(now*0.0006)*4}
  });
  if(gameState.progression.royalOn&&now>gameState.progression.royalDeadline){gameState.progression.royalOn=false;const queen=crowd.find(x=>x.userData.kind==='queen');if(queen)queen.scale.setScalar(1.05)}
  if(gameState.progression.invasionReady&&gameState.session.isRunning&&!gameState.session.isPaused&&!gameState.session.isDead&&now>nextNpcRaid){
    spawnNpcRaid(now);nextNpcRaid=now+Math.max(5000,9000-level*450)+rand()*2400;
  }
  if(score>=gameState.progression.royalNextAt)triggerRoyalEvent(now);
  triggerDragonEvent(now);

  // Star-state watchdog: the game must never remain permanently without a collectible.
  if(!food&&!gameState.progression.stolenCollectible&&gameState.session.isRunning&&!gameState.session.isDead)spawnFood();
  if(gameState.progression.stolenCollectible){
    const owner=gameState.progression.stolenCollectible.userData.thief;
    const ownerAlive=owner&&npcs.includes(owner)&&owner.userData.state==='escape';
    const stolenTooLong=ownerAlive&&owner.userData.stolenAt&&now-owner.userData.stolenAt>9000;
    if(!ownerAlive||stolenTooLong){
      if(ownerAlive){npcGroup.remove(owner);npcs=npcs.filter(x=>x!==owner)}
      scene.remove(gameState.progression.stolenCollectible);gameState.progression.stolenCollectible=null;
      if(gameState.session.isRunning&&!gameState.session.isDead)spawnFood();
    }
  }

  npcs.slice().forEach(n=>{
    const d=n.userData;if(gameState.session.isPaused||gameState.session.isDead)return;
    if(d.wings){d.wings[0].rotation.y=Math.sin(now*0.012)*0.7;d.wings[1].rotation.y=-Math.sin(now*0.012)*0.7}
    let dest;
    if(d.state==='escape')dest=d.start;
    else if(d.role==='blocker'&&snake[0])dest=snake[0].position.clone().add(new THREE.Vector3(direction.x*2,0,direction.z*2));
    else dest=food?food.position:d.target;

    const v=dest.clone().sub(n.position);
    v.y=d.kind==='dragon'&&d.state!=='escape'?(dest.y+1.7-n.position.y):0;
    if(v.length()>0.18){v.normalize();n.position.add(v.multiplyScalar(d.speed*(d.state==='escape'?1.18:1)));n.lookAt(dest.x,n.position.y,dest.z)}

    if(d.role==='thief'&&d.state==='in'&&food){
      const dx=n.position.x-food.position.x,dz=n.position.z-food.position.z;
      if(Math.hypot(dx,dz)<1.0){
        d.state='escape';d.steal=true;d.stolenAt=now;gameState.progression.stolenCollectible=food;food=null;
        gameState.progression.stolenCollectible.userData.thief=n;setCrowdMood('danger',1800);haptic([70,40,70]);showCombo(t('stolen'));sound('steal');showEvent(t('stolen'),1700);
      }
    }
    if(d.state==='escape'&&gameState.progression.stolenCollectible&&gameState.progression.stolenCollectible.userData.thief===n){
      gameState.progression.stolenCollectible.position.set(n.position.x,n.position.y+1.35,n.position.z);gameState.progression.stolenCollectible.rotation.y+=0.12;starLight.position.set(gameState.progression.stolenCollectible.position.x,gameState.progression.stolenCollectible.position.y+0.4,gameState.progression.stolenCollectible.position.z);
      if(snake[0]&&Math.hypot(n.position.x-snake[0].position.x,n.position.z-snake[0].position.z)<1.05){
        score+=20;addParticleBurst(gameState.progression.stolenCollectible.position.clone(),0xffe866,34);scene.remove(gameState.progression.stolenCollectible);gameState.progression.stolenCollectible=null;
        setCrowdMood('celebrate',1800);haptic([35,25,80]);showCombo(t('starSaved'));sound('coin');npcGroup.remove(n);npcs=npcs.filter(x=>x!==n);spawnFood();updateHUD();return;
      }
      if(Math.hypot(n.position.x-d.start.x,n.position.z-d.start.z)<0.45){
        score=Math.max(0,score-5);scene.remove(gameState.progression.stolenCollectible);gameState.progression.stolenCollectible=null;showCombo(t('stolen'));updateHUD();
        npcGroup.remove(n);npcs=npcs.filter(x=>x!==n);setTimeout(()=>{if(!food&&!gameState.session.isDead)spawnFood()},350);return;
      }
    } else if(d.state==='escape'&&Math.hypot(n.position.x-d.start.x,n.position.z-d.start.z)<0.45){
      npcGroup.remove(n);npcs=npcs.filter(x=>x!==n);return;
    }

    if(d.role==='blocker'&&snake[0]&&Math.hypot(n.position.x-snake[0].position.x,n.position.z-snake[0].position.z)<0.68){handleCollision();d.state='escape'}
    if(d.role==='thief'&&d.state==='in'&&snake[0]&&Math.hypot(n.position.x-snake[0].position.x,n.position.z-snake[0].position.z)<0.62){shake=0.45;d.state='escape'}
  });
}

function sphereSegment(isHead=false){
  const g=new THREE.Group();
  const core=new THREE.Mesh(new THREE.SphereGeometry(isHead? 0.55:0.47,20,16),isHead?headMat:(snake.length%2?bodyMat:bodyAlt));
  core.castShadow=true;core.receiveShadow=true;g.add(core);
  if(isHead){
    [-0.20,0.20].forEach(x=>{
      const eye=new THREE.Mesh(new THREE.SphereGeometry(0.105,10,8),mat(0xffffff,0.25));
      eye.position.set(x,0.18,0.45);
      const pupil=new THREE.Mesh(new THREE.SphereGeometry(0.052,8,6),mat(0x172238,0.3));
      pupil.position.set(0,0,0.085);eye.add(pupil);g.add(eye);
    });
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.50,0.18,18),mat(0xe83e36,0.42));
    cap.rotation.x=Math.PI/2;cap.position.set(0,0.42,-0.02);g.add(cap);
    const bill=new THREE.Mesh(new THREE.BoxGeometry(0.65,0.08,0.27),mat(0xe83e36,0.42));
    bill.position.set(0,0.40,0.33);g.add(bill);
  }
  return g;
}

function rotateHead(){
  if(!snake[0])return;
  const d=direction;
  snake[0].rotation.y=d.x===1?Math.PI/2:d.x===-1?-Math.PI/2:d.z===1?Math.PI:0;
}
function gridPos(x,z){return new THREE.Vector3(x,0.56,z)}
function clearActors(){
  snake.forEach(o=>scene.remove(o));snake=[];
  if(food)scene.remove(food);if(coin)scene.remove(coin);food=coin=null;
  obstacles.forEach(o=>scene.remove(o.mesh));obstacles=[];
  while(particles.children.length)particles.remove(particles.children[0]);
}
function reset(){
  clearActors();while(npcGroup.children.length)npcGroup.remove(npcGroup.children[0]);npcs=[];if(gameState.progression.stolenCollectible)scene.remove(gameState.progression.stolenCollectible);gameState.progression.stolenCollectible=null;score=0;level=1;gameState.session.comboCount=0;gameState.player.lifeCount=5;gameState.player.shieldCharges=3;gameState.player.invulnerableUntilMs=0;gameState.world.crowdMood='calm';gameState.world.crowdMoodUntil=0;gameState.progression.starCount=0;gameState.progression.invasionReady=false;gameState.progression.royalOn=false;gameState.progression.royalDeadline=0;gameState.progression.royalNextAt=160;gameState.progression.dragonTriggered=false;gameState.session.isDead=false;gameState.session.isPaused=false;baseInterval=155;direction={x:1,z:0};nextDirection={x:1,z:0};nextNpcRaid=Infinity;
  for(let i=0;i<4;i++){
    const s=sphereSegment(i===0);s.position.copy(gridPos(-i,0));scene.add(s);snake.push(s);
  }
  rotateHead();spawnFood();buildObstacles();updateHUD();applyTheme();gameState.session.lastStepAt=performance.now();
}

function occupied(x,z){
  return snake.some(s=>Math.round(s.position.x)===x&&Math.round(s.position.z)===z) ||
    obstacles.some(o=>o.x===x&&o.z===z) ||
    (food&&Math.round(food.position.x)===x&&Math.round(food.position.z)===z) ||
    (coin&&Math.round(coin.position.x)===x&&Math.round(coin.position.z)===z);
}
function randomCell(){
  for(let tries=0;tries<500;tries++){
    const x=Math.floor(rand()*19)-9,z=Math.floor(rand()*19)-9;
    if(!occupied(x,z))return{x,z};
  }
  return{x:0,z:0};
}
function makeStar(){
  const shape=new THREE.Shape();
  for(let i=0;i<10;i++){
    const a=-Math.PI/2+i*Math.PI/5,r=i%2===0? 0.58:0.26;
    const x=Math.cos(a)*r,y=Math.sin(a)*r;
    i?shape.lineTo(x,y):shape.moveTo(x,y);
  }
  const geo=new THREE.ExtrudeGeometry(shape,{depth:0.18,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:0.07,bevelThickness:0.07});
  geo.center();
  const m=new THREE.Mesh(geo,starMat);m.castShadow=true;return m;
}
function spawnFood(){
  if(food)scene.remove(food);
  const p=randomCell();food=makeStar();food.position.set(p.x,0.68,p.z);food.rotation.x=-0.15;food.userData.royal=false;scene.add(food);
  starLight.position.set(p.x,1.1,p.z);starLight.intensity=1.8;starLight.visible=true;
  if(rand()<0.22 && !coin)spawnCoin();
}
function spawnCoin(){
  const p=randomCell();
  coin=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.13,24),goldMat);
  coin.rotation.z=Math.PI/2;coin.position.set(p.x,0.75,p.z);coin.castShadow=true;scene.add(coin);
}
function buildObstacles(){
  obstacles.forEach(o=>scene.remove(o.mesh));obstacles=[];
  const count=Math.min(2+(level-1)*2,12);
  for(let i=0;i<count;i++){
    let p=randomCell();
    if(Math.abs(p.x)<3&&Math.abs(p.z)<2){i--;continue}
    const mesh=new THREE.Group();
    const block=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.75,0.9),brickMat);block.castShadow=true;block.receiveShadow=true;mesh.add(block);
    for(let y=-0.22;y<=0.22;y+=0.44){
      const seam=new THREE.Mesh(new THREE.BoxGeometry(0.94,0.025,0.94),mat(0x8d3f25,0.9));seam.position.y=y;mesh.add(seam);
    }
    mesh.position.set(p.x,0.4,p.z);scene.add(mesh);obstacles.push({x:p.x,z:p.z,mesh});
  }
}
function addParticleBurst(pos,color=0xffe866,count=20){
  const geo=new THREE.SphereGeometry(0.065,5,4);
  for(let i=0;i<count;i++){
    const p=new THREE.Mesh(geo,mat(color,0.4,0.1));p.position.copy(pos);
    p.userData.v=new THREE.Vector3((rand()-0.5)*0.16,rand()*0.14+0.04,(rand()-0.5)*0.16);
    p.userData.life=1;particles.add(p);
  }
}
function updateParticles(){
  [...particles.children].forEach(p=>{
    p.position.add(p.userData.v);p.userData.v.y-=0.006;p.userData.life-=0.035;p.scale.setScalar(Math.max(0,p.userData.life));
    if(p.userData.life<=0)particles.remove(p);
  });
}
const audio=window.KUKAC_AUDIO.create();
function startAudioLayers(){audio.startLayers()}
function updateAudioLayers(){audio.update({enabled:gameState.session.soundEnabled,lives:gameState.player.lifeCount,royal:gameState.progression.royalOn,stolen:!!gameState.progression.stolenCollectible})}
function sound(type){audio.play(type,gameState.session.soundEnabled)}
function flash(){const e=$('flash');if(!e)return;e.classList.remove('go');void e.offsetWidth;e.classList.add('go')}
function showCombo(txt){const e=$('combo');if(!e)return;e.textContent=txt;e.classList.remove('show');void e.offsetWidth;e.classList.add('show')}
function showEvent(txt,ms=2200){const e=$('eventPill');if(!e)return;e.textContent=txt;e.classList.add('show');clearTimeout(e._timer);e._timer=setTimeout(()=>e.classList.remove('show'),ms)}
function updateHUD(){
  $('score').textContent=score;$('level').textContent=level;$('best').textContent=best;
  $('nextLevel').textContent=level*LEVEL_STEP;
  $('livesHud').textContent='♥'.repeat(Math.max(0,gameState.player.lifeCount))+'♡'.repeat(Math.max(0,5-gameState.player.lifeCount));
  $('shieldHud').textContent=gameState.player.lifeCount===5&&gameState.player.shieldCharges>0?'🛡 ×'+gameState.player.shieldCharges:'';
}
function stageName(){const stages=t('stages');return Array.isArray(stages)?stages[(level-1)%stages.length]:''}
function maybeLevelUp(){
  const target=Math.floor(score/LEVEL_STEP)+1;
  if(target>level){
    level=target;baseInterval=Math.max(72,155-(level-1)*12);buildObstacles();applyTheme();sound('level');flash();
    $('levelBig').textContent=level;const b=$('levelBanner');b.classList.remove('show');void b.offsetWidth;b.classList.add('show');showEvent(stageName(),1900);
  }
}
function applyTheme(){
  const themes=[
    [0x79c8ff,0xdaf4ff,0x5bba39],[0xffb66b,0xffe3b8,0x4ba34a],[0x7164d8,0xc8c0ff,0x3c7c55],
    [0x233768,0x738be2,0x317b55],[0x47bdd0,0xc3fbff,0x69b73f]
  ];
  const t=themes[(level-1)%themes.length];
  renderer.setClearColor(t[0]);scene.fog.color.setHex(t[1]);
  world.children[0]?.material?.color.setHex(t[2]);
}
function sameCell(obj,p){return obj&&Math.round(obj.position.x)===p.x&&Math.round(obj.position.z)===p.z}
function spiralCells(len){
  const cells=[{x:0,z:0}];let x=0,z=0,step=1;
  const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
  let d=0;
  while(cells.length<len&&step<20){
    for(let twice=0;twice<2;twice++){
      const [dx,dz]=dirs[d%4];
      for(let i=0;i<step&&cells.length<len;i++){
        x+=dx;z+=dz;
        if(Math.abs(x)<=9&&Math.abs(z)<=9)cells.push({x,z});
      }
      d++;
    }
    step++;
  }
  return cells.slice(0,len);
}
function playShieldBounce(){
  haptic([35,30,55]);setCrowdMood('tense',900);
  snake.forEach((s,i)=>{s.scale.setScalar(0.78);setTimeout(()=>{if(s.parent)s.scale.setScalar(1)},90+i*6)});
}
function respawnAfterHit(){
  const len=Math.min(Math.max(4,snake.length),361),cells=spiralCells(len);
  const safe=new Set(cells.map(p=>p.x+','+p.z));
  obstacles.slice().forEach(o=>{if(safe.has(o.x+','+o.z)){scene.remove(o.mesh);obstacles=obstacles.filter(x=>x!==o)}});
  snake.forEach(o=>scene.remove(o));snake=[];
  direction={x:1,z:0};nextDirection={x:1,z:0};
  cells.forEach((cell,i)=>{
    const s=sphereSegment(i===0);s.position.copy(gridPos(cell.x,cell.z));scene.add(s);snake.push(s);
  });
  rotateHead();
  npcs.slice().forEach(n=>{
    if(Math.hypot(n.position.x,n.position.z)<5){npcGroup.remove(n);npcs=npcs.filter(x=>x!==n)}
  });
  gameState.player.invulnerableUntilMs=performance.now()+1300;gameState.session.lastStepAt=performance.now();
}
function handleCollision(){
  if(gameState.session.isDead||performance.now()<gameState.player.invulnerableUntilMs)return;
  shake=0.7;flash();
  if(gameState.player.lifeCount===5&&gameState.player.shieldCharges>0){
    gameState.player.shieldCharges--;playShieldBounce();
    showCombo(t('shieldHit')+' · '+gameState.player.shieldCharges);
    sound('raid');respawnAfterHit();updateHUD();return;
  }
  gameState.player.lifeCount--;haptic(gameState.player.lifeCount>0?[120]:[180,70,180]);setCrowdMood(gameState.player.lifeCount===1?'danger':'tense',2200);
  showCombo(gameState.player.lifeCount>0?t('lifeLost')+' · '+gameState.player.lifeCount:t('collision'));
  sound(gameState.player.lifeCount>0?'steal':'over');
  updateHUD();
  if(gameState.player.lifeCount<=0){die();return}
  if(gameState.player.lifeCount===1)showEvent(t('lastLife'),1800);
  respawnAfterHit();
}
function die(){
  if(gameState.session.isDead)return;gameState.session.isDead=true;gameState.session.isRunning=false;shake=0.55;sound('over');
  if(score>best){best=score;localStorage.setItem('kukac3d-best',best);updateHUD()}
  setTimeout(()=>{ $('resultText').innerHTML=t('result')(score,level,best);$('gameover').style.display='grid';},350);
}
function move(){
  direction={...nextDirection};
  const h=snake[0],p={x:Math.round(h.position.x)+direction.x,z:Math.round(h.position.z)+direction.z};
  if(p.x<=-10||p.x>=10||p.z<=-10||p.z>=10||obstacles.some(o=>o.x===p.x&&o.z===p.z)||
     snake.some((s,i)=>i>0&&Math.round(s.position.x)===p.x&&Math.round(s.position.z)===p.z)){handleCollision();return}

  const ate=sameCell(food,p),gotCoin=sameCell(coin,p);
  let tail;
  if(ate){
    tail=sphereSegment(false);scene.add(tail);snake.push(tail);
  } else tail=snake.pop();
  tail.position.copy(gridPos(p.x,p.z));snake.unshift(tail);

  if(snake[1]){
    const oldHead=snake[1];
    if(oldHead.children.length>1){
      const replacement=sphereSegment(false);replacement.position.copy(oldHead.position);replacement.rotation.copy(oldHead.rotation);
      scene.remove(oldHead);snake[1]=replacement;scene.add(replacement);
    }
  }
  if(snake[0].children.length===1){
    const old=snake[0],newHead=sphereSegment(true);newHead.position.copy(old.position);scene.remove(old);snake[0]=newHead;scene.add(newHead);
  }
  rotateHead();

  if(ate){
    gameState.session.comboCount=(performance.now()-gameState.session.comboAt<2500)?gameState.session.comboCount+1:1;gameState.session.comboAt=performance.now();
    const royalBonus=food.userData.royal?40:0;
    const bonus=Math.min(gameState.session.comboCount-1,5)*2,boostBonus=boosting?5:0;score+=10+bonus+boostBonus+royalBonus;gameState.progression.starCount++;
    setCrowdMood('celebrate',1400);haptic(food.userData.royal?[45,30,90]:35);
    addParticleBurst(food.position.clone(),0xffe866,food.userData.royal?42:24);sound(food.userData.royal?'coin':'eat');showCombo(food.userData.royal?t('royalStar')+' +'+(10+bonus+boostBonus+royalBonus):(boosting?t('boostBonus')+' +'+(10+bonus+boostBonus):(gameState.session.comboCount>1?'COMBO x'+gameState.session.comboCount:' +10')));
    if(gameState.progression.starCount>=2&&!gameState.progression.invasionReady){gameState.progression.invasionReady=true;nextNpcRaid=performance.now()+1600;showEvent(t('raidInvader'),1800)}
    spawnFood();maybeLevelUp();updateHUD();
  }
  if(gotCoin){
    score+=25;addParticleBurst(coin.position.clone(),0xffc52f,30);scene.remove(coin);coin=null;sound('coin');showCombo('+25');flash();maybeLevelUp();updateHUD();
  }
}
function setDir(x,z){
  if(!gameState.session.isRunning||gameState.session.isPaused)return;
  if(direction.x===-x&&direction.z===-z)return;
  nextDirection={x,z};sound('turn');
}
function togglePause(){
  if(gameState.session.isDead||!gameState.session.isRunning)return;gameState.session.isPaused=!gameState.session.isPaused;$('pauseBtn').textContent=gameState.session.isPaused?'▶':'Ⅱ';showCombo(gameState.session.isPaused?t('pause'):t('go'));
}
function toggleSound(){gameState.session.soundEnabled=!gameState.session.soundEnabled;$('soundBtn').textContent=gameState.session.soundEnabled?'🔊':'🔇';if(gameState.session.soundEnabled)sound('turn')}
function startGame(){
  audio.resume();startAudioLayers();
  $('start').style.display='none';$('gameover').style.display='none';reset();gameState.session.isRunning=true;sound('start');
}
function restart(){ $('gameover').style.display='none';reset();gameState.session.isRunning=true;sound('start') }

window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(k))e.preventDefault();
  if(k==='arrowup'||k==='w')setDir(0,-1);
  else if(k==='arrowdown'||k==='s')setDir(0,1);
  else if(k==='arrowleft'||k==='a')setDir(-1,0);
  else if(k==='arrowright'||k==='d')setDir(1,0);
  else if(k===' ')togglePause();
  else if(k==='r')restart();
  else if(k==='m')toggleSound();
  if(k==='shift')boosting=true;
});
window.addEventListener('keyup',e=>{if(e.key==='Shift')boosting=false});
document.querySelectorAll('.pad').forEach(btn=>btn.addEventListener('pointerdown',()=>{
  const m={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[btn.dataset.dir];setDir(m[0],m[1]);
}));
$('boost').addEventListener('pointerdown',()=>boosting=true);$('boost').addEventListener('pointerup',()=>boosting=false);$('boost').addEventListener('pointercancel',()=>boosting=false);
$('startBtn').onclick=startGame;$('restartBtn').onclick=restart;$('pauseBtn').onclick=togglePause;$('soundBtn').onclick=toggleSound;
$('controlsToggle').onclick=()=>{document.body.classList.toggle('dpad');localStorage.setItem('kukac3d-dpad',document.body.classList.contains('dpad')?'1':'0')};
if(localStorage.getItem('kukac3d-dpad')==='1')document.body.classList.add('dpad');
$('helpBtn').onclick=()=>$('help').style.display='grid';$('showHelp').onclick=()=>$('help').style.display='grid';$('closeHelp').onclick=()=>$('help').style.display='none';

let sx=0,sy=0,holdBoostTimer=null;
renderer.domElement.addEventListener('touchstart',e=>{const t=e.touches[0];if(t.clientX>innerWidth*0.68){holdBoostTimer=setTimeout(()=>{boosting=true;haptic(20)},260)}},{passive:true});
renderer.domElement.addEventListener('touchend',()=>{clearTimeout(holdBoostTimer);holdBoostTimer=null;boosting=false},{passive:true});
window.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY},{passive:true});
window.addEventListener('touchend',e=>{
  const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<35)return;
  Math.abs(dx)>Math.abs(dy)?setDir(dx>0?1:-1,0):setDir(0,dy>0?1:-1);
},{passive:true});

function animate(t){
  requestAnimationFrame(animate);
  if(gameState.session.isRunning&&!gameState.session.isPaused&&!gameState.session.isDead){
    const interval=boosting?Math.max(48,baseInterval*0.58):baseInterval;
    if(t-gameState.session.lastStepAt>interval){move();gameState.session.lastStepAt=t}
  }
  if(food){food.rotation.y+=0.035;food.position.y=0.68+Math.sin(t*0.004)*0.12;starLight.visible=true;starLight.position.set(food.position.x,food.position.y+0.35,food.position.z);starLight.intensity=(food.userData.royal?2.8:1.8)+Math.sin(t*0.008)*0.35}else if(!gameState.progression.stolenCollectible)starLight.visible=false
  if(coin){coin.rotation.y+=0.08;coin.rotation.x+=0.025;coin.position.y=0.75+Math.sin(t*0.006)*0.14}
  deco.children.forEach((c,i)=>{if(c.type==='Group')c.position.x+=Math.sin(t*0.00012+i)*0.002});
  snake.forEach((s,i)=>{s.position.y=0.56+Math.sin(t*0.008-i*0.52)*0.035});
  updateParticles();
  updateNPCs(t);updateAudioLayers();

  const targetX=direction.x*1.5,targetZ=direction.z*1.5;
  const tablet=innerWidth>=521&&innerWidth<=1024;
  const portrait=innerHeight>innerWidth;
  const targetY=tablet?(portrait?22:18):19,targetBaseZ=tablet?(portrait?21:19):18;
  const desiredFov=boosting?59:52;camera.fov+=(desiredFov-camera.fov)*0.08;camera.updateProjectionMatrix();
  camera.position.y+=(targetY-camera.position.y)*0.025;
  camera.position.x+=(targetX-camera.position.x)*0.02;
  camera.position.z+=(targetBaseZ+targetZ-camera.position.z)*0.02;
  if(shake>0){camera.position.x+=(rand()-0.5)*shake;camera.position.y+=(rand()-0.5)*shake;shake*=0.9}
  camera.lookAt(0,0,0);
  renderer.render(scene,camera);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&gameState.session.isRunning&&!gameState.session.isPaused&&!gameState.session.isDead){gameState.session.isPaused=true;$('pauseBtn').textContent='▶';showCombo(t('pause'))}});
window.addEventListener('orientationchange',()=>setTimeout(()=>window.dispatchEvent(new Event('resize')),120));
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
});
if(qaMode){
  window.__KUKAC_QA__={
    snapshot:()=>({lives:gameState.player.lifeCount,shield:gameState.player.shieldCharges,score,level,food:!!food,stolen:!!gameState.progression.stolenCollectible,dead:gameState.session.isDead,inBounds:snake.every(s=>Math.abs(Math.round(s.position.x))<=9&&Math.abs(Math.round(s.position.z))<=9)}),
    collide:()=>{gameState.player.invulnerableUntilMs=0;handleCollision();return window.__KUKAC_QA__.snapshot()},
    setScore:v=>{score=v;updateHUD();return score},
    setLevel:v=>{level=v;return level},
    forceInvasion:kind=>spawnNpcRaid(performance.now(),kind),
    triggerRoyal:()=>{triggerRoyalEvent(performance.now());return {royal:gameState.progression.royalOn,foodRoyal:!!(food&&food.userData.royal)}},
    triggerDragon:()=>{level=Math.max(level,4);gameState.progression.dragonTriggered=false;triggerDragonEvent(performance.now());return gameState.progression.dragonTriggered},
    ensureCollectible:()=>{if(!food&&!gameState.progression.stolenCollectible)spawnFood();return !!food}
  };
}
buildCrowd();
reset();gameState.session.isRunning=false;requestAnimationFrame(animate);
})();
