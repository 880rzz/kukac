# KUKAC 3D — Arcade Snake

Egy látványos, reszponzív, böngészőben futó 3D Snake játék. Az eredeti Nokia-kukac alapmechanikáját modern, színes, klasszikus platformjátékokat idéző arcade-világgal kombinálja — jogvédett karakterek, grafikák és hangminták használata nélkül.

## Indítás

A projekt teljesen statikus.

1. Nyisd meg az `index.html` fájlt modern böngészőben, vagy szolgáld ki statikus webszerverről.
2. Internetkapcsolat szükséges a Three.js CDN-ről történő betöltéséhez.
3. A nyitóképernyőn kattints a **JÁTÉK INDÍTÁSA** gombra. Ez engedélyezi a böngészőben a Web Audio hangeffektusokat is.

GitHub Pages esetén a repó gyökerét kell publikálni.

## Irányítás

### Asztali gép

- **Nyilak / W A S D** — irányítás
- **Shift** — boost / gyorsítás
- **Space** — szünet / folytatás
- **R** — újrakezdés
- **M** — hang ki/be

### Mobil / tablet

- képernyőn lévő **D-pad**
- vagy **húzógesztus** a kívánt irányba
- **BOOST** gomb — gyorsítás

## Játékmenet

- A sárga **csillag** 10 alappontot ér, és egy új szegmenssel megnöveli a kukacot.
- Gyors egymásutánban gyűjtött csillagok **kombó-bónuszt** adnak.
- A ritkán megjelenő **arany érme** +25 pontot ér, és nem hosszabbítja a kukacot.
- Minden **80 pont** után új szint következik.
- Szintlépéskor gyorsul a játék, változik a pálya atmoszférája és több téglás akadály jelenik meg.
- **5 élet** áll rendelkezésre. Az első életet **3 pajzs** védi; ezek elnyelik az első három komoly ütközést. Ezután minden komoly ütközés egy életet vesz le.
- A legjobb pontszám a böngésző `localStorage` tárhelyén helyben megmarad.

## Látvány és hang

A játék Three.js segítségével valós idejű 3D grafikát használ:

- dinamikus fények és árnyékok
- térbeli, csempézett játéktér
- animált kukac
- lebegő csillag és forgó érme
- részecskeeffektek
- pályánként változó háttérhangulat
- kameramozgás és ütközési rázkódás
- reszponzív HUD és mobil vezérlés

A hangeffektek nem hangfájlok: a játék futás közben, a **Web Audio API** segítségével szintetizálja őket. Emiatt nincs külön audio asset és nincs külső hangminta-licenc.

## Technikai követelmények

- modern Chrome, Edge, Safari vagy Firefox
- WebGL
- JavaScript
- Web Audio API
- Three.js r128 CDN

## Fájlok

- `index.html` — HTML shell és HUD
- `styles.css` — reszponzív UI és accessibility
- `i18n.js` — DE / TR / UK / HU / EN fordítások
- `world.js` — 3D aréna és környezet
- `actors.js` — közönség, királynő, katonák, retro hősök és sárkány
- `audio.js` — hangeffektek és rétegzett ambient/tension audio
- `game.js` — játékmenet, állapotgép, kamera, input és QA interface
- `README.md` — használati és technikai útmutató

## Reszponzivitás

A kezelőfelület automatikusan alkalmazkodik desktop, tablet és mobil kijelzőhöz. Érintőkijelzőn a játék megjeleníti a D-padot és a BOOST gombot; asztali gépen ezek rejtve maradnak.


## Mozgó szereplők és pályazavarás

A pálya körül most 3D közönség, királynő, katonák és sárkányok mozognak. A játék során időnként betolakodók indulnak a csillag felé:

- retro platformhős
- katona
- magasabb szinteken sárkány
- a betolakodó elviheti az aktuális csillagot
- csillaglopáskor 5 pont levonás jár
- a csillag rövid idő után új helyen jelenik meg
- a katonák komoly ütközést okoznak; az első élet 3 pajzsa védi a kukacot, majd az életek fogynak
- a rajtaütések a szintekkel fokozatosan gyakoribbá válnak

A retro platformhősök saját, eredeti low-poly karakterek; nem használnak Super Mario grafikát, modellt vagy hangmintát.


## Nyelvek

A játék felülete öt nyelven érhető el:

- német — alapértelmezett
- török
- ukrán
- magyar
- angol

A nyelv a felső vezérlősávban választható. A választást a böngésző helyben megjegyzi, így a következő megnyitáskor ugyanaz a nyelv töltődik be. Ha nincs korábbi választás, a játék németül indul.

A fordítás kiterjed a HUD-ra, indítóképernyőre, használati útmutatóra, játék vége képernyőre és a dinamikus játéküzenetekre is.

## Mobil és tablet

A kezelőfelület külön reszponzív szabályokat kapott mobilra és tabletre. A nyelvválasztó, pontszám, kezelőgombok, D-pad és BOOST gomb kisebb kijelzőn is egymástól elkülönítve jelenik meg.


