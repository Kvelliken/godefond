export interface FundData {
  Fondsnavn: string;
  Fondstype: string;
  Fondsgruppe: string;
  Forvaltningsselskap: string;
  "Avkastning_YTD_%": string;
  "Avkastning_snitt_1år_%": string;
  "Avkastning_snitt_3år_%": string;
  "Avkastning_snitt_5år_%": string;
  "Avkastning_snitt_10år_%": string;
  "Volatilitet_1år": string;
  "Volatilitet_3år": string;
  "Volatilitet_5år": string;
  "Volatilitet_10år": string;
  "Sharpe_1år": string;
  "Sharpe_3år": string;
  "Sharpe_5år": string;
  "Sharpe_10år": string;
  "Min_tegningsbeløp": string;
  [key: string]: string;
}

export type SortDirection = "asc" | "desc";
export type ChartPeriod = "1år" | "3år" | "5år" | "10år";
export type TimeHorizon = "y1" | "y3" | "y5";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export const parseNum = (val: string | null | undefined): number => {
  if (val === null || val === undefined || val === '-' || val === '') return NaN;
  return parseFloat(String(val).replace(',', '.'));
};

export const formatReturn = (val: string | undefined): string => {
  if (!val || val === '-') return '-';
  const num = parseNum(val);
  if (isNaN(num)) return '-';
  return num.toFixed(1);
};

export const getSharpeColor = (sharpe: number): string => {
  if (isNaN(sharpe)) return "hsl(215, 16%, 47%)";
  if (sharpe < 0) {
    // Red for negative Sharpe
    const factor = Math.max(0, Math.min(1, (sharpe + 2) / 2));
    return interpolateHSL([0, 84, 30], [0, 84, 50], factor);
  } else if (sharpe < 1) {
    // Orange for 0–1
    const factor = sharpe;
    return interpolateHSL([25, 95, 50], [38, 92, 55], factor);
  } else if (sharpe < 2) {
    // Green transition for 1–2
    const factor = sharpe - 1;
    return interpolateHSL([80, 70, 45], [142, 71, 50], factor);
  } else {
    // Deep green for 2+
    const factor = Math.max(0, Math.min(1, (sharpe - 2) / 2));
    return interpolateHSL([142, 71, 55], [142, 71, 30], factor);
  }
};

