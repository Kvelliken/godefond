# GodeFond

Jeg skal lage en interaktiv fondsliste som oppdaterer seg ukentlig. Jeg har allerede noen koder som jeg vil at du skal bruke. Kan du sette opp prosjektet og skrive om kodene jeg limer inn under? """

VFF Fondsdata – komplett API-scraper

=====================================

Henter alle fondsdata direkte fra:

  https://vff.no/actions/vff-module/vff-fond/index




Inkluderer nå:

  - Filtrering av fond uten YTD-avkastning

  - Beregning av gjennomsnittlig Sharpe-ratio per fondsgruppe (1, 3, 5, 10 år)




Installasjon:

    pip install requests pandas




Kjøring:

    python vff_fondsdata_komplett.py

"""




import json

import csv

import requests

import pandas as pd

from pathlib import Path

from datetime import datetime




# ── Konfigurasjon ─────────────────────────────────────────────────────────────




API_URL   = "https://vff.no/actions/vff-module/vff-fond/index"

OUT_DIR   = Path("vff_output")

OUT_DIR.mkdir(exist_ok=True)




HEADERS = {

    "User-Agent": (

        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "

        "AppleWebKit/537.36 (KHTML, like Gecko) "

        "Chrome/120.0.0.0 Safari/537.36"

    ),

    "Accept":  "application/json, text/plain, */*",

    "Referer": "https://vff.no/fondsdata",

}




# ── Feltliste ─────────────────────────────────────────────────────────────────

FELT = {

    # ── Grunninfo ─────────────────────────────────────────────────

    "security_name":    "Fondsnavn",

    "proddate":         "Dato",

    "typeId":           "FondstypeID",

    "type":             "Fondstype",

    "groupId":          "FondsGruppeID",

    "group":            "Fondsgruppe",

    "riskclass":        "Risikoklasse",

    "complongname":     "Forvaltningsselskap",




    # ── Kostnader ──────────────────────────────────────────────────

    "mgmtcommision":    "Forvaltningshonorar_%",

    "totcost":          "Løpende_kostnader_%",

    "maxsalescharge":   "Tegningsgebyr_%",

    "maxredemptfee":    "Innløsningsgebyr_%",

    "minsubscramnt":    "Min_tegningsbeløp",

    "minsubscramntcurr":"Min_tegningsbeløp_valuta",

    "min_monthly_amount":"Min_spareavtale",

    "isprofitshare":    "Resultatavhengig_honorar",




    # ── NAV / referanseindeks ─────────────────────────────────────

    "price":            "NAV",

    "benchmarksymbol":  "Referanseindeks",

    "activeshare":      "Aktiv_andel_%",




    # ── Avkastning (snitt) ────────────────────────────────────────

    "rety2d":           "Avkastning_YTD_%",

    "retgavg1yr":       "Avkastning_snitt_1år_%",

    "retgavg3yr":       "Avkastning_snitt_3år_%",

    "retgavg5yr":       "Avkastning_snitt_5år_%",

    "retgavg10yr":      "Avkastning_snitt_10år_%",

    "retgavg15yr":      "Avkastning_snitt_15år_%",

    "retgavg20yr":      "Avkastning_snitt_20år_%",




    # ── Avkastning (kalenderår) ───────────────────────────────────

    "retannyr1":        "Avkastning_kalenderår_1",

    "retannyr2":        "Avkastning_kalenderår_2",

    "retannyr3":        "Avkastning_kalenderår_3",

    "retannyr4":        "Avkastning_kalenderår_4",

    "retannyr5":        "Avkastning_kalenderår_5",

    "retannyr6":        "Avkastning_kalenderår_6",

    "retannyr7":        "Avkastning_kalenderår_7",

    "retannyr8":        "Avkastning_kalenderår_8",

    "retannyr9":        "Avkastning_kalenderår_9",

    "retannyr10":       "Avkastning_kalenderår_10",




    # ── Volatilitet ───────────────────────────────────────────────

    "volatility1yr":    "Volatilitet_1år",

    "volatility3yr":    "Volatilitet_3år",

    "volatility5yr":    "Volatilitet_5år",

    "volatility10yr":   "Volatilitet_10år",




    # ── Differanseavkastning ──────────────────────────────────────

    "diffret1yr":       "Differanseavkastning_1år",

    "diffret3yr":       "Differanseavkastning_3år",

    "diffret5yr":       "Differanseavkastning_5år",

    "diffret10yr":      "Differanseavkastning_10år",




    # ── Relativ volatilitet ───────────────────────────────────────

    "relvol1yr":        "Relativ_volatilitet_1år",

    "relvol3yr":        "Relativ_volatilitet_3år",

    "relvol5yr":        "Relativ_volatilitet_5år",

    "relvol10yr":       "Relativ_volatilitet_10år",




    # ── Information Ratio ─────────────────────────────────────────

    "ir1yr":            "IR_1år",

    "ir3yr":            "IR_3år",

    "ir5yr":            "IR_5år",

    "ir10yr":           "IR_10år",




    # ── Sharpe ───────────────────────────────────────────────────

    "sharperatio1yr":   "Sharpe_1år",

    "sharperatio3yr":   "Sharpe_3år",

    "sharperatio5yr":   "Sharpe_5år",

    "sharperatio10yr":  "Sharpe_10år",

}




