
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
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,200);
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
let running=false, paused=false, soundOn=true, dead=false, combo=0, comboTimer=0, lastMove=0;
let baseInterval=155, boosting=false, shake=0, audioCtx=null;
let npcs=[], crowd=[], nextNpcRaid=Infinity;
let starsCollected=0, invasionUnlocked=false, stolenStar=null, royalActive=false, royalUntil=0, nextRoyalScore=160, dragonEventDone=false;
const gameState={
  player:{lifeCount:5,shieldCharges:3,invulnerableUntilMs:0},
  world:{crowdMood:'calm',crowdMoodUntil:0},
  audio:{ambience:null,tension:null},
  qa:{enabled:qaMode}
};

const $=id=>document.getElementById(id);

const I18N={
de:{
scoreLabel:'Punkte',levelLabel:'Level',bestLabel:'Rekord',levelBanner:'LEVEL',nextLevel:'Nächstes Level:',pointsWord:'Punkte',ruleMove:'↔ BEWEGEN',ruleStar:'⭐ STERN HOLEN',ruleSurvive:'⚠ NICHT CRASHEN',eventRoyal:'KÖNIGLICHES EVENT',eventDragon:'DRACHENANGRIFF',starSaved:'STERN GERETTET +20',boostBonus:'BOOST-BONUS',lifeLost:'LEBEN VERLOREN',bounce:'ABGEPRALLT',lastLife:'LETZTES LEBEN',shieldHit:'SCHILD',royalStar:'KÖNIGSSTERN',
intro:'Die klassische Snake-Idee als modernes 3D-Arcade-Spiel. Sammle Sterne und Münzen, weiche Hindernissen aus, baue Combos auf und erreiche immer schnellere Levels.',
keyboardTitle:'⌨️ Tastatur',keyboardText:'Pfeile oder WASD · Leertaste = Pause · Shift = Boost',mobileTitle:'📱 Mobil',mobileText:'Richtungstasten oder Wischen · BOOST = Beschleunigen',starTitle:'⭐ Stern',starText:'+10 Punkte, der Wurm wird länger und die Combo steigt.',coinTitle:'🪙 Goldmünze',coinText:'Seltener Bonus: +25 Punkte, ohne Wachstum.',
startBtn:'SPIEL STARTEN',helpBtnText:'Vollständige Anleitung',helpTitle:'Wie <em>spielst du?</em>',
helpGoal:'<b>Ziel:</b> Sammle so viele Punkte wie möglich, ohne gegen Wände, Hindernisse oder dich selbst zu stoßen.',helpScore:'<b>Punkte:</b> Stern +10, seltene Goldmünze +25. Schnelles Sammeln baut einen Combo-Bonus auf.',helpLevels:'<b>Levels:</b> Alle 80 Punkte beginnt ein neues Level. Tempo und Hindernisse nehmen zu.',helpBoost:'<b>Boost:</b> Shift oder BOOST auf Mobilgeräten. Schneller, aber riskanter.',helpControls:'<b>Steuerung:</b> Pfeile/WASD, D-Pad oder Wischen. Leertaste: Pause, R: Neustart, M: Ton.',helpInvaders:'<b>Eindringlinge:</b> Soldaten, Drachen und Retro-Helden laufen aufs Feld. Du hast 5 Leben. Beim ersten Leben schützen dich 3 Schilde; danach kostet jeder schwere Treffer ein Leben.',helpRecord:'<b>Rekord:</b> Der Browser speichert deinen Bestwert lokal.',understood:'VERSTANDEN',gameOverTitle:'SPIEL <em>VORBEI</em>',restartBtn:'NOCHMAL',
raidDragon:'DRACHE!',raidInvader:'EINDRINGLING!',stolen:'GESTOHLEN! -5',collision:'TREFFER!',pause:'PAUSE',go:'LOS',result:(s,l,b)=>`Punkte: <b>${s}</b> · Level: <b>${l}</b> · Rekord: <b>${b}</b>`
},
tr:{
scoreLabel:'Puan',levelLabel:'Seviye',bestLabel:'Rekor',levelBanner:'SEVİYE',nextLevel:'Sonraki seviye:',pointsWord:'puan',ruleMove:'↔ HAREKET',ruleStar:'⭐ YILDIZI AL',ruleSurvive:'⚠ ÇARPMA',eventRoyal:'KRALİYET ETKİNLİĞİ',eventDragon:'EJDERHA SALDIRISI',starSaved:'YILDIZ KURTARILDI +20',boostBonus:'BOOST BONUSU',lifeLost:'CAN KAYBEDİLDİ',bounce:'SEKME',lastLife:'SON CAN',shieldHit:'KALKAN',royalStar:'KRALİYET YILDIZI',
intro:'Klasik Snake fikrinin modern 3D arcade yorumu. Yıldız ve para topla, engellerden kaç, kombo yap ve giderek hızlanan seviyelere ulaş.',
keyboardTitle:'⌨️ Klavye',keyboardText:'Ok tuşları veya WASD · Boşluk = Duraklat · Shift = Hızlan',mobileTitle:'📱 Mobil',mobileText:'Yön tuşları veya kaydırma · BOOST = Hızlan',starTitle:'⭐ Yıldız',starText:'+10 puan, solucan uzar ve kombo artar.',coinTitle:'🪙 Altın para',coinText:'Nadir bonus: +25 puan, uzatma yok.',
startBtn:'OYUNU BAŞLAT',helpBtnText:'Tam kullanım kılavuzu',helpTitle:'Nasıl <em>oynanır?</em>',
helpGoal:'<b>Amaç:</b> Duvara, engele veya kendi gövdende çarpmadan olabildiğince çok puan topla.',helpScore:'<b>Puanlama:</b> Yıldız +10, nadir altın para +25. Hızlı toplama kombo bonusu verir.',helpLevels:'<b>Seviyeler:</b> Her 80 puanda yeni seviye başlar. Hız ve engeller artar.',helpBoost:'<b>Boost:</b> Shift veya mobilde BOOST. Daha hızlı ama daha riskli.',helpControls:'<b>Kontrol:</b> Oklar/WASD, D-pad veya kaydırma. Boşluk: duraklat, R: yeniden başlat, M: ses.',helpInvaders:'<b>Davetsizler:</b> Askerler, ejderhalar ve retro kahramanlar sahaya girer. 5 canın var. İlk canda 3 kalkan hakkın vardır; sonra her ağır çarpışma bir can götürür.',helpRecord:'<b>Rekor:</b> En yüksek skor tarayıcıda yerel olarak saklanır.',understood:'ANLADIM',gameOverTitle:'OYUN <em>BİTTİ</em>',restartBtn:'TEKRAR',
raidDragon:'EJDERHA!',raidInvader:'DAVETSİZ!',stolen:'ÇALINDI! -5',collision:'ÇARPIŞMA!',pause:'DURAKLAT',go:'DEVAM',result:(s,l,b)=>`Puan: <b>${s}</b> · Seviye: <b>${l}</b> · Rekor: <b>${b}</b>`
},
uk:{
scoreLabel:'Очки',levelLabel:'Рівень',bestLabel:'Рекорд',levelBanner:'РІВЕНЬ',nextLevel:'Наступний рівень:',pointsWord:'очок',ruleMove:'↔ РУХАЙСЯ',ruleStar:'⭐ ВІЗЬМИ ЗІРКУ',ruleSurvive:'⚠ НЕ ВРІЖСЯ',eventRoyal:'КОРОЛІВСЬКА ПОДІЯ',eventDragon:'АТАКА ДРАКОНА',starSaved:'ЗІРКУ ВРЯТОВАНО +20',boostBonus:'BOOST-БОНУС',lifeLost:'ЖИТТЯ ВТРАЧЕНО',bounce:'ВІДСКОК',lastLife:'ОСТАННЄ ЖИТТЯ',shieldHit:'ЩИТ',royalStar:'КОРОЛІВСЬКА ЗІРКА',
intro:'Сучасна 3D-аркадна версія класичної Snake. Збирай зірки й монети, оминай перешкоди, будуй комбо та переходь на дедалі швидші рівні.',
keyboardTitle:'⌨️ Клавіатура',keyboardText:'Стрілки або WASD · Пробіл = пауза · Shift = прискорення',mobileTitle:'📱 Мобільний',mobileText:'Кнопки напрямку або свайп · BOOST = прискорення',starTitle:'⭐ Зірка',starText:'+10 очок, черв’як стає довшим, а комбо зростає.',coinTitle:'🪙 Золота монета',coinText:'Рідкісний бонус: +25 очок без збільшення довжини.',
startBtn:'ПОЧАТИ ГРУ',helpBtnText:'Повна інструкція',helpTitle:'Як <em>грати?</em>',
helpGoal:'<b>Мета:</b> Набери якомога більше очок, не врізаючись у стіни, перешкоди чи власне тіло.',helpScore:'<b>Очки:</b> Зірка +10, рідкісна золота монета +25. Швидкий збір дає бонус-комбо.',helpLevels:'<b>Рівні:</b> Кожні 80 очок починається новий рівень. Швидкість і кількість перешкод зростають.',helpBoost:'<b>Boost:</b> Shift або кнопка BOOST на мобільному. Швидше, але ризикованіше.',helpControls:'<b>Керування:</b> Стрілки/WASD, D-pad або свайп. Пробіл: пауза, R: рестарт, M: звук.',helpInvaders:'<b>Порушники:</b> Солдати, дракони й ретро-герої вибігають на поле. Є 5 життів. На першому житті тебе захищають 3 щити; далі кожне серйозне зіткнення забирає життя.',helpRecord:'<b>Рекорд:</b> Найкращий результат зберігається локально у браузері.',understood:'ЗРОЗУМІЛО',gameOverTitle:'ГРУ <em>ЗАВЕРШЕНО</em>',restartBtn:'ЩЕ РАЗ',
raidDragon:'ДРАКОН!',raidInvader:'ПОРУШНИК!',stolen:'ВКРАЛИ! -5',collision:'ЗІТКНЕННЯ!',pause:'ПАУЗА',go:'СТАРТ',result:(s,l,b)=>`Очки: <b>${s}</b> · Рівень: <b>${l}</b> · Рекорд: <b>${b}</b>`
},
hu:{
scoreLabel:'Pont',levelLabel:'Szint',bestLabel:'Rekord',levelBanner:'SZINT',nextLevel:'Következő szint:',pointsWord:'pont',ruleMove:'↔ MOZOGJ',ruleStar:'⭐ SZEREZD MEG',ruleSurvive:'⚠ NE ÜTKÖZZ',eventRoyal:'KIRÁLYI ESEMÉNY',eventDragon:'SÁRKÁNYTÁMADÁS',starSaved:'CSILLAG MEGMENTVE +20',boostBonus:'BOOST BÓNUSZ',lifeLost:'ÉLET ELVESZETT',bounce:'LEPATTANÁS',lastLife:'UTOLSÓ ÉLET',shieldHit:'PAJZS',royalStar:'KIRÁLYI CSILLAG',
intro:'A klasszikus Snake modern, látványos 3D arcade újragondolása. Gyűjts csillagokat és érméket, kerüld az akadályokat, építs kombót és juss egyre gyorsabb szintekre.',
keyboardTitle:'⌨️ Billentyűzet',keyboardText:'Nyilak vagy WASD · Space = szünet · Shift = boost',mobileTitle:'📱 Mobil',mobileText:'Iránygombok vagy húzás · BOOST = gyorsítás',starTitle:'⭐ Csillag',starText:'+10 pont, hosszabb leszel és nő a kombó.',coinTitle:'🪙 Arany érme',coinText:'Ritka bónusz: +25 pont, nem növeszt.',
startBtn:'JÁTÉK INDÍTÁSA',helpBtnText:'Teljes használati útmutató',helpTitle:'Hogyan <em>játssz?</em>',
helpGoal:'<b>Cél:</b> Gyűjts minél több pontot anélkül, hogy falnak, akadálynak vagy saját magadnak ütköznél.',helpScore:'<b>Pontozás:</b> Csillag +10, ritka arany érme +25. Gyors gyűjtéssel kombóbónuszt építesz.',helpLevels:'<b>Szintek:</b> 80 pontonként új szint jön. Nő a sebesség és az akadályok száma.',helpBoost:'<b>Boost:</b> Shift vagy mobilon BOOST. Gyorsabb, de kockázatosabb.',helpControls:'<b>Irányítás:</b> Nyilak/WASD, D-pad vagy húzógesztus. Space: szünet, R: újrakezdés, M: hang.',helpInvaders:'<b>Betolakodók:</b> Katonák, sárkányok és retro hősök berohannak. 5 életed van. Az első életnél 3 pajzs véd, utána minden komoly ütközés egy életet vesz le.',helpRecord:'<b>Rekord:</b> A böngésző helyben elmenti a legjobb pontszámot.',understood:'ÉRTEM',gameOverTitle:'JÁTÉK <em>VÉGE</em>',restartBtn:'ÚJRA',
raidDragon:'SÁRKÁNY!',raidInvader:'BETOLAKODÓ!',stolen:'ELLOPTÁK! -5',collision:'ÜTKÖZÉS!',pause:'SZÜNET',go:'RAJT',result:(s,l,b)=>`Pontszám: <b>${s}</b> · Szint: <b>${l}</b> · Rekord: <b>${b}</b>`
},
en:{
scoreLabel:'Score',levelLabel:'Level',bestLabel:'Best',levelBanner:'LEVEL',nextLevel:'Next level:',pointsWord:'points',ruleMove:'↔ MOVE',ruleStar:'⭐ GET THE STAR',ruleSurvive:'⚠ DON’T CRASH',eventRoyal:'ROYAL EVENT',eventDragon:'DRAGON ATTACK',starSaved:'STAR SAVED +20',boostBonus:'BOOST BONUS',lifeLost:'LIFE LOST',bounce:'BOUNCE',lastLife:'LAST LIFE',shieldHit:'SHIELD',royalStar:'ROYAL STAR',
intro:'A modern 3D arcade take on classic Snake. Collect stars and coins, dodge obstacles, build combos and reach increasingly faster levels.',
keyboardTitle:'⌨️ Keyboard',keyboardText:'Arrow keys or WASD · Space = pause · Shift = boost',mobileTitle:'📱 Mobile',mobileText:'Direction buttons or swipe · BOOST = speed up',starTitle:'⭐ Star',starText:'+10 points, you grow longer and your combo increases.',coinTitle:'🪙 Gold coin',coinText:'Rare bonus: +25 points without growing.',
startBtn:'START GAME',helpBtnText:'Full instructions',helpTitle:'How to <em>play?</em>',
helpGoal:'<b>Goal:</b> Score as many points as possible without hitting walls, obstacles or yourself.',helpScore:'<b>Scoring:</b> Star +10, rare gold coin +25. Fast pickups build a combo bonus.',helpLevels:'<b>Levels:</b> A new level starts every 80 points. Speed and obstacles increase.',helpBoost:'<b>Boost:</b> Shift or BOOST on mobile. Faster, but riskier.',helpControls:'<b>Controls:</b> Arrows/WASD, D-pad or swipe. Space: pause, R: restart, M: sound.',helpInvaders:'<b>Invaders:</b> Soldiers, dragons and retro heroes enter the field. You have 5 gameState.player.lifeCount. On the first life you get 3 shields; after that every major collision costs one life.',helpRecord:'<b>Best score:</b> Your browser stores the high score locally.',understood:'GOT IT',gameOverTitle:'GAME <em>OVER</em>',restartBtn:'AGAIN',
raidDragon:'DRAGON!',raidInvader:'INVADER!',stolen:'STOLEN! -5',collision:'HIT!',pause:'PAUSE',go:'GO',result:(s,l,b)=>`Score: <b>${s}</b> · Level: <b>${l}</b> · Best: <b>${b}</b>`
}
};
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

