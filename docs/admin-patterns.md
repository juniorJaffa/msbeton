# Admin dashboard — vzory a schémy

Referenčný súbor: `artifacts/web/src/pages/admin/AdminDashboard.tsx`

---

## Service schéma (Služby tab)

```typescript
interface Service {
  id: string;
  name: string;
  unit: string;              // "1 ks", "1 h", "bm"
  price: number;             // bez DPH
  description: string;
  active: boolean;
  serviceMode?: "pumpa" | "mix";   // iba pre daný režim kalkulačky; undefined = všetky
  maxMeters?: number;              // max bm hadice (ak vyplnené, zobrazí sa limit)
  activePeriodFrom?: string;       // "MM-DD" formát, napr. "11-01"
  activePeriodTo?: string;         // "MM-DD" formát, napr. "03-31"
}
```

`activePeriodFrom/To` sa ukladá v `"MM-DD"` formáte (nie DD.MM). UI zobrazuje/prijíma `"DD.MM"` a konvertuje pri save:
```typescript
const [dd, mm] = v.split("."); update(id, "activePeriodFrom", `${mm}-${dd}`);
```

---

## Client schéma — dôležité polia

```typescript
// Admin client objekt (AdminDashboard)
c.loginId    // ← login credential ID (napr. "20") — nie c.clientId!
c.password   // ← plain text heslo
c.id         // ← interné UUID

// LoggedClient (Calculator + clientAuth)
loggedClient.clientId  // ← mappe na c.loginId pri clientOverride
loggedClient.id        // ← mappe na c.id
```

> **Bug pattern**: `(c as any).clientId` vráti `undefined` — správne je `c.loginId`.

---

## EditableField

```typescript
function EditableField({ value, onSave, type = "text" })
```

- `startEdit()` vždy resetuje `val` na `String(value)` — zamedzuje "02" pri editácii
- `onFocus={e => e.target.select()}` — select all pri fokuse
- Discount inputy: `String(val)` ako value + `parseInt` v onChange → zabraňuje leading zeros ("04" → "4")

---

## SluzbyTab — zoraďovanie

Čakačka pumpy sa vždy zobrazuje **hneď za** čakačkou mixéra:

```typescript
// pumpa items nasledujú za mix item v displayServices
for (const s of services) {
  if (s.serviceMode === "pumpa") continue;  // skip, pridáme neskôr
  result.push(s);
  if (s.serviceMode === "mix") result.push(...pumpaItems);  // pridam pumpa za mix
}
```

---

## Admin klient kalkulačka (clientOverride)

`ConcreteCalculator` v admin Klienti tabe dostáva `clientOverride`:

```typescript
<ConcreteCalculator clientOverride={{
  id: c.id,
  clientId: c.loginId ?? "",  // ← loginId, nie clientId!
  name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || c.id,
  discountBeton: c.discountBeton ?? 0,
  // ...
}} />
```

Keď je `clientOverride` nastavený, kalkulačka:
- Preskočí session eventy (logout/login UI)
- Nezmení loggedClient pri navigácii
- Zobrazuje klienta ako prihláseného bez možnosti odhlásiť sa

---

## Search normalizácia (Objednávky + Klienti)

Multi-word AND logika s diacritics:

```typescript
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const terms = search.trim().split(/\s+/).filter(Boolean);
// každý term musí matchnúť aspoň jedno pole
const matches = terms.every(t => haystack.includes(norm(t)));
```