# ── Hjelpefunksjoner ──────────────────────────────────────────────────────────




def hent_data() -> dict:

    """Henter rådata fra VFF sitt API."""

    print(f"▶ Kobler til API: {API_URL}")

    resp = requests.get(API_URL, headers=HEADERS, timeout=30)

    resp.raise_for_status()

    return resp.json()




def _slå_opp_type(type_id: str, types: list[dict]) -> str:

    """Returnerer typenavnet for et gitt typeId."""

    for t in types:

        if str(t.get("typeId")) == str(type_id):

            return t.get("type", "")

    return ""




def flatten_fond(fond: dict, types: list[dict]) -> dict:

    """Flater ut ett fond-objekt til én rad med lesbare kolonnenavn."""

    values   = fond.get("values", {})

    type_id  = fond.get("typeId", values.get("typeId", ""))

    group_id = fond.get("groupId", values.get("groupId", ""))

    group    = fond.get("group",   values.get("group", ""))




    type_navn = _slå_opp_type(type_id, types)




    rad = {}

    for api_felt, kolonne in FELT.items():

        if api_felt == "typeId":

            rad[kolonne] = type_id

        elif api_felt == "type":

            rad[kolonne] = type_navn

        elif api_felt == "groupId":

            rad[kolonne] = group_id

        elif api_felt == "group":

            rad[kolonne] = group

        else:

            rad[kolonne] = values.get(api_felt, "")

    return rad




def lagre_csv(rader: list[dict], filnavn: str) -> Path:

    path = OUT_DIR / filnavn

    if not rader: return path

    with open(path, "w", newline="", encoding="utf-8-sig") as f:

        writer = csv.DictWriter(f, fieldnames=rader[0].keys())

        writer.writeheader()

        writer.writerows(rader)

    return path




def lagre_json(data, filnavn: str) -> Path:

    path = OUT_DIR / filnavn

    with open(path, "w", encoding="utf-8") as f:

        json.dump(data, f, ensure_ascii=False, indent=2)

    return path




# ── Hovedfunksjon ─────────────────────────────────────────────────────────────




