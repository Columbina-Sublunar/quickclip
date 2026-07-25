# QuickClip

[中文版](README.md)

A lightweight desktop clipboard / snippet manager for CLI users to quickly copy frequently used commands and file paths.

## Download

- Latest Release: [v0.2.0](https://github.com/Columbina-Sublunar/quickclip/releases/tag/v0.2.0)
- Windows Installer: [QuickClip_0.2.0_x64-setup.exe](https://github.com/Columbina-Sublunar/quickclip/releases/download/v0.2.0/QuickClip_0.2.0_x64-setup.exe)

## Tech Stack

- **Desktop Framework**: Tauri 2 (Rust)
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 3 + shadcn/ui components
- **Database**: SQLite (tauri-plugin-sql)
- **i18n**: Built-in Chinese / English switching (React Context)
- **Theme**: Light / Dark mode toggle (CSS variable + Tailwind)

## Features

- Manage text and file-based snippets
- Supported file types: md, markdown, docx, pdf, png, jpg, jpeg, gif, webp, svg, xlsx, xls, csv, ppt, pptx, doc, txt, zip
- Preview: Markdown rendering, DOCX parsed to HTML, images embedded inline; other types display file path only
- One-click copy: copy text content or file path
- Category management + search
- Global shortcut Ctrl+Alt+C to show/hide the window
- ✅ Chinese / English UI switching (moved to settings panel)
- ✅ Light / Dark mode toggle on main toolbar
- ✅ Settings panel (language / autostart / backup import)
- ✅ Pin / unpin categories and snippets
- ✅ Folder-based backup & restore (replace or merge import)
- ✅ Auto-migration compatible with v0.1.0 data

## Development

```bash
pnpm install
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

Output: `src-tauri/target/release/bundle/nsis/QuickClip_0.2.0_x64-setup.exe`

## Data Structure

**categories**: id, name, sort_order, is_pinned, created_at
**snippets**: id, title, type(text|file), content, file_path, file_type, category_id, remark, is_pinned, created_at, updated_at

File storage: `%APPDATA%/com.quickclip.app/files/`

## Known Constraints

- Tauri 2 permissions must be declared as individual allow entries in `src-tauri/capabilities/default.json`; do not rely on the `:default` composite permission (learned the hard way with sql, clipboard-manager, and global-shortcut).
- Database initialization uses migration detection: legacy `file_type CHECK` constraints are automatically migrated to the unconstrained version; `is_pinned` columns are added automatically for old databases.
- Cargo operations in development require a proxy on port 3067.
