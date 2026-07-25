# QuickClip — AI Agent Guide

## Build & Run

```bash
pnpm install
pnpm tauri dev           # 开发模式
pnpm tauri build         # 打包 release
```

Windows 产物: `src-tauri/target/release/bundle/nsis/QuickClip_0.2.0_x64-setup.exe`

## Project Structure

```
src/
  App.tsx                  # 主布局 + 状态管理
  main.tsx                 # 入口 (挂载 ThemeProvider + LanguageProvider)
  index.css                # Tailwind + CSS 变量
  lib/
    db.ts                  # SQLite CRUD + schema + upsert/import helpers
    types.ts               # 类型定义 (Category, Snippet with is_pinned)
    id.ts                  # UUID 生成 (fallback)
  i18n/
    index.tsx              # LanguageProvider + useLanguage hook
    en.ts                  # 英文字典
    zh.ts                  # 中文字典
  hooks/
    use-toast.ts           # Toast 通知系统
  components/
    ui/                    # shadcn/ui 基础组件
    ThemeProvider.tsx       # 主题上下文 (light/dark 持久化)
    CategorySidebar.tsx     # 左侧分类栏 (含置顶按钮)
    SettingsDialog.tsx      # 设置面板 (语言/开机自启/备份导入)
    SnippetCard.tsx         # 代码块卡片 (图标/预览/操作/置顶按钮)
    SnippetForm.tsx         # 新建/编辑表单弹窗
    SnippetPreview.tsx      # 内容预览 (markdown/docx/image)
    Toaster.tsx             # Toast 渲染器
src-tauri/
  src/lib.rs               # Rust 命令: copy_file_to_storage, export_backup, read_backup_json
  capabilities/default.json # 权限声明 (含 autostart)
  tauri.conf.json          # 窗口/打包配置
```

## Key Patterns

### 数据库
- 首次加载时自动创建表, 含旧版 schema 迁移 (file_type CHECK → 无约束; 动态添加 is_pinned 列)
- `getDb()` 返回单例, 用 `try-catch` 包裹: 失败时重置 `db = null` 以便重试
- 所有 CRUD 操作在 App.tsx 中用 try-catch + toast 错误提示包裹
- 新增 `upsertCategory`/`upsertSnippet` (INSERT...ON CONFLICT DO UPDATE) 用于导入
- 新增 `listAllCategoriesAndSnippets` 用于备份导出

### 权限 (能力)
Tauri 2 的 `:default` 组合权限不可靠, 必须列出单个 allow 权限:

```json
"permissions": [
  "sql:allow-execute",
  "clipboard-manager:allow-write-text",
  "global-shortcut:allow-register",
  "autostart:allow-enable",
  ...
]
```

### i18n
- 使用 `useLanguage()` hook 获取 `t()` 和 `toggleLanguage()`
- 语言选择持久化到 localStorage
- `en.ts` / `zh.ts` 键名用点号分隔, 如 `"toast.snippet_created"`
- 所有用户可见字符串必须通过 `t('key')` 引用

### 主题 (Theme)
- `ThemeProvider` 包裹应用, 使用 `useTheme()` 获取 `theme`, `toggleTheme`
- 主题持久化到 `localStorage`, 通过 `document.documentElement.classList.toggle("dark")` 生效
- 深色模式 CSS 变量在 `index.css` 的 `.dark` 中定义

### 全局快捷键
- `Alt+Control+C` 在 `useEffect` 中注册
- 切换窗口可见性: `win.isVisible() ? win.hide() : (win.show() + win.setFocus())`

### 文件处理
- 文件上传时先复制到 `%APPDATA%/com.quickclip.app/files/` 再存路径
- Rust 命令 `copy_file_to_storage` 负责复制, 返回目标路径
- markdown 文件: 读取文本内容存入 DB 用于预览
- 图片: 使用 `convertFileSrc()` 转 asset URL 后 `<img>` 渲染
- docx: 使用 `mammoth.convertToHtml()` 解析

### 备份 / 导入
- 导出: 选择文件夹 → 调用 `export_backup` Rust 命令 (写 data.json + 复制文件至 files/ 子目录)
- 导入: 选择备份文件夹 → `read_backup_json` 读取 → 预览 → 覆盖或合并模式
- 备份 JSON 含 `version`, `categories`, `snippets` (带 `backupFile` 相对路径)

### 自动迁移
- `initSchema` 通过 `PRAGMA table_info` 检测旧表, 用 `ALTER TABLE ADD COLUMN` 添加缺失列
- 兼容 v0.1.0 的 `file_type CHECK` 约束迁移 + `is_pinned` 列自动添加
- 应用数据目录 `com.quickclip.app` 保持不变, 文件附件不丢失

## Proxies
- 开发环境通过 `http://127.0.0.1:3067` 代理访问 Rust 依赖 (rustup / cargo)
