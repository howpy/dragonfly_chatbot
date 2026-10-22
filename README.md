# dragonfly_chatbot

An independent DeepSeek Harness support agent for **Dragonfly 3D World** built-in
features. It searches official help and, when available, official Python files in the
user's own Dragonfly installation. It does not claim vendor endorsement.

## Install

Requires Node.js >=22.19 and DeepSeek Harness 0.2.1-rc.2.

```sh
dsh plugin add github:howpy/dragonfly_chatbot#v0.2.0
```

At first activation the agent checks the computer for Dragonfly. Windows discovery
checks uninstall registry entries, standard installation locations, product folders
at drive roots and PATH. DRAGONFLY_ROOT / DRAGONFLY_HOME and the `dragonflyPath`
configuration field support custom locations. Detection validates the executable and
product directory structure; it never launches Dragonfly or scans entire drives.
Linux/macOS location discovery is best effort and has not been tested on those systems.

**No Dragonfly found:** help-only mode remains fully usable. The agent states this
in its first Dragonfly answer and every tool response. Run `dragonfly-chatbot doctor`
for a direct report. Reload the plugin after installing Dragonfly or changing paths.

**Dragonfly found:** help search defaults to its detected version; official Python
source is searched in place only when the source tool is called. Multiple versions
remain separate. Unknown or unsupported versions are reported without silently
substituting documentation. You may explicitly request another documented version.

## Evidence and data

The package contains 525 English help pages for Dragonfly 2027.1.
Chinese queries use bilingual term expansion; answers can be in either language.
Help citations refer to extracted text lines, not original HTML line numbers.
Official notices are retained. See [NOTICE.md](NOTICE.md).

No Dragonfly implementation source, binaries, user extensions or installed Python
packages are distributed. Only the agent's own code and extracted help text ship.
Local source is read from `python/OrsPythonPlugins`, `ORSServiceClass`, `OrsHelpers`,
`OrsLibraries` and `ORSModel`; no persistent source index or source export is created.
Files outside these roots, symlinks, settings and credentials are excluded. Compiled
implementations cannot be inspected. Searches have file/byte budgets and report when
truncated; no hit is not proof that an API does not exist.

Evidence returned to Harness enters the configured model context and may be sent to
its model provider. Retrieval is deterministic; answer quality also depends on the LLM.

## Tools and configuration

- `search_dragonfly_knowledge`: version-filtered help search.
- `search_dragonfly_source`: bounded read-only local Python search.
- `read_dragonfly_evidence`: read an ID returned by either search.
- `get_dragonfly_corpus_status`: environment, paths, versions and help coverage.

Configuration: `dragonflyPath` (optional product root/executable), `helpCorpusFile`
(optional additional help-only JSON), `maxResults` (1–20, default 8). Configure these
on the `dragonfly-chatbot` row in your Harness profile.

```sh
dragonfly-chatbot doctor
dragonfly-chatbot doctor --dragonfly-path "D:/Dragonfly2027.1"
dragonfly-chatbot search --query "threshold segmentation" --version 2027.1
dragonfly-chatbot source --query "Channel" --version 2027.1
```

Extra 2027.1 help can be imported with `import --root HELP_PATH --source-id my_help
--version 2027.1 --kind help --out help.json`. Product source and other help versions are rejected.
Never publish a corpus containing locally installed product code.

## Development

`npm ci`, `npm run check`, `npm pack`. Maintainers rebuild text assets with:

```sh
python scripts/build_help.py --source "2027.1=PATH/Help/Content"
```

Only HTML help body text is extracted; scripts, styles and product source are excluded.
See [verification](docs/verification.md), [architecture](docs/architecture.md) and
[marketplace status](docs/marketplace.md).
