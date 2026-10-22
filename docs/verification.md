# Release verification

Environment: Windows 10, Node 22.23.3, official npm
`@deepseek-ai/dsh@0.2.1-rc.2`. Test profiles and runtime are isolated under the
development workspace's temporary directory; no normal user profile is changed.

## Automated checks

- Source syntax, 12 importer/CLI/retrieval/plugin tests and 7 corpus checks.
- Real directory junction escape attempt is excluded; invalid evidence IDs cannot read paths.
- Version filters exclude both other-version and unknown-version documents.
- CLI import/search round-trip works; existing output is not overwritten without `--force`.
- Long source-line tails remain searchable and evidence output stays bounded.
- Every bundled manual's SHA-256 matches its recorded provenance (162 docs / 112 plugins).
- Six bilingual/manual queries find their expected document within the top five hits.

These six retrieval checks are regressions, not an independent held-out benchmark
or an estimate of user-question accuracy. The initial broader question seeds still
need manually verified gold evidence.

## Official Harness integration

`scripts/verify-harness.mjs` loads the actual Cordis, SystemPrompt and ToolRuntime
services from the supplied runtime. It checks three registered tools, successful
status/search/read dispatch through the official tool pipeline, rejected invalid
evidence, prompt assembly with all tools, and disposal removing tools and guidance.

The official CLI's plugin manager installs the local bundle into an isolated
`dragonfly-release` profile. `--dump-config` confirms the named bundle layer and
`dragonfly-chatbot` row. Release installation is additionally checked against the
public GitHub tag before reporting it as installable.

## Limits

No live LLM answer-quality evaluation has been performed. Model choice, generated
queries and evidence use affect final answers. Desktop visual integration and
other Harness versions are not claimed tested. The GitHub CI workflow checks
unit tests and packaging on Linux and Windows; its actual run status is reported
separately in the release report.
