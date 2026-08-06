import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { loadFunds } from "../supabase";

const FIELDS = ["Fondstype", "Fondsgruppe", "Forvaltningsselskap"] as const;

export default defineTool({
  name: "list_filter_options",
  title: "List filtervalg",
  description:
    "List tilgjengelige verdier for fondstype, fondsgruppe eller forvaltningsselskap, samt når fondsdataen sist ble oppdatert.",
  inputSchema: {
    field: z.enum(FIELDS).describe("Feltet du vil ha unike verdier for."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ field }) => {
    const { funds, updatedAt, fundCount } = await loadFunds();
    const values = [...new Set(funds.map((f) => f[field]))]
      .filter((v) => v && v !== "-")
      .sort((a, b) => a.localeCompare(b, "nb"));

    return {
      content: [
        {
          type: "text" as const,
          text: `${values.length} verdier for ${field} (${fundCount ?? funds.length} fond, oppdatert ${updatedAt ?? "ukjent"}):\n${values.join("\n")}`,
        },
      ],
      structuredContent: { field, values, updatedAt, fundCount },
    };
  },
});
