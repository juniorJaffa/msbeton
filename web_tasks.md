# PROJEKT: Moderný Web pre firmu MS-Beton
## HLAVNÉ PRAVIDLO (Mobile-First):
- Všetky úlohy rieš prístupom "Mobile-First". 
- UI musí byť optimalizované pre ovládanie jednou rukou (palcom).
- Prioritizuj rýchlosť načítania a responzivitu (Tailwind breakpointy 'sm' a 'md').
- Používaj UI UX Pro Max skill na overenie dotykových plôch (min. 44x44px).
- niektore taby a admin sekcie nie su spravne viditelne pre Mobile, ale super viditelne pre web, treba spravit nejaky rozumny vizualizacny prienik a podmienky
- vzdy pozeraj funkcionalitu starej kalkulacky, aby vypocty boli presne ako na starej a vypocet pre novu funkcionality neham na teba, stareho adminu, bude tam aj posielanie emailov, kde sa regisruju, pridavaju novy klienti do systemu

## ZOZNAM ÚLOH co treba dorobit:
- [ ] uzivatel neni prihlaseny tak nechcem aby bola videna Hotovost
- [ ] zony dopravy Standard - disablovat editovanie ceny, lebo sa riadi Pasmo=Zonami
- dorobit txt info + hint na Zony Cennik UI/UX - jednoducho Doprava Standard je riadena cenami z Pasma =Zony
- [ ] Zona dopravy Kilometer - zrusit vypocet podla m3 - tam sa ale vypocet neriadi cenami z cennika pre ZOny
- [ ] Pridanie noveho Klienta - chyba vybratie - Typ dopravy -default Standard
- [ ] Kalkulacka UI - vymazanie udajov, kyblik alebo X
- [ ] UI kalkulacka click - scroll pride a zareze taby do polky UI -vyosenie tabov v pohlade zastrihnuty PUMik a ikony Taby
- [ ] kalkulacka prihlasenie - zlavove tabulky - chyba FAKTURA a  HOVOTOST ako maju admin - klient - zlavove tabuulky
- [ ] admin - klient - kalkulacka per klient = taka ista kalkulacka ako ma hlavna stranka UI - pekne to zakomponovat do mobile UI
- [ ] Kalkulacka - Pridat Polozku - UI layout pridat checkbox pripocitat Doprava vedla - Nezapočítať dopravu + dorobit tuto moznost do vypoctovej logiky kalkulacky 
- [ ] admin - Klient registracia - posielat novy registracny email novemu registracnemu klientovi, doteraz novy email nechodil+sablona o registracii + admin v UI/UX nech ma moznost poslat | neposlat
- [ ] Niekedy ked nasadim klient nepouziva aktualnu verziu - vymysliet ako klientovi spravit refresh alebo mu napisat popu "Nepouzivate aktualnu verziu...Obnovit"