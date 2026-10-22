# dragonfly_chatbot

面向 DeepSeek Harness 的 Dragonfly 技术问答插件。支持本地资料检索、证据读取和
版本筛选，附带 **112 个 Prototype Apps 扩展的 162 份手册**及三份工程说明。
官方 Help 和安装目录 Python 源码由用户在本机显式导入，不随市场包分发。

## 安装

验证环境：DeepSeek Harness **0.2.1-rc.2**、Node **22.23.3**。
要求 Node ≥22.19.0；此版本的 Harness 兼容范围固定为 0.2.1-rc.2。

```sh
dsh plugin --profile web add github:howpy/dragonfly_chatbot#v0.1.0
```

安装后重新加载或启动对应 profile。桌面版请使用其自带插件管理界面安装。
插件没有独立浏览器面板，不需要关闭 Dragonfly 或安装 Ollama。

提问示例：

- 使用 dragonfly_chatbot，查询哪个扩展能计算网格表面积，读取并引用手册。
- 查询 LocateAnything 的安装环境要求。
- 导入本机源码后，查询 2027.1 中 getAllRepresentableInstances 的用法。

## 能力与边界

提供 `search_dragonfly_knowledge`、`read_dragonfly_evidence` 和
`get_dragonfly_corpus_status` 三个只读工具。先检索，按 ID 读取证据，再由
Harness 的模型回答。返回来源、版本、原文和行号。

采用 BM25、中文术语补充与精确 API / 标题词加权；尚未实现向量检索或重排，
不保证任意中英文改写都能命中。最终回答质量取决于用户选用的 LLM；相同工具查询
和资料会返回相同证据，但模型如何查询、查证和组织答案仍会影响质量。

内置资料描述 Prototype Apps 扩展，不等于 Dragonfly 自带功能。
版本严格匹配；未标版本手册不会作为特定版本证据返回。

## 导入本机资料

具体导入、合并、搜索和配置命令见 [操作说明](README.md#add-local-help-or-python-source)。
支持 Help 的 HTML / Markdown / 文本与 Python 源文件。导入器跳过隐藏目录、
符号链接、常见运行目录及配置/凭据文件名；导入前仍需确认目录没有敏感内容。
每次导入最多 32 MiB，单文件最多 2 MiB，超大文件会列为跳过。

在插件配置中填写 `corpusFile` 的本机绝对路径；更新资料后重新加载插件，
用状态工具确认实际来源。HTML 的行号指提取文本行号。

插件本身不联网，但 Harness 的模型服务会接收问题与选中的证据片段。
本地资料库不等于本地推理。详见 [资料与隐私说明](NOTICE.md)。

## 卸载

```sh
dsh plugin --profile web remove dsh-dragonfly-chatbot
```

用户生成的本地资料文件会保留。
