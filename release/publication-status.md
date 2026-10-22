# Publication status

## Project identity

- Owner and publishing account: `howpy`.
- Repository: https://github.com/howpy/dragonfly_chatbot
- Release: https://github.com/howpy/dragonfly_chatbot/releases/tag/v0.1.0
- Package: `dsh-dragonfly-chatbot-0.1.0.tgz`.
- The release includes `SHA256SUMS`; use that file for the current package digest.
- Publication uses GitHub releases and tags. No npm publication is claimed.

The public history, tag and release have been rebuilt from the current project
snapshot using howpy's GitHub noreply identity. The release author and both asset
uploaders are howpy. Package SHA-256:
`3ba933883e135a192ab2039212c626fdeecd7a39d2519afe1c08d6dd3d8e96d0`.
Recovery material is kept locally and is not part of the public repository or package.

## Verification

- 19 automated checks cover source syntax, import boundaries, CLI use, version
  filtering, evidence reads and manual-corpus regressions.
- Official Harness 0.2.1-rc.2 tool dispatch, prompt assembly and unload are verified.
- CI results: https://github.com/howpy/dragonfly_chatbot/actions/workflows/check.yml
- The corpus includes 162 first-party documents from 112 Prototype Apps extensions
  and three original technical notes. Vendor Help and installed source are not bundled.
- A fresh installation from the rebuilt tag matches the cleaned license and source;
  the installed plugin passes the real Harness integration check.
- Current public-page HTML, reachable Git history, release metadata and current
  workflow runs use howpy. Historical workflow runs have been removed.
- GitHub's separate cached contributor API and older public activity events can
  retain historical account metadata beyond the current Git history. A clean
  current page is not a guarantee that every previously public record is erased.

## Marketplace

The submission entry is `release/marketplace-entry.yml`. A new submission from
howpy requires a public fork of the catalog, which is awaiting authorization.
The plugin is not claimed to be listed in the market until the catalog entry is
accepted and the public index contains its repository URL.

## Installation

```sh
dsh plugin --profile web add github:howpy/dragonfly_chatbot#v0.1.0
```

## Answer quality

Identical explicit searches against the same corpus return the same evidence.
Each user's LLM controls query formulation, evidence use and the final answer.
No end-to-end LLM accuracy claim is made for this release.
