# mz-exploration

Web app personale (Next.js + TypeScript) per presentare attività di running, trekking e viaggi.

```yaml
framework: next.js (App Router)
language: typescript
styling: tailwindcss v4
ui: shadcn/ui
database: mongodb
package_manager: npm
```

## Setup locale

```bash
npm install
# Crea .env.local con le variabili MongoDB (vedi docs/GARMIN_DB.md)
npm run dev
```

App: `http://localhost:3000`

## Stabilità IntelliJ / OneDrive

Se il progetto viene aperto in IntelliJ dentro una cartella OneDrive, l'indicizzazione può ripartire spesso. Per ridurre il problema:

1. Se possibile, sposta il repo fuori da OneDrive, ad esempio in `~/dev/mz-exploration`.
2. In IntelliJ marca come **Excluded** queste cartelle:
   - `.next`
   - `node_modules`
   - `out`
   - `coverage`
   - `.turbo`
   - `.turbopack`
3. Se resti su OneDrive, imposta la cartella del progetto su **Always keep on this device**.
4. Evita di tenere attiva la sincronizzazione mentre lavori su build molto volatili.

Verifica rapida da terminale:

```bash
git check-ignore -v .next node_modules .idea/workspace.xml
```

## Script

```bash
npm run dev      # sviluppo
npm run build    # build produzione
npm run lint     # linting
```

## Contact

- `app/contact/page.tsx` include:
  - form di ricontatto email (`POST /api/contact`)
  - salvataggio richieste contatto in MongoDB (`contact_messages`)
- Per abilitare il ricontatto, configura in `.env.local`:
  - `MONGODB_URI`
  - `MONGODB_DB_NAME` (in produzione: `mz-experience`)
  - `ADMIN_EMAIL` (es. `morenozuddas1@gmail.com`)
- Se vuoi anche l’invio automatico della notifica email al tuo indirizzo, configura anche:
  - `EMAIL_HOST`
  - `EMAIL_PORT`
  - `EMAIL_USER`
  - `EMAIL_PASSWORD`
  - `EMAIL_FROM` (opzionale: fallback su `EMAIL_USER`)
  - `NOTIFY_EMAIL=true`
- Il messaggio viene sempre salvato su MongoDB; l’email parte solo se SMTP è configurato correttamente.

## Documentazione

| File | Contenuto |
|------|-----------|
| `docs/GARMIN_DB.md` | DB MongoDB, flusso Garmin, API, migrazione, env vars |
| `docs/CONTACT_SETUP.md` | Setup contatti, anti-spam, MongoDB e deploy Vercel |
| `docs/SHADCN.md` | Setup shadcn/ui, componenti disponibili, personalizzazione |
| `docs/COMPONENT_PROPS_GUIDE.md` | Props di tutti i componenti del progetto |
| `docs/STRATEGIA.md` | Struttura pubblica/privata del sito, roadmap |