function interpolateHSL(a: number[], b: number[], t: number): string {
  const h = Math.round(a[0] + t * (b[0] - a[0]));
  const s = Math.round(a[1] + t * (b[1] - a[1]));
  const l = Math.round(a[2] + t * (b[2] - a[2]));
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export const MIN_AMOUNT_OPTIONS = [
  { label: "Under 10.000", value: 10000 },
  { label: "Under 100.000", value: 100000 },
  { label: "Under 1.000.000", value: 1000000 },
  { label: "Under 10.000.000", value: 10000000 },
  { label: "Alle", value: Infinity },
] as const;

export const NUMERIC_SORT_KEYS = [
  'Avkastning_YTD_%', 'Avkastning_snitt_1år_%', 'Avkastning_snitt_3år_%', 'Avkastning_snitt_5år_%', 'Avkastning_snitt_10år_%',
  'Sharpe_1år', 'Sharpe_3år', 'Sharpe_5år', 'Sharpe_10år',
];

export const MOCK_DATA: FundData[] = [
  {"Fondsnavn": "DNB Global Indeks", "Fondstype": "Aksjefond", "Fondsgruppe": "Global", "Forvaltningsselskap": "DNB Asset Management", "Avkastning_YTD_%": "5.2", "Avkastning_snitt_1år_%": "20.1", "Avkastning_snitt_3år_%": "12.5", "Avkastning_snitt_5år_%": "15.0", "Avkastning_snitt_10år_%": "14.2", "Volatilitet_1år": "16.5", "Volatilitet_3år": "14.2", "Volatilitet_5år": "13.5", "Volatilitet_10år": "14.0", "Sharpe_1år": "1.2", "Sharpe_3år": "0.9", "Sharpe_5år": "1.1", "Sharpe_10år": "1.0", "Min_tegningsbeløp": "100"},
  {"Fondsnavn": "KLP AksjeGlobal Indeks", "Fondstype": "Aksjefond", "Fondsgruppe": "Global", "Forvaltningsselskap": "KLP Kapitalforvaltning", "Avkastning_YTD_%": "5.1", "Avkastning_snitt_1år_%": "19.9", "Avkastning_snitt_3år_%": "12.4", "Avkastning_snitt_5år_%": "14.9", "Avkastning_snitt_10år_%": "14.1", "Volatilitet_1år": "16.4", "Volatilitet_3år": "14.1", "Volatilitet_5år": "13.4", "Volatilitet_10år": "13.9", "Sharpe_1år": "1.1", "Sharpe_3år": "0.85", "Sharpe_5år": "1.05", "Sharpe_10år": "0.95", "Min_tegningsbeløp": "3000"},
  {"Fondsnavn": "Storebrand Norge", "Fondstype": "Aksjefond", "Fondsgruppe": "Norge", "Forvaltningsselskap": "Storebrand Fondene", "Avkastning_YTD_%": "2.1", "Avkastning_snitt_1år_%": "10.5", "Avkastning_snitt_3år_%": "8.2", "Avkastning_snitt_5år_%": "9.5", "Avkastning_snitt_10år_%": "8.8", "Volatilitet_1år": "12.0", "Volatilitet_3år": "13.5", "Volatilitet_5år": "14.2", "Volatilitet_10år": "15.0", "Sharpe_1år": "0.8", "Sharpe_3år": "0.6", "Sharpe_5år": "0.7", "Sharpe_10år": "0.65", "Min_tegningsbeløp": "500000"},
  {"Fondsnavn": "Holberg Likviditet", "Fondstype": "Pengemarkedsfond", "Fondsgruppe": "Norge", "Forvaltningsselskap": "Holberg Fondene", "Avkastning_YTD_%": "1.2", "Avkastning_snitt_1år_%": "4.5", "Avkastning_snitt_3år_%": "2.5", "Avkastning_snitt_5år_%": "2.0", "Avkastning_snitt_10år_%": "-", "Volatilitet_1år": "0.8", "Volatilitet_3år": "0.9", "Volatilitet_5år": "1.0", "Volatilitet_10år": "-", "Sharpe_1år": "3.5", "Sharpe_3år": "2.1", "Sharpe_5år": "1.8", "Sharpe_10år": "-", "Min_tegningsbeløp": ""},
  {"Fondsnavn": "DNB Obligasjon", "Fondstype": "Obligasjonsfond", "Fondsgruppe": "Norge", "Forvaltningsselskap": "DNB Asset Management", "Avkastning_YTD_%": "1.5", "Avkastning_snitt_1år_%": "5.1", "Avkastning_snitt_3år_%": "1.5", "Avkastning_snitt_5år_%": "2.5", "Avkastning_snitt_10år_%": "3.0", "Volatilitet_1år": "3.5", "Volatilitet_3år": "4.0", "Volatilitet_5år": "3.8", "Volatilitet_10år": "3.5", "Sharpe_1år": "1.5", "Sharpe_3år": "0.4", "Sharpe_5år": "0.8", "Sharpe_10år": "1.1", "Min_tegningsbeløp": "1000"},
  {"Fondsnavn": "Odin Norden", "Fondstype": "Aksjefond", "Fondsgruppe": "Norden", "Forvaltningsselskap": "ODIN Forvaltning", "Avkastning_YTD_%": "4.5", "Avkastning_snitt_1år_%": "16.2", "Avkastning_snitt_3år_%": "10.1", "Avkastning_snitt_5år_%": "12.2", "Avkastning_snitt_10år_%": "11.5", "Volatilitet_1år": "15.0", "Volatilitet_3år": "16.5", "Volatilitet_5år": "15.8", "Volatilitet_10år": "16.0", "Sharpe_1år": "1.0", "Sharpe_3år": "0.7", "Sharpe_5år": "0.9", "Sharpe_10år": "0.8", "Min_tegningsbeløp": "50000"},
];
