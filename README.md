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
- Falnak, akadálynak vagy saját testnek ütközve véget ér a játék.
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

- `index.html` — teljes játék, stílusokkal és logikával
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
- ha egy betolakodó eltalálja a kukac fejét, a menet véget ér
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
