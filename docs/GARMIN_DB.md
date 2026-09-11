# Garmin + MongoDB — Guida operativa

Aggiornata: 2026-04-09

---

## Architettura

| Layer | File |
|-------|------|
| Frontend demo | `app/demo-garmin/page.tsx` |
| Import JSON Garmin | `POST /api/activities/garmin` |
| Lettura attività UI | `GET /api/activities/garmin` |
| Connessione DB | `lib/db/connection.ts` |
| Modello attività | `lib/db/models/Activity.ts` |
| Conversione raw → canonico | `lib/garmin/converter.ts` |
| Manutenzione (dedup + indici) | `lib/db/maintenance.ts` |
| Migrazione wrapper → canonico | `lib/garmin/migrate.ts` + `POST /api/activities/garmin/migrate-wrapper` |

---

## Flussi supportati

### Flusso 1 — Upload JSON dalla UI
1. Upload file da `app/demo-garmin/page.tsx`
2. `POST /api/activities/garmin` → conversione + dedup + upsert su DB
3. `GET /api/activities/garmin` per refresh UI

### Flusso 2 — Sync server-side con GarminDB bridge
1. Configura `GARMIN_USERNAME`, `GARMIN_PASSWORD` e `GARMIN_DB_CLI_PATH` lato server
2. `POST /api/activities/garmin/sync` con header admin (`x-api-secret`) e body `{"mode":"latest"}` oppure `{"mode":"all"}`
3. Il bridge esegue `garmindb_cli.py`, legge l'export attività e riusa la pipeline canonica MongoDB
4. In alternativa usa `/demo-garmin-sync` per una sync one-shot con credenziali passate solo nella request

### Flusso 3 — Inserimento diretto nel DB
1. Inserisci documenti raw Garmin in `activities` (Atlas/Compass/shell)
2. La UI legge via `GET /api/activities/garmin`, i dati vengono convertiti al volo
3. La manutenzione elimina i doppioni fisici quando rilevati

> Il flusso 1 è consigliato perché applica subito tutte le regole di qualità dati.

---

## Formato dati

Il backend supporta entrambi i formati in ingresso:
- **canonico**: `1 documento Mongo = 1 attività`
- **wrapper Garmin**: documento con `summarizedActivitiesExport: [...]`

I documenti vengono sempre salvati in formato **canonico**.

### Conversioni raw → campo canonico (lib/garmin/converter.ts)

| Campo raw Garmin | Campo canonico | Note |
|------------------|----------------|------|
| `startTimeLocal` / `beginTimestamp` | `date` | epoch ms → `new Date(ms)` |
| `totalTimeInSeconds` / `duration` | `duration_sec` | secondi |
| `elapsedDuration` | `elapsed_sec` | secondi |
| `movingDuration` | `moving_sec` | secondi |
| `totalDistance` / `distance` | `distance_m` | metri; `pickDistanceMeters` gestisce m vs cm |
| `avgSpeed` / `averageSpeed` | `avg_speed_mps` | m/s; `normalizeSpeed` corregge valori compressi |
| `maxSpeed` | `max_speed_mps` | m/s |
| `avg_speed_mps` | `pace_min_per_km` | calcolato con `calcPace` |
| `elevationGain` / `elevationLoss` | `elevation_gain_m` / `elevation_loss_m` | raw Garmin: cm→m |
| `calories` | `calories_kcal` | as-is |
| `avgRunCadence` | `avg_cadence` | passi/min; raddoppiato (per gamba → totale) |
| `avgStrideLength` | `avg_stride_length_m` | cm → m |

---

## API disponibili

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/test-db` | GET | Test connessione database |
| `/api/status` | GET | Stato generale (doc count, activities, wrapper) |
| `/api/activities/garmin` | GET | Lista attività normalizzate |
| `/api/activities/garmin` | POST | Import JSON Garmin (array, oggetto, o wrapper) |
| `/api/activities/garmin/sync` | POST | Sync server-side via GarminDB bridge |
| `/api/activities/garmin/deduplicate` | POST | Dedup manuale (dry-run/apply) |
| `/api/activities/garmin/indexes` | POST | Gestione/sync indici |
| `/api/activities/garmin/normalize` | POST | Normalizzazione storica |
| `/api/activities/garmin/migrate-wrapper` | POST | Migrazione wrapper → canonico (dry-run/apply) |
| `/api/diagnose/db` | GET | Diagnostica DB (nome, conteggi, wrapper) |
| `/api/diagnose/env` | GET | Diagnostica variabili ambiente |
| `/api/activities/all` | GET | Tutte le attività (multi-source) |
| `/api/activities/[id]` | GET | Dettaglio singola attività |
| `/demo-garmin` | GET | Pagina UI gestione attività |
| `/demo-garmin-sync` | GET | Demo sync one-shot con credenziali Garmin |

---

## Configurazione `.env.local`

```bash
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>/mz-exploration?retryWrites=true&w=majority"
MONGODB_DB_NAME=mz-exploration
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=1
MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000
MONGODB_SOCKET_TIMEOUT_MS=45000
MONGODB_AUTO_MAINTENANCE=true

