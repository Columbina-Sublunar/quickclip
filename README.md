# QuickClip

轻量桌面剪贴板 / 代码片段管理工具，方便 CLI 用户快速复制常用命令、文件路径。

## 技术栈

- **桌面框架**: Tauri 2 (Rust)
- **前端**: React 19 + TypeScript + Vite
- **样式**: Tailwind CSS 3 + shadcn/ui 组件
- **数据库**: SQLite (tauri-plugin-sql)
- **i18n**: 内置中英文切换 (React Context)

## 功能

- 文本 / 文件类型代码块管理
- 支持文件: md, markdown, docx, pdf, png, jpg, jpeg, gif, webp, svg, xlsx, xls, csv, ppt, pptx, doc, txt, zip
- 预览: markdown 渲染, docx 解析 HTML, 图片内嵌预览; 其余类型仅显示文件路径
- 一键复制: 文本复制内容, 文件复制路径
- 分类管理 + 搜索
- 全局快捷键 Ctrl+Alt+C 唤起/隐藏
- 中英文界面切换

## 开发

```bash
pnpm install
pnpm tauri dev
```

## 构建

```bash
pnpm tauri build
```

产物: `src-tauri/target/release/bundle/nsis/QuickClip_0.1.0_x64-setup.exe`

## 数据结构

**categories**: id, name, sort_order, created_at
**snippets**: id, title, type(text|file), content, file_path, file_type, category_id, remark, created_at, updated_at

文件存储: `%APPDATA%/com.quickclip.app/files/`

## 已知约束

- Tauri 2 权限需在 `src-tauri/capabilities/default.json` 中显式声明单项权限, 不可依赖 `:default` 组合权限 (已踩坑: sql, clipboard-manager, global-shortcut)
- 数据库初始化使用迁移检测: 旧版 `file_type CHECK` 约束自动迁移为无约束版本
- 工作目录代理: cargo 操作需通过 3067 端口代理 (`$env:HTTPS_PROXY`)