function mat(color,rough=.55,metal=.04){
  return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
}
const headMat=mat(0x4dde5b,.36,.08), bodyMat=mat(0x2fbd4a,.48,.03);
const bodyAlt=mat(0x22a83d,.5,.02), brickMat=mat(0xc85a31,.7,.02);
const goldMat=new THREE.MeshStandardMaterial({color:0xffce38,roughness:.3,metalness:.65,emissive:0x7a3f00,emissiveIntensity:.18});
const starMat=new THREE.MeshStandardMaterial({color:0xffe866,roughness:.28,metalness:.16,emissive:0x8a5c00,emissiveIntensity:.28});

function buildWorld(){
  while(world.children.length) world.remove(world.children[0]);
  while(deco.children.length) deco.remove(deco.children[0]);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(GRID+1,.6,GRID+1),mat(0x66c84b,.78));
  floor.position.y=-.35;floor.receiveShadow=true;world.add(floor);

  const tileMat=mat(0x79d65e,.72);
  const tileGeo=new THREE.BoxGeometry(.92,.08,.92);
  for(let x=-9;x<=9;x++) for(let z=-9;z<=9;z++){
    if((x+z)%2===0){
      const t=new THREE.Mesh(tileGeo,tileMat);t.position.set(x,.02,z);t.receiveShadow=true;world.add(t);
    }
  }
  const wallMat=mat(0xd88b38,.65);
  for(let i=-10;i<=10;i++){
    [[i,-10],[i,10],[-10,i],[10,i]].forEach(([x,z])=>{
      const b=new THREE.Mesh(new THREE.BoxGeometry(.92,.78,.92),wallMat);
      b.position.set(x,.12,z);b.castShadow=true;b.receiveShadow=true;world.add(b);
    });
  }
  const under=new THREE.Mesh(new THREE.BoxGeometry(GRID+5,1.8,GRID+5),mat(0x98612c,.95));
  under.position.y=-1.55;world.add(under);

  for(let i=0;i<13;i++){
    const cloud=new THREE.Group();
    for(let p=0;p<3;p++){
      const c=new THREE.Mesh(new THREE.SphereGeometry(.7+rand()*.5,12,10),mat(0xffffff,.95));
      c.position.set((p-1)*.65,rand()*.2,0);cloud.add(c);
    }
    const a=i/13*Math.PI*2,r=22+rand()*9;
    cloud.position.set(Math.cos(a)*r,7+rand()*6,Math.sin(a)*r);
    cloud.scale.setScalar(.8+rand()*1.3);deco.add(cloud);
  }
  for(let i=0;i<14;i++){
    const hill=new THREE.Mesh(new THREE.ConeGeometry(3+rand()*3,5+rand()*5,7),mat(i%2?0x5fae39:0x438c31,.9));
    const a=i/14*Math.PI*2,r=18+rand()*7;
    hill.position.set(Math.cos(a)*r,1,Math.sin(a)*r);hill.rotation.y=rand()*Math.PI;deco.add(hill);
  }
}
buildWorld();