def main():

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    print(f"\n{'='*60}")

    print(f"  VFF Fondsdata – komplett scraper  {datetime.now():%d.%m.%Y %H:%M}")

    print(f"{'='*60}\n")




    # 1. Hent data

    raw      = hent_data()

    fonds    = raw.get("fonds", [])

    types    = raw.get("types", [])

    groups   = raw.get("groups", [])




    print(f"  Antall fond før filtrering: {len(fonds)}\n")




    # 2. Flatten og filtrer

    print("▶ Prosesserer og filtrerer fondsdata ...")

    alle_rader = [flatten_fond(f, types) for f in fonds]

    

    rader = []

    for rad in alle_rader:

        # Hent YTD avkastning, rens for mellomrom

        ytd = str(rad.get("Avkastning_YTD_%", "")).strip()

        # Ekskluder hvis den er "-" eller tom

        if ytd not in ("-", "", "None"):

            rader.append(rad)

            

    bortfalte = len(alle_rader) - len(rader)

    print(f"  Fjernet {bortfalte} fond som manglet YTD-data.")

    print(f"  Antall fond etter filtrering: {len(rader)}")




    # Sorter alfabetisk på fondsnavn

    rader.sort(key=lambda r: r.get("Fondsnavn", "").upper())




    # 3. Last inn i pandas for Sharpe-beregning

    df = pd.DataFrame(rader)

    

    # Rydder opp i Sharpe-kolonnene slik at pandas forstår at det er tall

    sharpe_cols = ["Sharpe_1år", "Sharpe_3år", "Sharpe_5år", "Sharpe_10år"]

    for col in sharpe_cols:

        # Bytter ut ev. komma med punktum og gjør om til float (tall).

        # errors="coerce" gjør at alt som ikke er et tall (f.eks "-") blir til NaN (manglende data).

        df[col] = df[col].astype(str).str.replace(',', '.')

        df[col] = pd.to_numeric(df[col], errors='coerce')




    # Beregn gjennomsnittlig Sharpe per gruppe. Pandas ignorerer automatisk NaN i beregningen.

    sharpe_snitt = df.groupby("Fondsgruppe")[sharpe_cols].mean().reset_index()




    # 4. Lagre filer

    print("\n▶ Lagrer filer ...")

    csv_path      = lagre_csv(rader, f"fondsdata_{ts}.csv")

    json_path     = lagre_json(rader, f"fondsdata_{ts}.json")

    meta_path     = lagre_json({"types": types, "groups": groups}, f"metadata_{ts}.json")

    

    # Lagre Sharpe-beregningene til egen fil for enkel tilgang senere

    sharpe_csv_path = OUT_DIR / f"sharpe_snitt_{ts}.csv"

    sharpe_snitt.round(4).to_csv(sharpe_csv_path, index=False, encoding="utf-8-sig", sep=",")

    

    # Lagrer også sharpe som JSON (fint for Lovable)

    sharpe_json_path = OUT_DIR / f"sharpe_snitt_{ts}.json"

    sharpe_snitt.round(4).to_json(sharpe_json_path, orient="records", force_ascii=False, indent=2)




    print(f"  ✓ {len(rader)} fond     → {csv_path}")

    print(f"  ✓ Sharpe-snitt   → {sharpe_csv_path}")

    print(f"  ✓ JSON (Fond)    → {json_path}")

    print(f"  ✓ JSON (Sharpe)  → {sharpe_json_path}")

    print(f"  ✓ Metadata       → {meta_path}")




    # 5. Sammendrag i terminal

    print(f"\n── Gjennomsnittlig Sharpe per Fondsgruppe ───────────────────")

    # Viser snittet pent avrundet til 2 desimaler. Fyller tomme (NaN) med "-" for visning.

    print(sharpe_snitt.round(2).fillna("-").to_string(index=False))




    print(f"\n{'='*60}")

    print(f"  Ferdig! Filer lagret i: {OUT_DIR}/")

    print(f"{'='*60}\n")




if __name__ == "__main__":

    main() import React, { useState, useMemo } from 'react';

import { Upload, ChevronUp, ChevronDown, RefreshCcw, BarChart2 } from 'lucide-react';




// Fiktiv testdata utvidet med Volatilitet

