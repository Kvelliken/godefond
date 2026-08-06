import { defineMcp } from "@lovable.dev/mcp-js";
import searchFunds from "./tools/search-funds";
import getFund from "./tools/get-fund";
import listFilterOptions from "./tools/list-filter-options";

export default defineMcp({
  name: "godefond",
  title: "GodeFond",
  version: "0.1.0",
  instructions:
    "Verktøy for GodeFond: offentlige nøkkeltall for norske fond (avkastning, volatilitet, Sharpe-ratio, minimum tegningsbeløp) fra VFF. Bruk `list_filter_options` for å finne gyldige fondstyper, fondsgrupper og forvaltningsselskaper, `search_funds` for å filtrere og rangere fond, og `get_fund` for detaljer om ett fond.",
  tools: [searchFunds, getFund, listFilterOptions],
});
