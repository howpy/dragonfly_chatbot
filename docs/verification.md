# Verification

Run `npm run check` for syntax, installation detection, help integrity, retrieval,
source-boundary, corpus-import and plugin tests. Fixtures use synthetic source created
by this project; no Dragonfly implementation files are included in tests.

`scripts/verify-harness.mjs PATH_TO_RUNTIME_NODE_MODULES [PLUGIN_ENTRY]` checks all
four tools through the official Harness 0.2.1-rc.2 tool pipeline, evidence reading,
invalid-ID rejection, prompt assembly and plugin disposal.

Windows local checks cover the installed 2025.1 and 2027.1 products. Fixture checks cover
absent installations, custom paths, multiple versions, strict help filters and bounded
local-source searching. Bundled text shards are hash-validated on every load.
CI checks tests and packaging on Windows/Linux; live product detection is only verified
on Windows. No live LLM answer-accuracy benchmark or native compiled-code inspection
is claimed. Detection is heuristic; use dragonflyPath for unusual installation layouts.
