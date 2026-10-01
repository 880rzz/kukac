import fs from 'node:fs';

const required=['index.html','styles.css','i18n.js','world.js','actors.js','audio.js','account.js','game.js','package.json','README.md'];
for(const file of required)if(!fs.existsSync(file))throw Error(`Missing ${file}`);
for(const removed of ['vercel.json','.env.example'])if(fs.existsSync(removed))throw Error(`Backend artifact remains: ${removed}`);
if(fs.existsSync('api')&&fs.readdirSync('api',{recursive:true}).some(path=>fs.statSync(`api/${path}`).isFile()))throw Error('Backend API files remain');
const html=fs.readFileSync('index.html','utf8'),account=fs.readFileSync('account.js','utf8'),i18n=fs.readFileSync('i18n.js','utf8');
for(const ref of ['styles.css','i18n.js','world.js','actors.js','audio.js','account.js','game.js'])if(!html.includes(ref))throw Error(`Missing asset ${ref}`);
for(const id of ['account','leaderboard','playerProfile','loginForm','registerForm','recoverForm','backupFileInput','exportBackupBtn','copyBackupBtn'])if(!html.includes(`id="${id}"`))throw Error(`Missing #${id}`);
for(const file of ['i18n.js','world.js','actors.js','audio.js','account.js','game.js'])new Function(fs.readFileSync(file,'utf8'));
for(const token of ['PBKDF2','210000','crypto.subtle','KUKAC_ARCADE_BACKUP','localStorage','submitRun','backupString'])if(!account.includes(token))throw Error(`Missing local account control: ${token}`);
for(const forbidden of ['/api/','@neondatabase','DATABASE_URL','scrypt'])if(account.includes(forbidden)||html.includes(forbidden))throw Error(`Backend reference remains: ${forbidden}`);
for(const locale of ['de','tr','uk','hu','en'])if(!new RegExp(`(?:^|\\n)${locale}:\\{`).test(i18n))throw Error(`Missing locale ${locale}`);
for(const token of ['localOnlyNotice','exportBackupButton','copyBackupButton','backupRestored'])if((i18n.match(new RegExp(`${token}:`,'g'))||[]).length!==5)throw Error(`Incomplete translations: ${token}`);
console.log('Static Pages-only account checks passed');
