# Tool4Furry

V0.4-B: a real Image Converter draft, with no published tools yet. Read [docs/image-converter-implementation.md](docs/image-converter-implementation.md) for ownership, Beta acceptance and compatibility follow-ups. The user-supplied full contract is an attachment, not a required repository file.

- Read [docs/foundation.md](docs/foundation.md) for boundaries and verified integration decisions.
- `src/pages` + `src/layouts`: Astro SSG, site copy and published routes.
- Read [docs/site-homepage.md](docs/site-homepage.md) for the site contract. The only production homepage/catalog script is the exact inline `src/styles/appearance-controller.js` in head (`#t4f-appearance`), for pre-paint theme restoration and shared navigation switching. No React Island, unrelated bundle or JS preload. `section#tools` always exists; only current-region published registry entries enable cards and the hero CTA. No placeholder tools in the production registry.
- Read [docs/tool-platform-image-foundation.md](docs/tool-platform-image-foundation.md) for V0.4-A. Taxonomy is owned by `src/site/taxonomy.ts`; Registry remains the publication gate. Homepage has <=9 curated tools, `/tools/` covers all, Switcher has <=6 shortcuts plus the full catalog. Header/Footer/404 toolbox links now use `/tools/`; keep the historical home `#tools` anchor.
- Published metadata must pass `assertValidRegistry` and have regional Astro-only content in `src/site/tool-content.ts`. ToolRuntime accepts a static intro slot: formal pages have one Astro H1; Lab keeps its heading and Canvas overlay behavior. Never import long tool content into React.
- `processing-state.ts` is a pure per-tool version contract, not a scheduler/store. Callers own settings validation, equality, real output verification and disposal of rejected/obsolete resources. Converter owns a bounded serial lane and per-file batch intake; naming/mode changes never re-encode. Resizer/Cropper remain out of scope.
- Capability evidence, Beta policy and compatibility backlog: [docs/image-processing-capabilities.md](docs/image-processing-capabilities.md). `scripts/spikes` and `tests/fixtures` are never production resources; isolated fixture builds go outside the repository dist.
- Site header/footer and ToolPageFrame share `public/brand/tool4furry-mark.svg`; it is a replaceable geometric placeholder and the SVG favicon. Static decorative artwork stays local. `SiteLayout.fullTitle` overrides the default brand suffix only when supplied.
- `src/workbench`: optional slots, responsive layout and panel visibility only.
- Read [docs/workbench-appearance.md](docs/workbench-appearance.md) for the V0.3-B contract and verification. `ToolPageFrame` owns product entry/identity; Shell header is tool-local. Registry stays metadata-only; draft metadata must not enter published discovery.
- Canvas viewport geometry is independent of overlays; empty overlay layers use pointer-events:none. Inspector defaults closed; keep one stable Portal/parameter tree across the shared <=900px breakpoint. Form/Batch remain in document flow.
- `src/ui`: controlled primitives; read [docs/ui-primitives.md](docs/ui-primitives.md). Providers belong in fixed Lab/Tool React roots, never the static SiteLayout.
- FileDropzone delivers File references and metadata validation only; no reads, uploads, object URLs or persistence. Queues belong to callers. See [docs/file-interactions.md](docs/file-interactions.md).
- ScrollDock is opt-in document scrolling, currently only in FilesLab. Never mount it globally or control Canvas/internal panels. Preserve native scrolling.
- `src/tools/registry.ts`: metadata only; `loaders.ts`: separate lazy implementations.
- `src/lab`: development demos; never register them as published tools.
- Real tools use only `/tools/[slug]`: DEV includes regional drafts, production only regional published tools. Registry status is the single publication setting; Vite projects availability to a compile-time loader constant so draft chunks are not emitted. Keep Converter draft pending maintainer acceptance. `pnpm dev` runs isolated CN/EN services on 54321/54322; `pnpm dev stop` stops both.
- `src/config/region.ts`: region/domain contract; `src/i18n/messages.ts`: CN/English copy.
- Preserve LICENSE. Work on develop; integrate through PRs into pre-master, then release through PRs into master. Do not deploy without a request. Historical dev/main references in design and acceptance records describe the pre-migration branches.
- Use StyleX, with global CSS limited to reset and HTML basics. No old React Babel configuration.
- Read [docs/visual-foundation.md](docs/visual-foundation.md) for font delivery and visual tokens. Use action for primary controls, brand/sage for decoration, independent feedback colors; preserve primitive APIs. Font stacks have one owner in global.css; only normal Fontsource wght.css is loaded.
- No backend, database, SSR adapter, global business store, universal canvas engine or monorepo.
- Keep tool state outside WorkbenchShell; panel visibility and resizing must preserve it.
- Hydrate only directly imported fixed React roots in Astro.
- Choose local verification by L1 below; leave full CI primarily to existing GitHub Actions. When a full local run is warranted, use `pnpm check`, `pnpm test`, `pnpm build:cn`, `pnpm build:global` sequentially.
- Stop both dev services with `pnpm dev stop` before check/build. Astro and Vite caches are isolated by region; do not mix a build and dev for the same region.
- See README for browser acceptance paths. Do not claim real-device testing from jsdom.

## MVP Beta release policy (2026-10-10)

This policy supersedes conflicting mandatory cross-browser/device/resource-matrix release requirements in V0.4-A/B documents. Preserve historical evidence, safety checks, format verification and necessary automated tests. A policy update does not authorize publication.

- **L1 — Daily development:** UI/copy/style changes need relevant behavior and necessary viewports only; controls/state changes need related tests; image-core changes need the affected formats, failures and actual outputs verified. Documentation-only changes need text consistency, diff review and `git diff --check`. Do not repeat all browsers, all Lab regressions, the full test suite or both regional builds for every small change; full CI primarily runs in existing GitHub Actions.
- **L2 — MVP Beta:** all seven requirements must hold:

  1. Existing GitHub Actions CI passes.
  2. At least one real Chromium browser completes import, conversion, preview and download.
  3. Actual output format, MIME, file contents and downloaded result are correct.
  4. Desktop and common phone viewport layouts are usable without blocking interactions.
  5. Runtime capability detection safely disables unsupported encoders or reports an explicit error.
  6. No known data corruption, severe crashes or other blocking issues remain.
  7. The maintainer makes the final decision to enter Beta.

- **L3 — Compatibility follow-up:** after Beta, target Firefox, Safari/WebKit, real iOS/Android devices and performance testing according to feedback and need. A full browser/device matrix or universal resource-limit validation is not a Beta prerequisite. Record untested platforms and resource-limit uncertainty honestly; never claim universal compatibility. Known blocking defects still block L2.
