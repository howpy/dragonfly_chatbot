# dragonfly_chatbot

面向 **Dragonfly 3D World 内置功能**的独立 DeepSeek Harness 技术支持 agent，
不代表软件厂商。安装方式与完整参数见 [English README](README.md)。

```sh
dsh plugin add github:howpy/dragonfly_chatbot#v0.2.0
```

插件首次启用时检查电脑上的 Dragonfly 安装位置，包括 Windows 卸载注册表、
常见安装目录、盘符根目录下的产品文件夹和 PATH。可通过 `dragonflyPath`
指定安装目录或主程序，或设置 DRAGONFLY_ROOT / DRAGONFLY_HOME。
不会启动 Dragonfly，也不会递归扫描整个磁盘。安装软件或修改路径后请重新加载插件。

未找到 Dragonfly 时自动进入**仅帮助文档模式**，首次回答及工具结果都会明确提示。
仍可查询内置的 2027.1（525 页）英文帮助文档，支持中英文检索。
找到安装时，根据具体版本查询帮助；实现细节可通过专用工具只读搜索本机官方 Python 文件。
多个版本分开处理，缺少对应版本资料时不会静默改用其他版本。

本仓库和安装包不包含 Dragonfly 实现源码、二进制文件或用户扩展，仅分发 agent 自身代码
与提取的帮助文字。源码在用户电脑原安装位置按需读取，不建立持久化源码库、不执行源码。
搜索受文件数和字节数预算约束，达到限制会提示；无法查看编译实现。
工具返回的证据会进入 Harness 配置的模型上下文，可能发送给该模型的服务商。
最终回答质量仍受模型能力及引用证据的方式影响。

可用工具：帮助检索、本机源码检索、按证据 ID 读取、安装环境与资料状态。
运行 `dragonfly-chatbot doctor` 可直接查看检测结果。
配置项为 `dragonflyPath`、`helpCorpusFile`（只接受 2027.1 帮助资料）和 `maxResults`（默认 8）。
软件原版权声明保留在帮助资料中；agent 自身采用 MIT 许可，详见 [NOTICE.md](NOTICE.md)。