const initialMockData = [

  {"Fondsnavn": "DNB Global Indeks", "Fondstype": "Aksjefond", "Fondsgruppe": "Global", "Forvaltningsselskap": "DNB Asset Management", "Avkastning_YTD_%": "5.2", "Avkastning_snitt_1år_%": "20.1", "Avkastning_snitt_3år_%": "12.5", "Avkastning_snitt_5år_%": "15.0", "Avkastning_snitt_10år_%": "14.2", "Volatilitet_1år": "16.5", "Volatilitet_3år": "14.2", "Volatilitet_5år": "13.5", "Volatilitet_10år": "14.0", "Sharpe_1år": "1.2", "Sharpe_3år": "0.9", "Sharpe_5år": "1.1", "Sharpe_10år": "1.0"},

  {"Fondsnavn": "KLP AksjeGlobal Indeks", "Fondstype": "Aksjefond", "Fondsgruppe": "Global", "Forvaltningsselskap": "KLP Kapitalforvaltning", "Avkastning_YTD_%": "5.1", "Avkastning_snitt_1år_%": "19.9", "Avkastning_snitt_3år_%": "12.4", "Avkastning_snitt_5år_%": "14.9", "Avkastning_snitt_10år_%": "14.1", "Volatilitet_1år": "16.4", "Volatilitet_3år": "14.1", "Volatilitet_5år": "13.4", "Volatilitet_10år": "13.9", "Sharpe_1år": "1.1", "Sharpe_3år": "0.85", "Sharpe_5år": "1.05", "Sharpe_10år": "0.95"},

  {"Fondsnavn": "Storebrand Norge", "Fondstype": "Aksjefond", "Fondsgruppe": "Norge", "Forvaltningsselskap": "Storebrand Fondene", "Avkastning_YTD_%": "2.1", "Avkastning_snitt_1år_%": "10.5", "Avkastning_snitt_3år_%": "8.2", "Avkastning_snitt_5år_%": "9.5", "Avkastning_snitt_10år_%": "8.8", "Volatilitet_1år": "12.0", "Volatilitet_3år": "13.5", "Volatilitet_5år": "14.2", "Volatilitet_10år": "15.0", "Sharpe_1år": "0.8", "Sharpe_3år": "0.6", "Sharpe_5år": "0.7", "Sharpe_10år": "0.65"},

  {"Fondsnavn": "Holberg Likviditet", "Fondstype": "Pengemarkedsfond", "Fondsgruppe": "Norge", "Forvaltningsselskap": "Holberg Fondene", "Avkastning_YTD_%": "1.2", "Avkastning_snitt_1år_%": "4.5", "Avkastning_snitt_3år_%": "2.5", "Avkastning_snitt_5år_%": "2.0", "Avkastning_snitt_10år_%": "-", "Volatilitet_1år": "0.8", "Volatilitet_3år": "0.9", "Volatilitet_5år": "1.0", "Volatilitet_10år": "-", "Sharpe_1år": "3.5", "Sharpe_3år": "2.1", "Sharpe_5år": "1.8", "Sharpe_10år": "-"},

  {"Fondsnavn": "DNB Obligasjon", "Fondstype": "Obligasjonsfond", "Fondsgruppe": "Norge", "Forvaltningsselskap": "DNB Asset Management", "Avkastning_YTD_%": "1.5", "Avkastning_snitt_1år_%": "5.1", "Avkastning_snitt_3år_%": "1.5", "Avkastning_snitt_5år_%": "2.5", "Avkastning_snitt_10år_%": "3.0", "Volatilitet_1år": "3.5", "Volatilitet_3år": "4.0", "Volatilitet_5år": "3.8", "Volatilitet_10år": "3.5", "Sharpe_1år": "1.5", "Sharpe_3år": "0.4", "Sharpe_5år": "0.8", "Sharpe_10år": "1.1"},

  {"Fondsnavn": "Odin Norden", "Fondstype": "Aksjefond", "Fondsgruppe": "Norden", "Forvaltningsselskap": "ODIN Forvaltning", "Avkastning_YTD_%": "4.5", "Avkastning_snitt_1år_%": "16.2", "Avkastning_snitt_3år_%": "10.1", "Avkastning_snitt_5år_%": "12.2", "Avkastning_snitt_10år_%": "11.5", "Volatilitet_1år": "15.0", "Volatilitet_3år": "16.5", "Volatilitet_5år": "15.8", "Volatilitet_10år": "16.0", "Sharpe_1år": "1.0", "Sharpe_3år": "0.7", "Sharpe_5år": "0.9", "Sharpe_10år": "0.8"},

];




// Hjelpefunksjon for å parse tall fra strenger (inkl. å bytte komma til punktum)

const parseNum = (val) => {

  if (val === null || val === undefined || val === '-' || val === '') return NaN;

  return parseFloat(String(val).replace(',', '.'));

};




// --- FARGEGRADERINGSFUNKSJONER ---

const interpolateColor = (color1, color2, factor) => {

  const r = Math.round(color1[0] + factor * (color2[0] - color1[0]));

  const g = Math.round(color1[1] + factor * (color2[1] - color1[1]));

  const b = Math.round(color1[2] + factor * (color2[2] - color1[2]));

  return `rgb(${r}, ${g}, ${b})`;

};




const getSharpeColor = (sharpe) => {

  if (isNaN(sharpe)) return "rgb(156, 163, 175)"; // Grå for manglende data




  if (sharpe < 1) {

    // Under 1: Lyserødt nær 1, mørkere rød jo dårligere (ned mot -1)

    const factor = Math.max(0, Math.min(1, (sharpe + 1) / 2)); // sharpe=1 -> factor=1 (lys), sharpe=-1 -> factor=0 (mørk)

    return interpolateColor([127, 29, 29], [252, 165, 165], factor);

  } else if (sharpe < 2) {

    // 1 til 1.99: Oransje ved 1, blir oransjegrønn/lime mot 2

    const factor = sharpe - 1; // sharpe=1 -> factor=0 (oransje), sharpe=2 -> factor=1 (lime)

    return interpolateColor([249, 115, 22], [132, 204, 22], factor);

  } else {

    // 2 og oppover: Lysegrønn ved 2, blir mørkegrønn jo høyere det er (f.eks opp mot 4)

    const factor = Math.max(0, Math.min(1, (sharpe - 2) / 2)); // sharpe=2 -> factor=0 (lys), sharpe=4+ -> factor=1 (mørk)

    return interpolateColor([74, 222, 128], [20, 83, 45], factor);

  }

};




