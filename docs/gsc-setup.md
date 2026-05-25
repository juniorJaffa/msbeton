# Google Search Console — nastavenie pre msbeton.sk

## Overenie vlastníctva domény

**TXT záznam (DNS):**
```
google-site-verification=LcubEg84IBhThkmrRAkejn1x8N536mSYqNAE2S7AJpg
```

**Kde bol pridaný:**  
Webglobe Admin → Doména `msbeton.sk` → DNS záznamy → nový TXT záznam:
- **Meno:** *(prázdne — root doména)*
- **Typ:** TXT
- **Hodnota:** `google-site-verification=LcubEg84IBhThkmrRAkejn1x8N536mSYqNAE2S7AJpg`
- **TTL:** 3600

**Účel:** Google musí overiť, že vlastníš doménu `msbeton.sk`, aby ti povolil prístup k Search Console dátam (organické vyhľadávania, kľúčové slová, indexovanie, CTR). TXT záznam musí ostať v DNS natrvalo — jeho odstránenie zruší overenie.

---

## Service Account pre API prístup

**Service account:** `gsc-claude-reader@ms-beton-sk.iam.gserviceaccount.com`  
**GCP projekt:** `ms-beton-sk`  
**Scope:** `https://www.googleapis.com/auth/webmasters.readonly`  
**Key ID:** `38f3e0fab0986d28e33403e20a38dccbd0301449`

Tento service account bol pridaný do GSC property `msbeton.sk` s oprávnením **Full** (Settings → Users and permissions).

### Konfigurácia na serveri (`ecosystem.config.cjs`)

```js
GSC_KEY_JSON: '{"type":"service_account","project_id":"ms-beton-sk",...}',  // celý JSON ako string
GSC_SITE_URL: 'sc-domain:msbeton.sk',  // Domain property (pokrýva aj demo.msbeton.sk)
```

`sc-domain:msbeton.sk` pokrýva **všetky subdomény aj protokoly** (http/https, www/demo/...).

### GCP — potrebné API

V GCP projekte `ms-beton-sk` musí byť povolené:
- **Google Search Console API** (APIs & Services → Library)

---

## Použitie v aplikácii

API endpoint: `GET /api/admin/analytics/gsc`  
Admin dashboard: tab **Search Console** (v "Viac" menu)

Dáta: kľúčové slová, stránky, zariadenia, krajiny, denný trend (posledných 28 / 90 dní).
GSC má 3-dňový lag — data sú dostupné až 3 dni po zobrazení.