# Opzionale — protegge l'endpoint di migrazione
MIGRATION_API_SECRET=una-stringa-segreta-lunga
API_ADMIN_SECRET=una-stringa-segreta-lunga

# Garmin bridge server-side
GARMIN_USERNAME=nome.utente.garmin
GARMIN_PASSWORD=password-garmin
GARMIN_DB_CLI_PATH=garmindb_cli.py
GARMIN_TIMEOUT_MS=120000
GARMIN_DOWNLOAD_LATEST_ACTIVITIES=50
GARMIN_DOWNLOAD_ALL_ACTIVITIES=1000
GARMIN_DB_BASE_DIR=HealthData
GARMIN_METRIC=true
```

> **Importante**: imposta `MONGODB_URI` e `MONGODB_DB_NAME` coerentemente con `mz-exploration` sia in locale che in produzione.

---

## Migrazione wrapper Garmin

Se nel DB è presente un documento contenitore con `summarizedActivitiesExport: [...]`:

```bash
# Dry-run (default)
curl -X POST "http://localhost:3000/api/activities/garmin/migrate-wrapper" \
  -H "Content-Type: application/json" \
  -H "x-migration-secret: $MIGRATION_API_SECRET" \
  -d '{"limit":25}'

# Apply
curl -X POST "http://localhost:3000/api/activities/garmin/migrate-wrapper" \
  -H "Content-Type: application/json" \
  -H "x-migration-secret: $MIGRATION_API_SECRET" \
  -d '{"apply":true,"limit":25,"deleteSourceDocuments":true}'
```

**Risposta attesa:**
- `wrapper_documents`: documenti contenitore trovati
- `activities_found`: attività interne rilevate
- `upserted_activities`: documenti canonici creati
- `already_existing_activities`: attività già presenti
- `deleted_wrapper_documents`: wrapper rimossi dopo il successo

---

## Verifiche rapide

```bash
curl -s http://localhost:3000/api/test-db
curl -s http://localhost:3000/api/status
curl -s http://localhost:3000/api/activities/garmin
curl -s http://localhost:3000/api/diagnose/db
curl -s http://localhost:3000/api/diagnose/env
```

Dedup manuale (solo se necessario):

```bash
# Dry-run
curl -s -X POST http://localhost:3000/api/activities/garmin/deduplicate \
  -H "Content-Type: application/json" -d '{}'
# Apply
curl -s -X POST http://localhost:3000/api/activities/garmin/deduplicate \
  -H "Content-Type: application/json" -d '{"apply": true}'
```

Sync GarminDB bridge:

```bash
curl -s -X POST http://localhost:3000/api/activities/garmin/sync \
  -H "Content-Type: application/json" \
  -H "x-api-secret: $API_ADMIN_SECRET" \
  -d '{"mode":"latest"}'

npm run garmin:sync
npm run garmin:sync:all
```

---

## Checklist pre-release

- [ ] `MONGODB_DB_NAME=mz-exploration`
- [ ] `MONGODB_URI` coerente con `mz-exploration`
- [ ] `MONGODB_AUTO_MAINTENANCE=true` (self-healing automatico)
- [ ] Testare `/api/diagnose/env` e `/api/diagnose/db`
- [ ] Testare `/api/status` e `/api/activities/garmin`
- [ ] Se ci sono wrapper nel DB, fare dry-run su `/api/activities/garmin/migrate-wrapper`

---

## Prompt handoff per AI

```text
Sei un senior Next.js 15 + TypeScript engineer. Lavori sul progetto "MZ Exploration".

Contesto tecnico implementato:
- MongoDB con connessione centralizzata in lib/db/connection.ts
- Modello attività in lib/db/models/Activity.ts
- Import Garmin JSON in POST /api/activities/garmin
- Lettura attività in GET /api/activities/garmin
- Conversione Garmin in lib/garmin/converter.ts
- Manutenzione dedup + indici in lib/db/maintenance.ts
- UI demo in app/demo-garmin/page.tsx

Vincoli: TypeScript strict, niente any, API con try/catch, nessuna regressione su deduplicazione.
Prima di modificare: analizza i file, proponi piano breve, poi applica patch incrementali.
```

---

> **Troubleshooting**: se in UI vedi dati strani, il punto di partenza è sempre `convertGarminRaw` in `lib/garmin/converter.ts` — è il layer unico di traduzione verso il frontend.