export default function App() {

  const [data, setData] = useState(initialMockData);

  const [fileName, setFileName] = useState("Viser testdata");

  

  // Filter-states

  const [typeFilter, setTypeFilter] = useState("");

  const [groupFilter, setGroupFilter] = useState("");

  const [companyFilter, setCompanyFilter] = useState("");




  // Sortering & Graf-states

  const [sortConfig, setSortConfig] = useState({ key: "Fondsnavn", direction: "asc" });

  const [chartPeriod, setChartPeriod] = useState("3år"); // 1år, 3år, 5år, 10år




  // Sjekker om minst ett filter er aktivt (for å vise graf)

  const hasActiveFilter = typeFilter !== "" || groupFilter !== "" || companyFilter !== "";




  // Håndter filopplasting

  const handleFileUpload = (event) => {

    const file = event.target.files[0];

    if (file) {

      const reader = new FileReader();

      reader.onload = (e) => {

        try {

          const uploadedData = JSON.parse(e.target.result);

          setData(uploadedData);

          setFileName(`Lastet opp: ${file.name}`);

          setTypeFilter("");

          setGroupFilter("");

          setCompanyFilter("");

        } catch (error) {

          alert("Kunne ikke lese filen. Er du sikker på at det er en gyldig JSON-fil?");

        }

      };

      reader.readAsText(file);

    }

  };




  // --- DYNAMISK FILTER LOGIKK ---

  const getAvailableOptions = (field, currentType, currentGroup, currentCompany) => {

    const relevantData = data.filter(item => {

      let keep = true;

      if (field !== 'Fondstype' && currentType) keep = keep && item.Fondstype === currentType;

      if (field !== 'Fondsgruppe' && currentGroup) keep = keep && item.Fondsgruppe === currentGroup;

      if (field !== 'Forvaltningsselskap' && currentCompany) keep = keep && item.Forvaltningsselskap === currentCompany;

      return keep;

    });




    return [...new Set(relevantData.map(item => item[field]))]

      .filter(val => val && val !== "-" && val !== "")

      .sort();

  };




  const availableTypes = useMemo(() => getAvailableOptions('Fondstype', typeFilter, groupFilter, companyFilter), [data, typeFilter, groupFilter, companyFilter]);

  const availableGroups = useMemo(() => getAvailableOptions('Fondsgruppe', typeFilter, groupFilter, companyFilter), [data, typeFilter, groupFilter, companyFilter]);

  const availableCompanies = useMemo(() => getAvailableOptions('Forvaltningsselskap', typeFilter, groupFilter, companyFilter), [data, typeFilter, groupFilter, companyFilter]);




  // Hovedfiltrering & Sortering

  const filteredAndSortedData = useMemo(() => {

    let processedData = data.filter(item => {

      return (typeFilter === "" || item.Fondstype === typeFilter) &&

             (groupFilter === "" || item.Fondsgruppe === groupFilter) &&

             (companyFilter === "" || item.Forvaltningsselskap === companyFilter);

    });




    if (sortConfig.key) {

      processedData.sort((a, b) => {

        let valA = a[sortConfig.key];

        let valB = b[sortConfig.key];




        const isMissingA = !valA || valA === "-";

        const isMissingB = !valB || valB === "-";

        

        if (isMissingA && isMissingB) return 0;

        if (isMissingA) return 1;

        if (isMissingB) return -1;




        const numA = parseNum(valA);

        const numB = parseNum(valB);




        if (!isNaN(numA) && !isNaN(numB)) {

          return sortConfig.direction === "asc" ? numA - numB : numB - numA;

        }




        return sortConfig.direction === "asc" 

          ? String(valA).localeCompare(String(valB))

          : String(valB).localeCompare(String(valA));

      });

    }




    return processedData;

  }, [data, typeFilter, groupFilter, companyFilter, sortConfig]);




  // --- BEREGNING AV GJENNOMSNITT ---

  const averages = useMemo(() => {

    const colsToAverage = [

      'Avkastning_YTD_%', 'Avkastning_snitt_1år_%', 'Avkastning_snitt_3år_%', 'Avkastning_snitt_5år_%', 'Avkastning_snitt_10år_%',

      'Sharpe_1år', 'Sharpe_3år', 'Sharpe_5år', 'Sharpe_10år'

    ];

    

    let sums = {};

    let counts = {};

    colsToAverage.forEach(c => { sums[c] = 0; counts[c] = 0; });




    filteredAndSortedData.forEach(row => {

       colsToAverage.forEach(c => {

         const val = parseNum(row[c]);

         if (!isNaN(val)) {

           sums[c] += val;

           counts[c] += 1;

         }

       });

    });




    let avgs = {};

    colsToAverage.forEach(c => {

       avgs[c] = counts[c] > 0 ? (sums[c] / counts[c]).toFixed(2) : '-';

    });

    return avgs;

  }, [filteredAndSortedData]);




  const handleSort = (key) => {

    let direction = "asc";

    if (sortConfig.key === key && sortConfig.direction === "asc") {

      direction = "desc";

    }

    setSortConfig({ key, direction });

  };




  const Th = ({ label, sortKey, align = "left" }) => (

    <th 

      onClick={() => handleSort(sortKey)}

      className={`px-4 py-3 bg-gray-50 dark:bg-slate-800 text-${align} text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors select-none`}

    >

      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>

        {label}

        {sortConfig.key === sortKey ? (

          sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-blue-500" />

        ) : (

          <div className="w-4 h-4 opacity-0" />

        )}

      </div>

    </th>

  );




  // --- RENDER SCATTER PLOT ---

  const renderScatterPlot = () => {

    if (!hasActiveFilter) return null;




    const xKey = `Volatilitet_${chartPeriod}`;

    const yKey = `Avkastning_snitt_${chartPeriod}_%`;

    const sharpeKey = `Sharpe_${chartPeriod}`;




    // Filtrer ut fond som mangler data for valgt periode

    const plotData = filteredAndSortedData.map(f => ({

      name: f.Fondsnavn,

      x: parseNum(f[xKey]),

      y: parseNum(f[yKey]),

      sharpe: parseNum(f[sharpeKey])

    })).filter(d => !isNaN(d.x) && !isNaN(d.y));




    if (plotData.length === 0) {

      return (

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex items-center justify-center h-64 text-gray-500">

          Ikke nok data til å tegne graf for {chartPeriod}.

        </div>

      );

    }




    const avgSharpe = parseNum(averages[sharpeKey]);




    // Oppsett av dimensjoner og skala for SVG

    const width = 800;

    const height = 300;

    const padding = { top: 20, right: 30, bottom: 40, left: 50 };

    const innerWidth = width - padding.left - padding.right;

    const innerHeight = height - padding.top - padding.bottom;




    const minX = 0; // Setter min volatilitet til 0 for konsekvent akse

    const maxX = Math.max(...plotData.map(d => d.x)) * 1.1 || 10;

    const minY = Math.min(0, ...plotData.map(d => d.y)) * 1.1; // Ta med 0 eller lavere

    const maxY = Math.max(...plotData.map(d => d.y)) * 1.1 || 10;




    const scaleX = (x) => padding.left + ((x - minX) / (maxX - minX)) * innerWidth;

    const scaleY = (y) => height - padding.bottom - ((y - minY) / (maxY - minY)) * innerHeight;




    return (

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4 duration-500">

        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-4">

          <div>

            <h3 className="text-lg font-semibold flex items-center gap-2">

              <BarChart2 className="w-5 h-5 text-blue-500" />

              Risiko mot Avkastning ({chartPeriod})

            </h3>

            <p className="text-xs text-gray-500 mt-1 mb-3">Stiplet blå linje viser snitt Sharpe for utvalget.</p>

            

            {/* Statisk fargegradering for punktene (Legend) */}

            <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-gray-100 dark:border-slate-700">

              <span className="font-medium mr-1">Farge på punkter (Sharpe):</span>

              <span className="flex items-center gap-1">

                <span className="w-3 h-3 rounded-full bg-[#7f1d1d] shadow-sm"></span>

                <span>Dårlig (&lt; 1)</span>

                <span className="w-3 h-3 rounded-full bg-[#fca5a5] shadow-sm"></span>

              </span>

              <span className="mx-1 text-gray-300">|</span>

              <span className="flex items-center gap-1">

                <span className="w-3 h-3 rounded-full bg-[#f97316] shadow-sm"></span>

                <span>Middels (1 - 1.99)</span>

                <span className="w-3 h-3 rounded-full bg-[#84cc16] shadow-sm"></span>

              </span>

              <span className="mx-1 text-gray-300">|</span>

              <span className="flex items-center gap-1">

                <span className="w-3 h-3 rounded-full bg-[#4ade80] shadow-sm"></span>

                <span>God (&ge; 2)</span>

                <span className="w-3 h-3 rounded-full bg-[#14532d] shadow-sm"></span>

              </span>

            </div>

          </div>

          <div className="flex gap-2 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg shrink-0">

            {['1år', '3år', '5år', '10år'].map(period => (

              <button

                key={period}

                onClick={() => setChartPeriod(period)}

                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${

                  chartPeriod === period 

                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 

                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'

                }`}

              >

                {period}

              </button>

            ))}

          </div>

        </div>




        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '800/300' }}>

          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible text-gray-800 dark:text-gray-200">

            

            {/* Grid linjer (Y-akse) */}

            {[0, 0.25, 0.5, 0.75, 1].map(tick => {

              const yVal = minY + (maxY - minY) * tick;

              const yPos = scaleY(yVal);

              return (

                <g key={tick}>

                  <line x1={padding.left} y1={yPos} x2={width - padding.right} y2={yPos} stroke="currentColor" className="opacity-10" />

                  <text x={padding.left - 10} y={yPos} textAnchor="end" alignmentBaseline="middle" className="text-[10px] fill-gray-500">

                    {yVal.toFixed(1)}%

                  </text>

                </g>

              );

            })}




            {/* Gjennomsnittlig Sharpe stiplet linje */}

            {!isNaN(avgSharpe) && (

              <line 

                x1={scaleX(0)} 

                y1={scaleY(0)} 

                x2={scaleX(maxX)} 

                y2={scaleY(maxX * avgSharpe)} 

                stroke="#3b82f6" 

                strokeWidth="2" 

                strokeDasharray="5,5" 

                className="opacity-80"

              />

            )}




            {/* Datapunkter */}

            {plotData.map((d, i) => (

              <circle 

                key={i}

                cx={scaleX(d.x)} 

                cy={scaleY(d.y)} 

                r="6" 

                fill={getSharpeColor(d.sharpe)} 

                className="opacity-90 hover:opacity-100 transition-all cursor-pointer stroke-white dark:stroke-slate-800 stroke-[1.5px] hover:r-8"

              >

                <title>{d.name}&#10;Avkastning: {d.y}%&#10;Volatilitet: {d.x}&#10;Sharpe: {isNaN(d.sharpe) ? '-' : d.sharpe}</title>

              </circle>

            ))}

          </svg>

        </div>

      </div>

    );

  };




  return (

    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 p-4 md:p-8 font-sans text-gray-900 dark:text-gray-100">

      <div className="max-w-7xl mx-auto space-y-6">

        

        {/* Header */}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">

          <div>

            <h1 className="text-2xl font-bold tracking-tight">Fondsmatrise</h1>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Avkastning og risiko (Sharpe) over tid.</p>

          </div>

          

          <div className="flex items-center gap-3">

            <span className="text-sm text-gray-500 dark:text-gray-400">{fileName}</span>

            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">

              <Upload className="w-4 h-4" />

              Last opp JSON

              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />

            </label>

          </div>

        </div>




        {/* Filter-seksjon */}

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">

          <div className="flex items-center justify-between mb-4">

            <h2 className="text-lg font-semibold">Filtrer data</h2>

            <button 

              onClick={() => { setTypeFilter(""); setGroupFilter(""); setCompanyFilter(""); }}

              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"

            >

              <RefreshCcw className="w-3 h-3" /> Nullstill filtre

            </button>

          </div>

          

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="space-y-1">

              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fondstype</label>

              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border">

                <option value="">-- Alle --</option>

                {availableTypes.map(type => <option key={type} value={type}>{type}</option>)}

              </select>

            </div>

            <div className="space-y-1">

              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fondsgruppe</label>

              <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-full border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border">

                <option value="">-- Alle --</option>

                {availableGroups.map(group => <option key={group} value={group}>{group}</option>)}

              </select>

            </div>

            <div className="space-y-1">

              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Forvaltningsselskap</label>

              <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="w-full border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border">

                <option value="">-- Alle --</option>

                {availableCompanies.map(company => <option key={company} value={company}>{company}</option>)}

              </select>

            </div>

          </div>

        </div>




        {/* Betinget Scatter Plot */}

        {renderScatterPlot()}




        {/* Tabell/Matrise-seksjon */}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">

          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">

            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">

              Viser {filteredAndSortedData.length} av {data.length} fond

            </span>

          </div>

          

          <div className="overflow-x-auto">

            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">

              <thead>

                <tr>

                  <th colSpan={4} className="px-4 py-2 bg-gray-100 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700"></th>

                  <th colSpan={5} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-center text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider border-r border-blue-100 dark:border-blue-800/30">Avkastning (%)</th>

                  <th colSpan={4} className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-center text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Sharpe Ratio</th>

                </tr>

                <tr>

                  <Th label="Fondsnavn" sortKey="Fondsnavn" />

                  <Th label="Type" sortKey="Fondstype" />

                  <Th label="Gruppe" sortKey="Fondsgruppe" />

                  <Th label="Selskap" sortKey="Forvaltningsselskap" />

                  <Th label="YTD" sortKey="Avkastning_YTD_%" align="right" />

                  <Th label="1 år" sortKey="Avkastning_snitt_1år_%" align="right" />

                  <Th label="3 år" sortKey="Avkastning_snitt_3år_%" align="right" />

                  <Th label="5 år" sortKey="Avkastning_snitt_5år_%" align="right" />

                  <Th label="10 år" sortKey="Avkastning_snitt_10år_%" align="right" />

                  <Th label="1 år" sortKey="Sharpe_1år" align="right" />

                  <Th label="3 år" sortKey="Sharpe_3år" align="right" />

                  <Th label="5 år" sortKey="Sharpe_5år" align="right" />

                  <Th label="10 år" sortKey="Sharpe_10år" align="right" />

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">

                {filteredAndSortedData.map((fond, index) => (

                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">

                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{fond.Fondsnavn}</td>

                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{fond.Fondstype}</td>

                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{fond.Fondsgruppe}</td>

                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 border-r border-gray-100 dark:border-slate-800">{fond.Forvaltningsselskap}</td>

                    

                    {['Avkastning_YTD_%', 'Avkastning_snitt_1år_%', 'Avkastning_snitt_3år_%', 'Avkastning_snitt_5år_%', 'Avkastning_snitt_10år_%'].map(key => (

                      <td key={key} className={`px-4 py-3 whitespace-nowrap text-sm text-right ${fond[key] && fond[key] !== '-' && parseNum(fond[key]) < 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>

                         {fond[key] || '-'}

                      </td>

                    ))}

                    

                    {['Sharpe_1år', 'Sharpe_3år', 'Sharpe_5år', 'Sharpe_10år'].map((key, i) => (

                      <td key={key} className={`px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-300 ${i===0 ? 'border-l border-gray-100 dark:border-slate-800' : ''}`}>

                         {fond[key] || '-'}

                      </td>

                    ))}

                  </tr>

                ))}

                

                {filteredAndSortedData.length === 0 && (

                  <tr>

                    <td colSpan="13" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">

                      Ingen fond matcher valgte filtre.

                    </td>

                  </tr>

                )}

              </tbody>

              

              {/* --- GJENNOMSNITT FOOTER --- */}

              {filteredAndSortedData.length > 0 && (

                <tfoot className="bg-gray-100 dark:bg-slate-900/80 border-t-2 border-gray-300 dark:border-slate-600 font-semibold">

                  <tr>

                    <td colSpan={4} className="px-4 py-4 text-sm text-right text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-slate-600">

                      Gjennomsnitt for utvalg:

                    </td>

                    

                    {['Avkastning_YTD_%', 'Avkastning_snitt_1år_%', 'Avkastning_snitt_3år_%', 'Avkastning_snitt_5år_%', 'Avkastning_snitt_10år_%'].map(key => (

                      <td key={`avg-${key}`} className={`px-4 py-4 whitespace-nowrap text-sm text-right ${averages[key] !== '-' && parseFloat(averages[key]) < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>

                         {averages[key]}

                      </td>

                    ))}

                    

                    {['Sharpe_1år', 'Sharpe_3år', 'Sharpe_5år', 'Sharpe_10år'].map((key, i) => (

                      <td key={`avg-${key}`} className={`px-4 py-4 whitespace-nowrap text-sm text-right text-emerald-700 dark:text-emerald-400 ${i===0 ? 'border-l border-gray-300 dark:border-slate-600' : ''}`}>

                         {averages[key]}

                      </td>

                    ))}

                  </tr>

                </tfoot>

              )}

            </table>

          </div>

        </div>




      </div>

    </div>

  );

}

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7fc3bb1b-eacd-4f3e-a871-90dfc0668e34).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
