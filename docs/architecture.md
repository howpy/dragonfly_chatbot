# Evidence architecture

Activation validates the bundled help manifest, builds a BM25 help index and discovers
local Dragonfly installations. No source file contents are read during detection.
Default version is the newest detected known version, otherwise newest bundled help.
Explicit versions filter strictly. Unsupported installed versions return missing help
coverage until matching help is provided; the agent must not silently substitute.

Source search is separate and lazy: only detected official Python roots are catalogued.
Each query reads at most 1,200 files / 16 MiB; each file is at most 2 MiB. Filename
matches are prioritized. Results contain bounded excerpts; up to 400 returned evidence
snapshots live in memory until reload. No persistent product source corpus exists.
Read-by-ID accepts only help IDs or cached source-result IDs, never a filesystem path.
Symlinks, settings, credentials and user extension trees are excluded.

Help-only notices appear in the system prompt, status and every tool response. Detection
runs on activation and the doctor command, not as an npm postinstall side effect.
The host LLM renders the first-answer notice; doctor always prints it directly.

The help library and optional corpus imports accept 2027.1 help documents only. The help maintainer extractor reads
HTML main content, drops scripts/styles/navigation and retains notices. Build inputs
remain outside this repository. The agent never executes installed Dragonfly code.
