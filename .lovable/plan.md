## Diagnose

Sharpe-ratio mangler i hele appen (både i tabellen og i punktfargene i diagrammet) fordi den **lagrede dataen i Lovable Cloud-cachen er utdatert**:

- Cachen ble sist oppdatert `2026-06-01 23:00` med 1025 fond.
- Alle fond i cachen har `Sharpe_1år … Sharpe_10år = "-"`.
- VFF-API-et leverer akkurat nå 1744 fond hvorav 1242 har gyldig `sharperatio1yr`. Volatilitet er lagret korrekt, men Sharpe-feltene ble lagret som "-" av en tidligere kjøring av edge-funksjonen.
- Fondsnavnene i cachen (f.eks. "Alfred Berg Aktiv", "Alfred Berg Gambak") finnes ikke lenger i dagens API-respons, noe som bekrefter at cachen er bygget av en eldre versjon av `fetch-vff-data` mot et eldre datasett.

Koden i `supabase/functions/fetch-vff-data/index.ts` ser riktig ut nå (`FELT.sharperatio1yr → "Sharpe_1år"` osv. og `normalizeFloat` håndterer tall som `1.46`), så problemet er kun cache-innholdet, ikke logikken.

## Plan

1. **Trigg `fetch-vff-data` manuelt** (via `supabase--curl_edge_functions`) for å hente fersk VFF-data og overskrive `fund_cache`.
2. **Verifiser i databasen** at de nye radene i `fund_cache` faktisk inneholder numeriske Sharpe-verdier (spørring som teller `Sharpe_1år != '-'`).
3. **Bekreft i frontend** at scatter-plottets punkter får farge basert på Sharpe igjen og at tabellens Sharpe-kolonner viser tall i stedet for "–". (Cron-jobben kl. 23 daglig vil deretter holde cachen frisk fremover.)

Ingen kodeendringer er nødvendige — kun en datarefresh.