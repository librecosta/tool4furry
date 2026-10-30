# Tools Catalog Workbench — V0.5-C7

Only localized `/tools/` uses `SiteLayout.catalogWorkbench`: the existing Header,
100dvh shell, 256px sidebar and independent native scrollports. No Footer,
compliance row or document scroll dock. Other pages retain their shell.
At ≤899px the same filter DOM becomes a native modal Dialog; Escape, backdrop,
focus return and desktop restoration are page-local. Very short viewports let
the sidebar and result controls scroll so inputs remain reachable.
Cards and pagination stay centered in the result area. At ≥1600px, four columns
use up to 1600px; narrower viewports retain the existing three/two/one columns.

Registry `getAvailableTools(region, dev)` is still the sole publication gate.
`taxonomy.ts` owns two-level category/group relationships; `roles.ts` owns six
identity IDs, labels and icon semantics. `ToolDefinition.roles` is a many-to-many
match, independent of homepage manual editorial order. Converter is the first and currently only Published tool in both regions (not deployed),
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

Parent rows contain a solid dot and own both disclosure and filtering: opening
selects that parent; collapsing preserves the current filter, page and scroll.
Several parents can stay open. Child rows have hollow dots, filled on selection;
dot, label and subdued count share one button/hover target. Choosing a group
opens its parent; later search/pagination do not reset expansion or tree scroll.
Pagination keeps first/last/neighbors. Above seven pages each 44px ellipsis
opens the same native jump dialog with current/total pages, validated input,
cancel/Escape and focus restoration. Confirm resets only result scrolling;
invalid input does not change URL. No permanent jump-input row. Filter and jump
dialogs never stack. Only the result scrollport resets on filtering/page changes.

Desktop has a borderless, shadow-free 24px handle centered on the menu edge,
using a distinct neutral surface and growing to 32px when collapsed; the target
stays 44px. One 300ms Grid transition
collapses the sidebar from 256px to zero without remounting it. Inert/clipping
protect hidden controls; filtering, expansions and scroll positions survive.
This view preference is page-local, never a URL/storage field. Mobile keeps the
same filter dialog; changing breakpoints synchronizes open/modal/inert state.
Reduced Motion switches directly; no JS leaves the sidebar visible/handle hidden.

Local scrollports reserve stable gutters. Chromium uses fixed 6px WebKit bars;
the standard thin/color fallback remains fixed for Firefox. Do not reintroduce
container-hover scrollbar-color: it overrides the Chromium pseudo-element path
and was measured changing its gutter from 5px to 15px in C7-r1. Only thumb color
changes on hover, never bar width, padding, overflow or content allocation.
Windows Chromium C7-r2 QA measured fixed 6px gutters and 0px horizontal movement
for category/count/card edges across enter/leave/scroll; Firefox's standard
fallback was reviewed, not claimed as a real Firefox-browser run.

`catalog-state` and controller fixtures cover 0/1/12/13/37/121 entries, history,
URL safety, search scopes, empty results and cleanup. Fixtures never enter the
Registry. `verify-build.mjs` separately identifies the catalog module and audits
its exact script/layout exception for CN/Global and both locales; all other
static pages retain their existing script and Footer contracts.

## DEV catalog samples (C7-r1/r2)

Only `ToolsCatalog.astro`, inside `import.meta.env.DEV`, dynamically imports
`src/site/catalog-fixture.ts`. The default is `off`: ordinary `pnpm dev` shows
only current-region real draft/published tools, with no sample note or cards.
Explicit `$env:T4F_CATALOG_FIXTURE='compact'; pnpm dev` appends 48 clearly labeled,
noninteractive samples (no href/loader/route), in six groups across five parent
categories and all six roles. With the current real tool this gives 49 entries,
five pages. The Registry, homepage and Header discovery never receive samples.

For ellipses/jump QA (>7 pages), start DEV in PowerShell with
`$env:T4F_CATALOG_FIXTURE='pagination'; pnpm dev`: 180 samples in the six groups
with counts `[108,24,12,12,12,12]`. With the real tool: all 181 entries/16 pages,
Images & Assets 133/12, Image Processing 109/10. Check first/middle/last at
1/8/16, 1/6/12 and 1/5/10 respectively, plus both ellipses, invalid input,
cancel/Escape, filter resets and browser Back. `off` restores only real tools.
Stop both services before changing the
mode; remove the env variable to restore the real-tool-only default. Unknown DEV values fail.
Production ignores this environment variable and the build guard rejects sample
markup/data. The mode is not a query/filter dimension or a publishing setting.

To remove later: delete the DEV branch/type import in `ToolsCatalog.astro`,
`catalog-fixture.ts` and its tests; restore `ToolCards.astro` to plain
`CatalogEntry` cards, remove sample-only copy/styles and this section. Preserve
the production anti-leak guard and real Registry gate.
