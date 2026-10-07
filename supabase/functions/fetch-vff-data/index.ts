import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VFF_API_URL = "https://vff.no/actions/vff-module/vff-fond/index";

const FELT: Record<string, string> = {
  security_name: "Fondsnavn",
  riskclass: "Risikoklasse",
  complongname: "Forvaltningsselskap",
  mgmtcommision: "Forvaltningshonorar_%",
  totcost: "Løpende_kostnader_%",
  price: "NAV",
  benchmarksymbol: "Referanseindeks",
  activeshare: "Aktiv_andel_%",
  rety2d: "Avkastning_YTD_%",
  retgavg1yr: "Avkastning_snitt_1år_%",
  retgavg3yr: "Avkastning_snitt_3år_%",
  retgavg5yr: "Avkastning_snitt_5år_%",
  retgavg10yr: "Avkastning_snitt_10år_%",
  volatility1yr: "Volatilitet_1år",
  volatility3yr: "Volatilitet_3år",
  volatility5yr: "Volatilitet_5år",
  volatility10yr: "Volatilitet_10år",
  sharperatio1yr: "Sharpe_1år",
  sharperatio3yr: "Sharpe_3år",
  sharperatio5yr: "Sharpe_5år",
  sharperatio10yr: "Sharpe_10år",
  minsubscramnt: "Min_tegningsbeløp",
};

function normalizeFloat(val: unknown): string {
  if (val === null || val === undefined || val === "-" || val === "" || val === "None") return "-";
  const str = String(val).replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? "-" : num.toFixed(2);
}

function lookupType(typeId: string, types: Array<{ typeId: string | number; type?: string }>): string {
  for (const t of types) {
    if (String(t.typeId) === String(typeId)) return t.type || "";
  }
  return "";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resp = await fetch(VFF_API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GodeFond/1.0)",
        "Accept": "application/json",
        "Referer": "https://vff.no/fondsdata",
      },
    });

    if (!resp.ok) {
      throw new Error(`VFF API returned ${resp.status}`);
    }

    const raw = await resp.json();
    const fonds = raw.fonds || [];
    const types = raw.types || [];

    const processed: Record<string, string>[] = [];

    for (const f of fonds) {
      const values = f.values || {};
      const typeId = f.typeId || values.typeId || "";
      const groupId = f.groupId || values.groupId || "";
      const group = f.group || values.group || "";
      const typeName = lookupType(typeId, types);

      const ytdRaw = values.rety2d;
      if (ytdRaw === null || ytdRaw === undefined || ytdRaw === "-" || ytdRaw === "" || ytdRaw === "None") continue;

      const row: Record<string, string> = {
        FondstypeID: String(typeId),
        Fondstype: typeName,
        FondsGruppeID: String(groupId),
        Fondsgruppe: group,
      };

      for (const [apiKey, colName] of Object.entries(FELT)) {
        if (apiKey === "security_name" || apiKey === "complongname" || apiKey === "benchmarksymbol") {
          row[colName] = String(values[apiKey] || "");
        } else if (apiKey === "minsubscramnt") {
          const raw = values[apiKey];
          row[colName] = (raw === null || raw === undefined || raw === "" || raw === "None") ? "0" : String(raw).replace(',', '.');
        } else {
          row[colName] = normalizeFloat(values[apiKey]);
        }
      }

      processed.push(row);
    }

    processed.sort((a, b) => (a.Fondsnavn || "").localeCompare(b.Fondsnavn || ""));

    const now = new Date().toISOString();

    // Save to fund_cache table
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);

      // Delete old cache entries and insert new one
      await sb.from("fund_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await sb.from("fund_cache").insert({
        data: processed,
        fund_count: processed.length,
        updated_at: now,
      });
    } catch (dbErr) {
      console.error("Failed to save to fund_cache:", dbErr);
    }

    const result = {
      metadata: {
        updated: now,
        count: processed.length,
        totalBeforeFilter: fonds.length,
      },
      funds: processed,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("VFF fetch error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
