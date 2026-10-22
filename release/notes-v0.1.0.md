dragonfly_chatbot 0.1.0 adds local Dragonfly technical knowledge tools to DeepSeek Harness.

- Three read-only tools for search, evidence reading and source status.
- 162 first-party manual documents covering 112 Prototype Apps extensions.
- BM25 search, Chinese term aliases, strict software-version filters and source citations.
- Local Help / Python source import and corpus merge CLI.
- Tested with Harness 0.2.1-rc.2 and Node 22.23.3 (Node ≥22.19.0 required).

Install:

```sh
dsh plugin --profile web add github:howpy/dragonfly_chatbot#v0.1.0
```

The plugin needs no install-time build. Official Dragonfly Help and installed
Python source are not distributed. Import your authorized local material as
described in the README. Evidence is sent to the model configured in Harness;
the plugin itself makes no network requests.

This initial release uses lexical retrieval, with no embeddings, reranker or
end-to-end LLM accuracy claim. Final answers depend on the user's selected model.
