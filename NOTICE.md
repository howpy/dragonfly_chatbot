# Sources and data handling

dragonfly_chatbot is an independent project. Dragonfly product names and third-party
library names remain their owners' trademarks; inclusion is not vendor endorsement.

The implementation and newly authored project notes are MIT licensed. The bundled
Prototype Apps manuals are first-party DragonflyPrototypeLabs documentation, copied
under that project's existing manual-bundling policy. `knowledge/provenance.json`
records each original relative path and SHA-256. These manuals describe extensions;
their descriptions of third-party dependencies do not relicense those dependencies.

Dragonfly's proprietary Help and installed Python source are not bundled. Being able
to read a local Python file does not establish an open-source license. Import and
redistribute only material you are authorized to use. Local imports do not change
the source's license and are never uploaded by this plugin.

The plugin makes no network requests or telemetry calls. It passes search results
and selected evidence to Harness, whose configured model service may receive them.
It does not alter other Harness tools, permissions or network behavior. A local
corpus is not a promise of local model inference or host-wide isolation.

The importer excludes hidden paths, symbolic links, common runtime/data folders and
configuration/credential filenames. This is not content-based secret detection:
choose a documentation/source root and review it before import. Never import a
home directory, application settings folder, or customer data collection wholesale.

Line references for HTML imports refer to extracted text, not original HTML source.
Bundled manuals have an unspecified Dragonfly version unless their text states
otherwise; that text must be checked before making a compatibility claim.