function addPart(parent,geo,color,pos,rot){
  const m=new THREE.Mesh(geo,mat(color,.52,.04));
  m.position.set(pos[0],pos[1],pos[2]);
  if(rot)m.rotation.set(rot[0],rot[1],rot[2]);
  m.castShadow=true;parent.add(m);return m;
}
function makeHumanoid(kind='fan',shirt=0x3a83e8){
  const g=new THREE.Group(),skin=0xf0b27a;
  addPart(g,new THREE.SphereGeometry(.22,12,10),skin,[0,1.45,0]);
  addPart(g,new THREE.BoxGeometry(.42,.62,.3),shirt,[0,1.02,0]);
  addPart(g,new THREE.BoxGeometry(.14,.55,.14),0x26354a,[-.14,.48,0]);
  addPart(g,new THREE.BoxGeometry(.14,.55,.14),0x26354a,[.14,.48,0]);
  const la=addPart(g,new THREE.BoxGeometry(.12,.52,.12),skin,[-.31,1.02,0]);
  const ra=addPart(g,new THREE.BoxGeometry(.12,.52,.12),skin,[.31,1.02,0]);
  g.userData.arms=[la,ra];g.userData.kind=kind;

  if(kind==='queen'){
    addPart(g,new THREE.ConeGeometry(.42,.62,14),0xe95cae,[0,.88,0]);
    addPart(g,new THREE.CylinderGeometry(.19,.25,.18,10),0xffd447,[0,1.75,0]);
    for(let i=0;i<5;i++)addPart(g,new THREE.ConeGeometry(.055,.16,6),0xffd447,[(i-2)*.08,1.91,0]);
  } else if(kind==='soldier'){
    addPart(g,new THREE.CylinderGeometry(.24,.27,.28,14),0xc7b37a,[0,1.67,0]);
    addPart(g,new THREE.BoxGeometry(.08,.9,.08),0x6f4a2c,[.38,1.0,0]);
  } else if(kind==='hero'){
    addPart(g,new THREE.CylinderGeometry(.25,.25,.16,16),0xf04a3e,[0,1.7,0]);
    addPart(g,new THREE.BoxGeometry(.34,.12,.28),0xf04a3e,[0,1.64,.08]);
    addPart(g,new THREE.BoxGeometry(.34,.38,.31),0x2d61d5,[0,.89,0]);
  }
  g.scale.setScalar(kind==='queen'?1.05:.9);
  return g;
}
function makeDragon(){
  const g=new THREE.Group();
  addPart(g,new THREE.SphereGeometry(.42,16,12),0x4caf50,[0,1.05,0]);
  addPart(g,new THREE.ConeGeometry(.38,1.1,10),0x439a46,[0,.62,-.42],[Math.PI/2,0,0]);
  const head=addPart(g,new THREE.SphereGeometry(.31,14,10),0x58bf55,[0,1.16,.48]);
  addPart(g,new THREE.ConeGeometry(.09,.35,8),0xf0e0a0,[-.18,1.42,.53]);
  addPart(g,new THREE.ConeGeometry(.09,.35,8),0xf0e0a0,[.18,1.42,.53]);
  const wingGeo=new THREE.ConeGeometry(.42,.9,3);
  const wl=addPart(g,wingGeo,0x2f7f43,[-.48,1.05,-.05],[0,0,-1.15]);
  const wr=addPart(g,wingGeo,0x2f7f43,[.48,1.05,-.05],[0,0,1.15]);
  g.userData.wings=[wl,wr];g.userData.head=head;g.scale.setScalar(1.15);return g;
}
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
    fan.userData.phase=i*.7;crowdGroup.add(fan);crowd.push(fan);
  }
  const queen=makeHumanoid('queen',0xe95cae);queen.position.set(0,0,-13.2);crowdGroup.add(queen);crowd.push(queen);
  for(let i=0;i<4;i++){
    const s=makeHumanoid('soldier',0xb11f2b);s.position.set(-4.5+i*3,0,-12.8);crowdGroup.add(s);crowd.push(s);
  }
  const dragon=makeDragon();dragon.position.set(8.5,4.6,-14);dragon.userData.phase=1.7;crowdGroup.add(dragon);crowd.push(dragon);
}
function crowdStartFor(kind){
  const source=kind==='dragon'?crowd.find(x=>x.userData.kind==='dragon'||x.userData.wings):kind==='soldier'?crowd.find(x=>x.userData.kind==='soldier'):crowd.filter(x=>x.userData.kind==='fan')[Math.floor(rand()*Math.max(1,crowd.filter(x=>x.userData.kind==='fan').length))];
  return source?source.position.clone():new THREE.Vector3(0,.1,-11.5);
}
function spawnNpcRaid(now,forcedKind=null){
  if(!running||paused||dead)return;
  let pool=level>=4?['hero','soldier','dragon']:level>=2?['hero','soldier']:['hero'];
  if(stolenStar)pool=['soldier'];
  const kind=forcedKind||pool[Math.floor(rand()*pool.length)];
  const obj=kind==='dragon'?makeDragon():makeHumanoid(kind,kind==='hero'?0x38a169:0xb11f2b);
  const start=crowdStartFor(kind);
  if(kind!=='dragon')start.y=.1;
  const target=food?food.position.clone():snake[0].position.clone();
  obj.position.copy(start);obj.lookAt(target.x,obj.position.y,target.z);
  obj.scale.multiplyScalar(kind==='dragon'?1.25:1.2);
  const role=kind==='soldier'?'blocker':'thief';
  obj.userData={...obj.userData,kind,role,state:'in',start:start.clone(),target:target.clone(),born:now,speed:kind==='dragon'?.07:kind==='hero'?.095:.07,steal:false};
  npcGroup.add(obj);npcs.push(obj);
  showCombo(kind==='dragon'?t('raidDragon'):t('raidInvader'));sound('raid');
}
function triggerRoyalEvent(t){
  if(royalActive||dead)return;
  royalActive=true;royalUntil=t+10000;nextRoyalScore+=160;showEvent(t('eventRoyal'),3200);sound('level');setCrowdMood('celebrate',3200);haptic([40,40,80]);
  if(food){food.userData.royal=true;food.scale.setScalar(1.35);starLight.intensity=2.8;}
  const queen=crowd.find(x=>x.userData.kind==='queen');if(queen)queen.scale.setScalar(1.22);
  setTimeout(()=>{if(running&&!dead)spawnNpcRaid(performance.now(),'soldier')},650);
  setTimeout(()=>{if(running&&!dead)spawnNpcRaid(performance.now(),'soldier')},1200);
}
function triggerDragonEvent(t){
  if(dragonEventDone||level<4)return;
  dragonEventDone=true;showEvent(t('eventDragon'),3200);sound('raid');setCrowdMood('danger',3500);haptic([80,50,80]);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1.08,32),new THREE.MeshBasicMaterial({color:0xff4b35,transparent:true,opacity:.72,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;const target=food?food.position:snake[0].position;ring.position.set(target.x,.08,target.z);scene.add(ring);
  let pulse=0;const warn=setInterval(()=>{pulse++;ring.scale.setScalar(1+(pulse%2)*.35);ring.material.opacity=pulse%2?.35:.72},140);
  setTimeout(()=>{clearInterval(warn);scene.remove(ring);if(running&&!dead)spawnNpcRaid(performance.now(),'dragon')},1100);
}
function updateNPCs(t){
  if(t>gameState.world.crowdMoodUntil)gameState.world.crowdMood='calm';
  const moodAmp=gameState.world.crowdMood==='celebrate'?1.35:gameState.world.crowdMood==='danger'?1.05:gameState.world.crowdMood==='tense'?.8:.55;
  crowd.forEach((f,i)=>{
    const a=f.userData.arms;
    if(a){a[0].rotation.z=Math.sin(t*.007+(f.userData.phase||i))*moodAmp;a[1].rotation.z=-Math.sin(t*.007+(f.userData.phase||i))*moodAmp}
    f.position.y=Math.abs(Math.sin(t*.005+(f.userData.phase||i)))*(.05+moodAmp*.06);
    if(f.userData.wings){f.userData.wings[0].rotation.y=Math.sin(t*.005)*.5;f.userData.wings[1].rotation.y=-Math.sin(t*.005)*.5;f.position.x=8.5+Math.sin(t*.0006)*4}
  });
  if(royalActive&&t>royalUntil){royalActive=false;const queen=crowd.find(x=>x.userData.kind==='queen');if(queen)queen.scale.setScalar(1.05)}
  if(invasionUnlocked&&running&&!paused&&!dead&&t>nextNpcRaid){
    spawnNpcRaid(t);nextNpcRaid=t+Math.max(5000,9000-level*450)+rand()*2400;
  }
  if(score>=nextRoyalScore)triggerRoyalEvent(t);
  triggerDragonEvent(t);

  // Star-state watchdog: the game must never remain permanently without a collectible.
  if(!food&&!stolenStar&&running&&!dead)spawnFood();
  if(stolenStar){
    const owner=stolenStar.userData.thief;
    const ownerAlive=owner&&npcs.includes(owner)&&owner.userData.state==='escape';
    const stolenTooLong=ownerAlive&&owner.userData.stolenAt&&t-owner.userData.stolenAt>9000;
    if(!ownerAlive||stolenTooLong){
      if(ownerAlive){npcGroup.remove(owner);npcs=npcs.filter(x=>x!==owner)}
      scene.remove(stolenStar);stolenStar=null;
      if(running&&!dead)spawnFood();
    }
  }

  npcs.slice().forEach(n=>{
    const d=n.userData;if(paused||dead)return;
    if(d.wings){d.wings[0].rotation.y=Math.sin(t*.012)*.7;d.wings[1].rotation.y=-Math.sin(t*.012)*.7}
    let dest;
    if(d.state==='escape')dest=d.start;
    else if(d.role==='blocker'&&snake[0])dest=snake[0].position.clone().add(new THREE.Vector3(direction.x*2,0,direction.z*2));
    else dest=food?food.position:d.target;

    const v=dest.clone().sub(n.position);
    v.y=d.kind==='dragon'&&d.state!=='escape'?(dest.y+1.7-n.position.y):0;
    if(v.length()>.18){v.normalize();n.position.add(v.multiplyScalar(d.speed*(d.state==='escape'?1.18:1)));n.lookAt(dest.x,n.position.y,dest.z)}

    if(d.role==='thief'&&d.state==='in'&&food){
      const dx=n.position.x-food.position.x,dz=n.position.z-food.position.z;
      if(Math.hypot(dx,dz)<1.0){
        d.state='escape';d.steal=true;d.stolenAt=t;stolenStar=food;food=null;
        stolenStar.userData.thief=n;setCrowdMood('danger',1800);haptic([70,40,70]);showCombo(t('stolen'));sound('steal');showEvent(t('stolen'),1700);
      }
    }
    if(d.state==='escape'&&stolenStar&&stolenStar.userData.thief===n){
      stolenStar.position.set(n.position.x,n.position.y+1.35,n.position.z);stolenStar.rotation.y+=.12;starLight.position.set(stolenStar.position.x,stolenStar.position.y+.4,stolenStar.position.z);
      if(snake[0]&&Math.hypot(n.position.x-snake[0].position.x,n.position.z-snake[0].position.z)<1.05){
        score+=20;addParticleBurst(stolenStar.position.clone(),0xffe866,34);scene.remove(stolenStar);stolenStar=null;
        setCrowdMood('celebrate',1800);haptic([35,25,80]);showCombo(t('starSaved'));sound('coin');npcGroup.remove(n);npcs=npcs.filter(x=>x!==n);spawnFood();updateHUD();return;
      }
      if(Math.hypot(n.position.x-d.start.x,n.position.z-d.start.z)<.45){
        score=Math.max(0,score-5);scene.remove(stolenStar);stolenStar=null;showCombo(t('stolen'));updateHUD();
        npcGroup.remove(n);npcs=npcs.filter(x=>x!==n);setTimeout(()=>{if(!food&&!dead)spawnFood()},350);return;
      }
    } else if(d.state==='escape'&&Math.hypot(n.position.x-d.start.x,n.position.z-d.start.z)<.45){
      npcGroup.remove(n);npcs=npcs.filter(x=>x!==n);return;
    }

    if(d.role==='blocker'&&snake[0]&&Math.hypot(n.position.x-snake[0].position.x,n.position.z-snake[0].position.z)<.68){handleCollision();d.state='escape'}
    if(d.role==='thief'&&d.state==='in'&&snake[0]&&Math.hypot(n.position.x-snake[0].position.x,n.position.z-snake[0].position.z)<.62){shake=.45;d.state='escape'}
  });
}

function sphereSegment(isHead=false){
  const g=new THREE.Group();
  const core=new THREE.Mesh(new THREE.SphereGeometry(isHead?.55:.47,20,16),isHead?headMat:(snake.length%2?bodyMat:bodyAlt));
  core.castShadow=true;core.receiveShadow=true;g.add(core);
  if(isHead){
    [-.20,.20].forEach(x=>{
      const eye=new THREE.Mesh(new THREE.SphereGeometry(.105,10,8),mat(0xffffff,.25));
      eye.position.set(x,.18,.45);
      const pupil=new THREE.Mesh(new THREE.SphereGeometry(.052,8,6),mat(0x172238,.3));
      pupil.position.set(0,0,.085);eye.add(pupil);g.add(eye);
    });
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(.42,.50,.18,18),mat(0xe83e36,.42));
    cap.rotation.x=Math.PI/2;cap.position.set(0,.42,-.02);g.add(cap);
    const bill=new THREE.Mesh(new THREE.BoxGeometry(.65,.08,.27),mat(0xe83e36,.42));
    bill.position.set(0,.40,.33);g.add(bill);
  }
  return g;
}