## First-principles gameplay update

A játék fő ciklusa most egyszerűbb és erősebb:

- az első betolakodás csak két megszerzett csillag után oldódik fel
- a betolakodók a közönség pozíciójából indulnak
- a retro hősök és sárkányok csillagtolvajok
- a katonák blokkoló/ütköző ellenfelek
- az ellopott csillag nem tűnik el azonnal: a tolvaj magával viszi
- a tolvaj elkapásával a csillag visszaszerezhető, +20 pontért
- boost alatt megszerzett csillag extra kockázati bónuszt ad
- 160 pontonként Royal Event indul két katonával
- a 4. szinttől egyszeri Dragon Attack esemény aktiválódik
- a kezdőképernyő csak a három alapfeladatot mutatja: mozogj, szerezd meg a csillagot, ne ütközz

## Stabilitás és accessibility

- háttérbe kerülő böngészőfül automatikusan szünetelteti a játékot
- orientation change után újraszámolja a viewportot
- tablet portré/landscape kamera külön igazodik
- `prefers-reduced-motion` támogatás
- Three.js betöltési hiba esetén értelmes fallback üzenet jelenik meg

## Automatikus QA

A repó két GitHub Actions ellenőrzést tartalmaz:

- `.github/workflows/smoke.yml` — HTML/JavaScript és alapfunkciók statikus smoke-checkje
- `.github/workflows/browser-qa.yml` — headless Chromium teszt desktop, tablet és mobil viewporton, nyelvváltással, játékindítással és képernyőképes artifactokkal


## 2026 AAA / first-principles polish

A jelenlegi rendszer a következő production-elemeket tartalmazza:

- centralizált `gameState` a játékos-, session- és progression-állapotokhoz
- 5 élet + kizárólag az első élethez tartozó 3 pajzs
- garantáltan pályán belüli spirális respawn hosszú kukac esetén is
- reaktív 3D közönség: calm / tense / danger / celebrate állapotok
- Dragon Attack előjelző kör, haptika és crowd reaction
- Royal Event: felerősített királyi csillag és extra jutalom
- erősebb csillag-vizuális hierarchia dinamikus PointLighttal
- boost kamera-FOV változás
- rétegzett ambient + tension Web Audio
- mobil haptika támogatás
- mobilon swipe az alap; a D-pad opcionálisan kapcsolható
- jobb oldali hosszú érintésből boost
- seedelt RNG: `?seed=42`
- QA mód: `?qa=1&seed=42`

### Szintek

Az öt vizuális/progressziós identitás:

1. Meadow / Rét
2. Stadium / Stadion
3. Royal Arena / Királyi Aréna
4. Dragon Valley / Sárkányvölgy
5. Night Arena / Éjszakai Aréna

A ciklus magasabb szinteken ismétlődik növekvő sebességgel és akadálysűrűséggel.

## Determinisztikus QA

A Browser QA nemcsak betölti az oldalt, hanem seedelt játékmeneti regressziókat is ellenőriz:

- német alapnyelv
- nyelvváltás
- desktop / tablet / mobile render
- 5 kezdeti élet + 3 pajzs
- első három ütközés csak pajzsot fogyaszt
- negyedik ütközés: 5 → 4 élet
- következő ütközés: 4 → 3 élet
- respawn minden esetben pályán belül marad
- collectible watchdog
- Royal Event aktiválható
- Dragon Event aktiválható
- QA screenshot artifactok


## Arcade ID: tisztán helyi, GitHub Pages-kompatibilis

Az Arcade ID teljes egészében a böngészőben működik, szerver, cookie, Vercel és Neon nélkül.

Funkciók:

- nicknév + legalább 8 karakteres jelszó/PIN
- a jelszó csak sózott `PBKDF2-SHA-256` hashként tárolódik, 210 000 iterációval
- több helyi profil egy böngészőben
- helyi ranglista, kattintható nicknév és részletes profil-statisztika
- profil- és statisztika-mentés `localStorage`-ban
- letölthető JSON recovery backup és másolható recovery string
- JSON vagy recovery string alapú visszaállítás tárhelytörlés után
- belépés nélküli guest játék
- teljes DE / TR / UK / HU / EN felület

Fontos korlát: ez nem szerveroldali fiók. A jelszóhash, a profil és az eredmények a felhasználó saját böngészőjében vannak, ezért módosíthatók. GitHub Pages-only módban biztonságos globális ranglista, valódi globális nicknév-egyediség, szerveroldali anti-cheat és eszközök közötti automatikus szinkron nem valósítható meg. Tárhely- vagy cookie-törlés előtt recovery backupot kell exportálni.

## Ellenőrzés

```sh
npm test
```

A GitHub Actions statikus ellenőrzést és Chromium-alapú desktop, tablet, mobil E2E tesztet futtat. Az E2E lefedi a profil-létrehozást, hibás és helyes belépést, több helyi profilt, rangsort, kattintható profilt, statisztikamentést, recovery-visszaállítást, guest módot és az öt nyelvet.
