# Tools Catalog Workbench — V0.5-C7

Only localized `/tools/` uses `SiteLayout.catalogWorkbench`: the existing Header,
100dvh shell, 256px sidebar and independent native scrollports. No Footer,
compliance row or document scroll dock. Other pages retain their shell.
At ≤899px the same filter DOM becomes a native modal Dialog; Escape, backdrop,
focus return and desktop restoration are page-local. Very short viewports let
the sidebar and result controls scroll so inputs remain reachable.

Registry `getAvailableTools(region, dev)` is still the sole publication gate.
`taxonomy.ts` owns two-level category/group relationships; `roles.ts` owns six
identity IDs, labels and icon semantics. `ToolDefinition.roles` is a many-to-many
match, independent of homepage manual editorial order. Converter remains draft,
associated with painter/developer/animator/operations. Legacy audiences/contexts
remain metadata-compatible, but the catalog never reads those dimensions.
The unused `getDiscoverySections` projection, its legacy assertions and the old
vertical catalog styles have been removed after checking consumers.

The static Astro cards contain all current regional entries, real links and
localized search metadata. With no JS they remain complete and scrollable;
search/filter controls are disabled with a noscript explanation. One owned Astro
module enhances only this route; no Island, new dependency, API or global store.

URL whitelist: `category` OR `group`, `role`, `q`, `page`. Valid group wins a
conflict. Unknown/unavailable IDs and parameters are dropped; q is NFKC/whitespace
normalized, limited to 160 characters; invalid page becomes 1 and excessive page
clamps after filtering. Page 1 is omitted. Filtering precedes 12-item pagination
in stable Registry order. Search-all preserves q and clears both scopes. Text
editing merges one typing session into a history entry; popstate restores the
view. Locale links carry only sanitized catalog state, then validate against the
target locale's regional data. Canonical/hreflang remain clean static paths.

Expansion is independent of filtering. Choosing a group opens its parent; later
search/pagination do not reset user expansion or tree scroll. Pagination includes
first/last/neighbors, noninteractive ellipses, and validated jump input above
seven pages. Only the result scrollport resets on filtering/page changes.

`catalog-state` and controller fixtures cover 0/1/12/13/37/121 entries, history,
URL safety, search scopes, empty results and cleanup. Fixtures never enter the
Registry. `verify-build.mjs` separately identifies the catalog module and audits
its exact script/layout exception for CN/Global and both locales; all other
static pages retain their existing script and Footer contracts.
