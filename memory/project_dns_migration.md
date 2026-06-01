---
name: dns-migration-msbeton-sk
description: DNS migrácia msbeton.sk na nový VPS 178.105.242.17 – plán krokov, stav, post-migration SEO checklist
metadata:
  type: project
---

Migrácia msbeton.sk z 195.181.250.133 (starý Webglobe hosting) na 178.105.242.17 (nový Hetzner VPS).

**Why:** Nový VPS má Node.js app, PostgreSQL, PM2 — WordPress hosting nahradený.
**How to apply:** Pri každom deploy/zmene kontrolluj že msbeton.sk smeruje na 178.105.242.17.

## DNS záznamy na zmenu (Webglobe admin)

| Meno | Typ | Stará IP | Nová IP |
|------|-----|----------|---------|
| (root) | A | 195.181.250.133 | 178.105.242.17 |
| www | A | 195.181.250.133 | 178.105.242.17 |
| * (wildcard) | A | 195.181.250.133 | 178.105.242.17 |
| demo | A | 178.105.242.17 | (OK, nemeniť) |
| imap/mail/pop3/smtp | A | 195.181.250.126 | (NE! Email, nemeniť) |

## Post-DNS kroky (po propagácii ~15-60 min)

```bash
# 1. Overiť propagáciu
dig msbeton.sk +short
# Musí vrátiť: 178.105.242.17

# 2. SSL certifikát pre msbeton.sk
ssh -i ~/.ssh/id_ed25519_ms_beton root@178.105.242.17 \
  "certbot --nginx -d msbeton.sk -d www.msbeton.sk --non-interactive --agree-tos -m info@msbeton.sk"

# 3. Reload nginx
ssh -i ~/.ssh/id_ed25519_ms_beton root@178.105.242.17 "nginx -t && systemctl reload nginx"

# 4. Admin manifest check
curl -s https://msbeton.sk/admin/login | grep manifest
# Výsledok musí byť: href="/admin-manifest.json"

# 5. Robots.txt check (Allow: /)
curl -s https://msbeton.sk/robots.txt

# 6. API health
curl -s https://msbeton.sk/api/healthz
```

## Post-migrácia SEO

- Google Search Console: pridať msbeton.sk property (HTML tag verifikácia)
- Odoslať sitemap: https://msbeton.sk/sitemap.xml
- Sitelinks sa objavia po 2-8 týždňoch indexácie
- demo.msbeton.sk zostáva online (noindex), nemazať

## Stav migrácie

- [x] Nový VPS nakonfigurovaný (Nginx, PM2, PostgreSQL, SSL pre demo)
- [x] UFW firewall aktívny
- [x] DB backup cron (každý deň 02:00)
- [x] PM2 logrotate aktívny
- [x] fail2ban aktívny
- [x] msbeton-prod nginx config vytvorený
- [ ] DNS zmenené v Webglobe
- [ ] SSL certifikát pre msbeton.sk (certbot)
- [ ] Google Search Console setup
- [ ] Sitemap odoslaný
