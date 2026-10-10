import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
for(const file of ['styles.css','i18n.js','world.js','actors.js','audio.js','game.js']){if(!fs.existsSync(file)||!html.includes(file))throw Error('Missing asset '+file)}
for(const file of ['i18n.js','world.js','actors.js','audio.js','game.js'])new Function(fs.readFileSync(file,'utf8'));
for(const id of ['startBtn','controls','boost','rotateHint','startLangSelect'])if(!html.includes('id="'+id+'"'))throw Error('Missing #'+id);
for(const forbidden of ['id="loginForm"','id="registerForm"','id="accountBtn"','src="account.js"'])if(html.includes(forbidden))throw Error('Legacy account UI '+forbidden);
if(/requireProfile|KUKAC_ACCOUNT/.test(fs.readFileSync('game.js','utf8')))throw Error('Legacy account code remains');
if(!html.includes('id="gyroToggle"'))throw Error('Gyroscope toggle missing');
console.log('Guest-only static checks passed');
