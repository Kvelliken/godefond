import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { loadFunds, parseNum, type FundRow } from "../supabase";

const SORT_KEYS = [
  "Avkastning_YTD_%",
  "Avkastning_snitt_1år_%",
  "Avkastning_snitt_3år_%",
  "Avkastning_snitt_5år_%",
  "Avkastning_snitt_10år_%",
  "Volatilitet_1år",
  "Volatilitet_3år",
  "Volatilitet_5år",
  "Volatilitet_10år",
  "Sharpe_1år",
  "Sharpe_3år",
  "Sharpe_5år",
  "Sharpe_10år",
] as const;

export default defineTool({
  name: "search_funds",
  title: "Søk i fond",
  description:
    "Søk og filtrer norske fond på navn, fondstype, fondsgruppe, forvaltningsselskap og minimum tegningsbeløp. Sorterer på avkastning, volatilitet eller Sharpe-ratio.",
  inputSchema: {
    query: z.string().trim().optional().describe("Fritekstsøk i fondsnavn."),
    fondstype: z.string().trim().optional().describe("Eksakt fondstype, f.eks. 'Aksjefond'."),
    fondsgruppe: z.string().trim().optional().describe("Eksakt fondsgruppe."),
    forvaltningsselskap: z.string().trim().optional().describe("Eksakt forvaltningsselskap."),
    maxMinTegningsbelop: z
      .number()
      .positive()
      .optional()
      .describe("Ta kun med fond med minimum tegningsbeløp under denne verdien (NOK)."),
    sortBy: z.enum(SORT_KEYS).optional().describe("Kolonne å sortere synkende på (høyest først)."),
    limit: z.number().int().min(1).max(200).default(20).describe("Maks antall fond som returneres."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, fondstype, fondsgruppe, forvaltningsselskap, maxMinTegningsbelop, sortBy, limit }) => {
    const { funds, updatedAt } = await loadFunds();
    const q = query?.toLowerCase();

    let result: FundRow[] = funds.filter((f) => {
      if (q && !String(f.Fondsnavn ?? "").toLowerCase().includes(q)) return false;
      if (fondstype && f.Fondstype !== fondstype) return false;
      if (fondsgruppe && f.Fondsgruppe !== fondsgruppe) return false;
      if (forvaltningsselskap && f.Forvaltningsselskap !== forvaltningsselskap) return false;
      if (maxMinTegningsbelop !== undefined) {
        const amt = parseNum(f["Min_tegningsbeløp"]);
        if (!isNaN(amt) && amt >= maxMinTegningsbelop) return false;
      }
      return true;
    });

    if (sortBy) {
      result = [...result].sort((a, b) => {
        const na = parseNum(a[sortBy]);
        const nb = parseNum(b[sortBy]);
        if (isNaN(na) && isNaN(nb)) return 0;
        if (isNaN(na)) return 1;
        if (isNaN(nb)) return -1;
        return nb - na;
      });
    }

    const matched = result.length;
    const rows = result.slice(0, limit);

    return {
      content: [
        {
          type: "text" as const,
          text: `${matched} fond matchet (viser ${rows.length}). Data oppdatert: ${updatedAt ?? "ukjent"}.\n\n${JSON.stringify(rows, null, 2)}`,
        },
      ],
      structuredContent: { matched, returned: rows.length, updatedAt, funds: rows },
    };
  },
});
