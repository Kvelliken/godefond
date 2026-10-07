# GodeFond

Nettapp for å sammenligne og filtrere norske verdipapirfond (tabell + scatterplot).

## Stack
- Vite + React 18 + TypeScript, Tailwind CSS, shadcn/ui (Radix), Recharts, React Query, React Router
- Supabase (database + edge functions) via `@supabase/supabase-js`
- Tester: Vitest (+ Testing Library), Playwright (`@playwright/test`) for e2e
- Pakkebehandler: npm (kun `package-lock.json`)

## Kommandoer
- `npm run dev` – utviklingsserver på http://localhost:8080
- `npm run build` – produksjonsbygg
- `npm run lint` – ESLint
- `npm test` – Vitest (én kjøring)

## Miljøvariabler
Kopier `.env.example` til `.env` og fyll inn: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`. `.env` skal aldri committes.

## Mappestruktur
- `src/pages/` – sider (`Index.tsx` er hovedsiden, leser fond fra `fund_cache`)
- `src/components/` – appkomponenter (`FundTable`, `FundFilters`, `ScatterPlot`); `ui/` er shadcn
- `src/integrations/supabase/` – Supabase-klient og genererte typer
- `src/lib/` – delte typer og hjelpefunksjoner
- `supabase/functions/fetch-vff-data/` – edge function som henter data
- `supabase/migrations/` – databaseskjema

## Data
Fondsdata kommer fra VFF (Verdipapirfondenes forening). Edge function `fetch-vff-data` henter dem og lagrer dem i tabellen `fund_cache` i Supabase. Frontend leser kun fra `fund_cache`.