function rotateHead(){
  if(!snake[0])return;
  const d=direction;
  snake[0].rotation.y=d.x===1?Math.PI/2:d.x===-1?-Math.PI/2:d.z===1?Math.PI:0;
}
function gridPos(x,z){return new THREE.Vector3(x,.56,z)}
function clearActors(){
  snake.forEach(o=>scene.remove(o));snake=[];
  if(food)scene.remove(food);if(coin)scene.remove(coin);food=coin=null;
  obstacles.forEach(o=>scene.remove(o.mesh));obstacles=[];
  while(particles.children.length)particles.remove(particles.children[0]);
}
function reset(){
  clearActors();while(npcGroup.children.length)npcGroup.remove(npcGroup.children[0]);npcs=[];if(stolenStar)scene.remove(stolenStar);stolenStar=null;score=0;level=1;combo=0;gameState.player.lifeCount=5;gameState.player.shieldCharges=3;gameState.player.invulnerableUntilMs=0;gameState.world.crowdMood='calm';gameState.world.crowdMoodUntil=0;starsCollected=0;invasionUnlocked=false;royalActive=false;royalUntil=0;nextRoyalScore=160;dragonEventDone=false;dead=false;paused=false;baseInterval=155;direction={x:1,z:0};nextDirection={x:1,z:0};nextNpcRaid=Infinity;
  for(let i=0;i<4;i++){
    const s=sphereSegment(i===0);s.position.copy(gridPos(-i,0));scene.add(s);snake.push(s);
  }
  rotateHead();spawnFood();buildObstacles();updateHUD();applyTheme();lastMove=performance.now();
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
    const a=-Math.PI/2+i*Math.PI/5,r=i%2===0?.58:.26;
    const x=Math.cos(a)*r,y=Math.sin(a)*r;
    i?shape.lineTo(x,y):shape.moveTo(x,y);
  }
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.07,bevelThickness:.07});
  geo.center();
  const m=new THREE.Mesh(geo,starMat);m.castShadow=true;return m;
}
function spawnFood(){
  if(food)scene.remove(food);
  const p=randomCell();food=makeStar();food.position.set(p.x,.68,p.z);food.rotation.x=-.15;food.userData.royal=false;scene.add(food);
  starLight.position.set(p.x,1.1,p.z);starLight.intensity=1.8;starLight.visible=true;
  if(rand()<.22 && !coin)spawnCoin();
}
function spawnCoin(){
  const p=randomCell();
  coin=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.13,24),goldMat);
  coin.rotation.z=Math.PI/2;coin.position.set(p.x,.75,p.z);coin.castShadow=true;scene.add(coin);
}
function buildObstacles(){
  obstacles.forEach(o=>scene.remove(o.mesh));obstacles=[];
  const count=Math.min(2+(level-1)*2,12);
  for(let i=0;i<count;i++){
    let p=randomCell();
    if(Math.abs(p.x)<3&&Math.abs(p.z)<2){i--;continue}
    const mesh=new THREE.Group();
    const block=new THREE.Mesh(new THREE.BoxGeometry(.9,.75,.9),brickMat);block.castShadow=true;block.receiveShadow=true;mesh.add(block);
    for(let y=-.22;y<=.22;y+=.44){
      const seam=new THREE.Mesh(new THREE.BoxGeometry(.94,.025,.94),mat(0x8d3f25,.9));seam.position.y=y;mesh.add(seam);
    }
    mesh.position.set(p.x,.4,p.z);scene.add(mesh);obstacles.push({x:p.x,z:p.z,mesh});
  }
}
function addParticleBurst(pos,color=0xffe866,count=20){
  const geo=new THREE.SphereGeometry(.065,5,4);
  for(let i=0;i<count;i++){
    const p=new THREE.Mesh(geo,mat(color,.4,.1));p.position.copy(pos);
    p.userData.v=new THREE.Vector3((rand()-.5)*.16,rand()*.14+.04,(rand()-.5)*.16);
    p.userData.life=1;particles.add(p);
  }
}
function updateParticles(){
  [...particles.children].forEach(p=>{
    p.position.add(p.userData.v);p.userData.v.y-=.006;p.userData.life-=.035;p.scale.setScalar(Math.max(0,p.userData.life));
    if(p.userData.life<=0)particles.remove(p);
  });
}
function startAudioLayers(){
  if(!audioCtx||gameState.audio.ambience)return;
  const makeLayer=(freq,type,vol)=>{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(audioCtx.destination);o.start();return{osc:o,gain:g};
  };
  gameState.audio.ambience=makeLayer(72,'triangle',.006);
  gameState.audio.tension=makeLayer(146,'sine',.0008);
}
function updateAudioLayers(){
  if(!gameState.audio.ambience)return;
  const now=audioCtx.currentTime;
  const tension=Math.max(0,(3-gameState.player.lifeCount))*.002+(royalActive?.003:0)+(stolenStar?.004:0);
  gameState.audio.tension.gain.gain.setTargetAtTime(tension,now,.18);
  gameState.audio.ambience.gain.gain.setTargetAtTime(soundOn?.006:0,now,.18);
}
function sound(type){
  if(!soundOn)return;
  if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  const now=audioCtx.currentTime;
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  osc.connect(gain);gain.connect(audioCtx.destination);
  const sets={
    eat:[520,850,.11,'square'],coin:[900,1500,.16,'sine'],turn:[180,220,.025,'square'],
    level:[330,880,.45,'triangle'],over:[220,80,.55,'sawtooth'],start:[260,660,.24,'triangle'],
    raid:[180,420,.22,'square'],steal:[700,120,.28,'sawtooth']
  };
  const s=sets[type]||sets.eat;osc.type=s[3];osc.frequency.setValueAtTime(s[0],now);osc.frequency.exponentialRampToValueAtTime(Math.max(40,s[1]),now+s[2]);
  gain.gain.setValueAtTime(type==='turn'?.015:.11,now);gain.gain.exponentialRampToValueAtTime(.001,now+s[2]);
  osc.start(now);osc.stop(now+s[2]);
}
function flash(){const e=$('flash');e.classList.remove('go');void e.offsetWidth;e.classList.add('go')}
function showCombo(txt){const e=$('combo');e.textContent=txt;e.classList.remove('show');void e.offsetWidth;e.classList.add('show')}
function showEvent(txt,ms=2200){const e=$('eventPill');e.textContent=txt;e.classList.add('show');clearTimeout(e._timer);e._timer=setTimeout(()=>e.classList.remove('show'),ms)}
function updateHUD(){
  $('score').textContent=score;$('level').textContent=level;$('best').textContent=best;
  $('nextLevel').textContent=level*LEVEL_STEP;
  $('livesHud').textContent='♥'.repeat(Math.max(0,gameState.player.lifeCount))+'♡'.repeat(Math.max(0,5-gameState.player.lifeCount));
  $('shieldHud').textContent=gameState.player.lifeCount===5&&gameState.player.shieldCharges>0?'🛡 ×'+gameState.player.shieldCharges:'';
}
function maybeLevelUp(){
  const target=Math.floor(score/LEVEL_STEP)+1;
  if(target>level){
    level=target;baseInterval=Math.max(72,155-(level-1)*12);buildObstacles();applyTheme();sound('level');flash();
    $('levelBig').textContent=level;const b=$('levelBanner');b.classList.remove('show');void b.offsetWidth;b.classList.add('show');
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
  snake.forEach((s,i)=>{s.scale.setScalar(.78);setTimeout(()=>{if(s.parent)s.scale.setScalar(1)},90+i*6)});
}
function respawnAfterHit(){
  const len=Math.min(Math.max(4,snake.length),361),cells=spiralCells(len);
  snake.forEach(o=>scene.remove(o));snake=[];
  direction={x:1,z:0};nextDirection={x:1,z:0};
  cells.forEach((cell,i)=>{
    const s=sphereSegment(i===0);s.position.copy(gridPos(cell.x,cell.z));scene.add(s);snake.push(s);
  });
  rotateHead();
  npcs.slice().forEach(n=>{
    if(Math.hypot(n.position.x,n.position.z)<5){npcGroup.remove(n);npcs=npcs.filter(x=>x!==n)}
  });
  gameState.player.invulnerableUntilMs=performance.now()+1300;lastMove=performance.now();
}
function handleCollision(){
  if(dead||performance.now()<gameState.player.invulnerableUntilMs)return;
  shake=.7;flash();
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
  if(dead)return;dead=true;running=false;shake=.55;sound('over');
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
    combo=(performance.now()-comboTimer<2500)?combo+1:1;comboTimer=performance.now();
    const royalBonus=food.userData.royal?40:0;
    const bonus=Math.min(combo-1,5)*2,boostBonus=boosting?5:0;score+=10+bonus+boostBonus+royalBonus;starsCollected++;
    setCrowdMood('celebrate',1400);haptic(food.userData.royal?[45,30,90]:35);
    addParticleBurst(food.position.clone(),0xffe866,food.userData.royal?42:24);sound(food.userData.royal?'coin':'eat');showCombo(food.userData.royal?t('royalStar')+' +'+(10+bonus+boostBonus+royalBonus):(boosting?t('boostBonus')+' +'+(10+bonus+boostBonus):(combo>1?'COMBO x'+combo:' +10')));
    if(starsCollected>=2&&!invasionUnlocked){invasionUnlocked=true;nextNpcRaid=performance.now()+1600;showEvent(t('raidInvader'),1800)}
    spawnFood();maybeLevelUp();updateHUD();
  }
  if(gotCoin){
    score+=25;addParticleBurst(coin.position.clone(),0xffc52f,30);scene.remove(coin);coin=null;sound('coin');showCombo('+25');flash();maybeLevelUp();updateHUD();
  }
}
function setDir(x,z){
  if(!running||paused)return;
  if(direction.x===-x&&direction.z===-z)return;
  nextDirection={x,z};sound('turn');
}
function togglePause(){
  if(dead||!running)return;paused=!paused;$('pauseBtn').textContent=paused?'▶':'Ⅱ';showCombo(paused?t('pause'):t('go'));
}
function toggleSound(){soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊':'🔇';if(soundOn)sound('turn')}
function startGame(){
  if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();startAudioLayers();
  $('start').style.display='none';$('gameover').style.display='none';reset();running=true;sound('start');
}
function restart(){ $('gameover').style.display='none';reset();running=true;sound('start') }

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
renderer.domElement.addEventListener('touchstart',e=>{const t=e.touches[0];if(t.clientX>innerWidth*.68){holdBoostTimer=setTimeout(()=>{boosting=true;haptic(20)},260)}},{passive:true});
renderer.domElement.addEventListener('touchend',()=>{clearTimeout(holdBoostTimer);holdBoostTimer=null;boosting=false},{passive:true});
window.addEventListener('touchstart',e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY},{passive:true});
window.addEventListener('touchend',e=>{
  const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<35)return;
  Math.abs(dx)>Math.abs(dy)?setDir(dx>0?1:-1,0):setDir(0,dy>0?1:-1);
},{passive:true});

