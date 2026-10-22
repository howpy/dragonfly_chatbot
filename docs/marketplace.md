# dshmarket 发布路线

核查日期：2026-10-21。v0.1.0 已在独立公开仓库发布，验证版本为 Harness
0.2.1-rc.2。市场目录收录将由 howpy 重新提交，尚待新投稿所需的公开目录 fork 授权。

- [公开发布](https://github.com/howpy/dragonfly_chatbot/releases/tag/v0.1.0)
- 投稿条目：`release/marketplace-entry.yml`，以 howpy 身份提交。
- [发布记录](../release/publication-status.md)

## 已确认事实

- [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness)
  采用插件架构，官方 README 提醒开发预览期间可能发生破坏性变更，并建议插件仓库
  添加 `dsh-plugin` topic。
- [dsh-market 的 Submit your plugin 说明](https://github.com/dsh-market/dsh-market#submit-your-plugin)
  表明市场应用和插件目录是分开的：插件收录应向其链接的 `awesome-dsh-plugin`
  registry 提交条目 PR，而不是向市场应用仓库提交插件。
- [dshmarket](https://dshmarket.com/) 提供插件安装与目录索引。

因此，目标实施路线是“开发可安装 Harness 插件 → 发布明确来源的插件版本 →
提交目录收录”，不能把创建本地 Agent 提示词称为已经完成上传。

## 已完成的接入验证

1. 使用官方 npm Harness 0.2.1-rc.2 与 Node 22.23.3 验证。
2. 验证实际工具注册/执行、提示词、配置 schema 与卸载生命周期。
3. 独立公开仓库发布，仅导出本子项目；私有主仓库保持私有。
4. 包名 `dsh-dragonfly-chatbot`，展示名 `dragonfly_chatbot`；通过 GitHub 标签
   和 Release tarball 分发，未发布到 npm。

真实 `package.json` 已包含 `dsh.bundle` 与 `engines.dsh`。安装命令已经从公开
v0.1.0 标签验证，不依赖猜测的 SDK 或开发机器路径。

## 发布前产物

- 可安装的插件入口、经过测试的兼容版本范围和干净安装验证记录。
- 中英文简介、安装 / 配置 / 更新 / 卸载说明及示例问答。
- 来源清单、软件与语料许可、版本信息和评测报告。
- 资料缺失时的引导，明确模型服务会接收问题与必要证据片段。
- 包内容白名单，仅包含代码、配置模板和确认可分发的资料。
- 排除本机 Help、未获再分发授权的源码、用户配置、凭据、缓存与生成索引。

目录要求仓库至少创建满一天。全新公开仓库创建于 2026-10-22 01:42:19 UTC，
因此最早在 2026-10-22 21:42:19（America/Toronto）满足该项要求。
目录的检查脚本说明会自动重新检查年龄门槛；通过检查后仍需维护者决定是否合并。
当前不能把“已发布 GitHub Release”写成“已在 dshmarket 上架”。
