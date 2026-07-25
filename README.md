# QuickClip

[English Version](README.en.md)

轻量桌面剪贴板 / 代码片段管理工具，方便 CLI 用户快速复制常用命令、文件路径。

## 下载

- 最新版本: [v0.2.0](https://github.com/Columbina-Sublunar/quickclip/releases/tag/v0.2.0)
- Windows 安装包: [QuickClip_0.2.0_x64-setup.exe](https://github.com/Columbina-Sublunar/quickclip/releases/download/v0.2.0/QuickClip_0.2.0_x64-setup.exe)

## 技术栈

- **桌面框架**: Tauri 2 (Rust)
- **前端**: React 19 + TypeScript + Vite
- **样式**: Tailwind CSS 3 + shadcn/ui 组件
- **数据库**: SQLite (tauri-plugin-sql)
- **i18n**: 内置中英文切换 (React Context)
- **主题**: 深色/浅色模式切换 (CSS variable + Tailwind)

## 功能

- 文本 / 文件类型代码块管理
- 支持文件: md, markdown, docx, pdf, png, jpg, jpeg, gif, webp, svg, xlsx, xls, csv, ppt, pptx, doc, txt, zip
- 预览: markdown 渲染, docx 解析 HTML, 图片内嵌预览; 其余类型仅显示文件路径
- 一键复制: 文本复制内容, 文件复制路径
- 分类管理 + 搜索
- 全局快捷键 Ctrl+Alt+C 唤起/隐藏
- ✅ 中英文界面切换（移至设置面板）
- ✅ 深色/浅色模式切换（主界面按钮）
- ✅ 设置面板（语言切换 / 开机自启 / 备份导入）
- ✅ 分类与代码块置顶
- ✅ 文件夹级备份与恢复（支持覆盖/合并导入）
- ✅ 数据库自动迁移，兼容 v0.1.0 老版本数据

## 开发

```bash
pnpm install
pnpm tauri dev
```

## 构建

```bash
pnpm tauri build
```

产物: `src-tauri/target/release/bundle/nsis/QuickClip_0.2.0_x64-setup.exe`

## 数据结构

**categories**: id, name, sort_order, is_pinned, created_at
**snippets**: id, title, type(text|file), content, file_path, file_type, category_id, remark, is_pinned, created_at, updated_at

文件存储: `%APPDATA%/com.quickclip.app/files/`

## 已知约束

- Tauri 2 权限需在 `src-tauri/capabilities/default.json` 中显式声明单项权限, 不可依赖 `:default` 组合权限 (已踩坑: sql, clipboard-manager, global-shortcut)
- 数据库初始化使用迁移检测: 旧版 `file_type CHECK` 约束自动迁移为无约束版本, `is_pinned` 列自动添加
- 开发环境 cargo 操作需通过 3067 端口代理