function animate(t){
  requestAnimationFrame(animate);
  if(running&&!paused&&!dead){
    const interval=boosting?Math.max(48,baseInterval*.58):baseInterval;
    if(t-lastMove>interval){move();lastMove=t}
  }
  if(food){food.rotation.y+=.035;food.position.y=.68+Math.sin(t*.004)*.12;starLight.visible=true;starLight.position.set(food.position.x,food.position.y+.35,food.position.z);starLight.intensity=(food.userData.royal?2.8:1.8)+Math.sin(t*.008)*.35}else if(!stolenStar)starLight.visible=false
  if(coin){coin.rotation.y+=.08;coin.rotation.x+=.025;coin.position.y=.75+Math.sin(t*.006)*.14}
  deco.children.forEach((c,i)=>{if(c.type==='Group')c.position.x+=Math.sin(t*.00012+i)*.002});
  snake.forEach((s,i)=>{s.position.y=.56+Math.sin(t*.008-i*.52)*.035});
  updateParticles();
  updateNPCs(t);updateAudioLayers();

  const targetX=direction.x*1.5,targetZ=direction.z*1.5;
  const tablet=innerWidth>=521&&innerWidth<=1024;
  const portrait=innerHeight>innerWidth;
  const targetY=tablet?(portrait?22:18):19,targetBaseZ=tablet?(portrait?21:19):18;
  const desiredFov=boosting?59:52;camera.fov+=(desiredFov-camera.fov)*.08;camera.updateProjectionMatrix();
  camera.position.y+=(targetY-camera.position.y)*.025;
  camera.position.x+=(targetX-camera.position.x)*.02;
  camera.position.z+=(targetBaseZ+targetZ-camera.position.z)*.02;
  if(shake>0){camera.position.x+=(rand()-.5)*shake;camera.position.y+=(rand()-.5)*shake;shake*=.9}
  camera.lookAt(0,0,0);
  renderer.render(scene,camera);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused&&!dead){paused=true;$('pauseBtn').textContent='▶';showCombo(t('pause'))}});
window.addEventListener('orientationchange',()=>setTimeout(()=>window.dispatchEvent(new Event('resize')),120));
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
});
if(qaMode){
  window.__KUKAC_QA__={
    snapshot:()=>({lives:gameState.player.lifeCount,shield:gameState.player.shieldCharges,score,level,food:!!food,stolen:!!stolenStar,dead}),
    collide:()=>{gameState.player.invulnerableUntilMs=0;handleCollision();return window.__KUKAC_QA__.snapshot()},
    setScore:v=>{score=v;updateHUD();return score},
    setLevel:v=>{level=v;return level},
    forceInvasion:kind=>spawnNpcRaid(performance.now(),kind),
    ensureCollectible:()=>{if(!food&&!stolenStar)spawnFood();return !!food}
  };
}
buildCrowd();
reset();running=false;requestAnimationFrame(animate);
})();
