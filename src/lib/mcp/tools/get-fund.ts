import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { loadFunds } from "../supabase";

export default defineTool({
  name: "get_fund",
  title: "Hent fond",
  description: "Hent alle nøkkeltall (avkastning, volatilitet, Sharpe, min. tegningsbeløp) for ett fond ved navn.",
  inputSchema: {
    fondsnavn: z.string().trim().min(1).describe("Fondsnavn, helt eller delvis."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ fondsnavn }) => {
    const { funds, updatedAt } = await loadFunds();
    const q = fondsnavn.toLowerCase();
    const exact = funds.find((f) => String(f.Fondsnavn ?? "").toLowerCase() === q);
    const fund = exact ?? funds.find((f) => String(f.Fondsnavn ?? "").toLowerCase().includes(q));

    if (!fund) throw new ToolError(`Fant ingen fond som matcher "${fondsnavn}".`);

    return {
      content: [{ type: "text" as const, text: JSON.stringify(fund, null, 2) }],
      structuredContent: { fund, updatedAt },
    };
  },
});
