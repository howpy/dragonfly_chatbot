# dragonfly_chatbot

Dragonfly technical knowledge tools for **DeepSeek Harness**. Search bundled
Prototype Apps extension manuals, then add authorized local Dragonfly Help and
Python source. Answers can cite versioned evidence IDs and source line locations.

[中文说明](README.zh-CN.md) · [Changelog](CHANGELOG.md) · [Data handling](NOTICE.md)

## Install

Tested with **DeepSeek Harness 0.2.1-rc.2** and Node **22.23.3**. Requires Node
22.19.0 or newer; this release declares an exact Harness compatibility version.
No build step, Python environment, Ollama or Dragonfly shutdown is required.

```sh
dsh plugin --profile web add github:howpy/dragonfly_chatbot#v0.1.0
```

Reload/restart the web profile after installation. In a Desktop-managed profile,
install using the app's plugin manager; the CLI web profile is separate.
This plugin has no custom browser panel.

Ask: **“Use dragonfly_chatbot to find which Prototype Apps tool measures mesh
surface area. Read and cite its manual.”** Or **“查询网格整体测量功能，并引用依据。”**

Includes **162 first-party manual documents from 112 Prototype Apps extensions**
and three original engineering notes. It does not bundle proprietary Dragonfly Help
or installed Python source. Extensions are distinct from stock Dragonfly features.

## Tools

| Tool | Purpose |
| --- | --- |
| `search_dragonfly_knowledge` | BM25, Chinese aliases, exact API/title terms and strict version/kind filters |
| `read_dragonfly_evidence` | Read a result by evidence ID, with bounded text and citation coordinates |
| `get_dragonfly_corpus_status` | Inspect source kinds, versions and counts |

The plugin adds Dragonfly-specific guidance to the normal Harness prompt. It does
not replace the complete prompt or disable unrelated host tools. Retrieval is lexical:
there are no embeddings or reranker. Arbitrary cross-language paraphrases may not
match. No end-to-end LLM answer accuracy is claimed; the selected LLM affects query
formulation, evidence use and final answers. Identical explicit tool queries against
the same corpus return the same evidence independently of the chat model.

## Add local Help or Python source

Clone this repository and install its schema dependency to use the import CLI:

```sh
git clone https://github.com/howpy/dragonfly_chatbot.git
cd dragonfly_chatbot
npm ci --ignore-scripts
node bin/dragonfly-chatbot.mjs --help
```

Use your actual documentation/source paths. These Windows paths are examples:

```powershell
node bin/dragonfly-chatbot.mjs import --root 'D:/DragonflyHelp' --source-id help_2027_1 --version 2027.1 --kind help --out 'D:/DragonflyKnowledge/help.json'
node bin/dragonfly-chatbot.mjs import --root 'D:/Dragonfly/python/OrsPythonPlugins' --source-id python_2027_1 --version 2027.1 --kind source_code --out 'D:/DragonflyKnowledge/source.json'
node bin/dragonfly-chatbot.mjs merge --corpus 'D:/DragonflyKnowledge/help.json' --with 'D:/DragonflyKnowledge/source.json' --out 'D:/DragonflyKnowledge/combined.json'
node bin/dragonfly-chatbot.mjs search --corpus 'D:/DragonflyKnowledge/combined.json' --query 'getAllRepresentableInstances' --version 2027.1
```

Choose narrow documentation/source roots. Imports are capped at 32 MiB of source
text, 10,000 eligible files, 2 MiB per file and 25 directory levels. Oversized files
are reported as skipped. HTML references use **extracted text lines**. Python,
Markdown, plain text and JSON retain source line coordinates.

Set the plugin configuration in Harness, or put this override in the profile's
`cordis.patch.yml`, replacing the example path:

```yaml
- id: dragonfly-chatbot
  config:
    corpusFile: 'D:/DragonflyKnowledge/combined.json'
    includeManuals: true
    maxResults: 8
```

Reload after a corpus update. Use the status tool to confirm loaded sources.
Missing/invalid configured corpora fail loading clearly. Set `includeManuals: false`
to omit extension manuals; the three starter notes remain.

Strict version filters exclude other versions and unspecified-version sources.
Bundled manuals have unspecified versions: search without a filter and check the
text before making compatibility claims.

## Privacy

The plugin makes no network requests. Harness sends questions and retrieved text
to its configured model service. Use a local model if evidence must stay on the
machine. Do not import credentials, customer datasets or settings. See [NOTICE.md](NOTICE.md).

## Remove / update

```sh
dsh plugin --profile web remove dsh-dragonfly-chatbot
```

Install a future release using its explicit tag. Removal preserves imported corpora.

## Development

```sh
npm ci --ignore-scripts
npm run check
npm pack --dry-run
```

`scripts/verify-harness.mjs /path/to/official/runtime/node_modules` exercises the
real Cordis/SystemPrompt/ToolRuntime registry, execution, prompt assembly and unload.
See [verification](docs/verification.md).

This repository is exported from DragonflyPrototypeLabs's
`deepseek_harness_agent/dragonfly_chatbot` subproject. Only this subproject is public.
The manual snapshot script requires the development checkout; users do not need it.
