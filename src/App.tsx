import { useState, useEffect, useCallback, useRef } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  isRegistered,
  register,
  unregister,
  type ShortcutEvent,
} from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CategorySidebar } from "@/components/CategorySidebar";
import { SnippetCard } from "@/components/SnippetCard";
import { SnippetForm } from "@/components/SnippetForm";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Toaster } from "@/components/Toaster";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";
import { useTheme } from "@/components/ThemeProvider";
import * as db from "@/lib/db";
import { generateId } from "@/lib/id";
import type { Category, Snippet, SnippetCreateInput } from "@/lib/types";
import {
  Search,
  Plus,
  AppWindow,
  FileDown,
  Settings,
  Sun,
  Moon,
} from "lucide-react";

function App() {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editSnippet, setEditSnippet] = useState<Snippet | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState<false | "replace" | "merge">(false);
  const [importing, setImporting] = useState(false);
  const initialized = useRef(false);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await db.listCategories();
      setCategories(cats);
    } catch (e) {
      console.error("Failed to load categories:", e);
      toast({ title: t("toast.failed_load_categories"), description: String(e), variant: "destructive" });
    }
  }, [t]);

  const loadSnippets = useCallback(async () => {
    try {
      if (searchQuery.trim()) {
        const result = await db.searchSnippets(searchQuery.trim());
        setSnippets(result);
      } else if (selectedCategoryId) {
        const result = await db.listSnippets(selectedCategoryId);
        setSnippets(result);
      } else {
        const result = await db.listSnippets();
        setSnippets(result);
      }
    } catch (e) {
      console.error("Failed to load snippets:", e);
      toast({ title: t("toast.failed_load_snippets"), description: String(e), variant: "destructive" });
    }
  }, [searchQuery, selectedCategoryId, t]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadCategories().then(() => loadSnippets());
    }
  }, [loadCategories, loadSnippets]);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  useEffect(() => {
    const setupShortcut = async () => {
      try {
        const shortcut = "Alt+Control+C";
        const registered = await isRegistered(shortcut);
        if (!registered) {
          await register(shortcut, (event: ShortcutEvent) => {
            if (event.state === "Pressed") {
              const win = getCurrentWindow();
              win.isVisible().then((visible) => {
                if (visible) {
                  win.hide();
                } else {
                  win.show();
                  win.setFocus();
                }
              });
            }
          });
        }
      } catch (e) {
        console.error("Failed to register shortcut:", e);
      }
    };
    setupShortcut();

    return () => {
      try {
        unregister("Alt+Control+C");
      } catch {}
    };
  }, []);

  const handleAddCategory = async (name: string) => {
    try {
      const cats = await db.listCategories();
      const newCat: Category = {
        id: generateId(),
        name,
        sort_order: cats.length,
        is_pinned: 0,
        created_at: Date.now(),
      };
      await db.createCategory(newCat);
      await loadCategories();
      toast({ title: t("toast.category_created"), variant: "success" });
    } catch (e) {
      console.error("Failed to create category:", e);
      toast({ title: t("toast.failed_create_category"), description: String(e), variant: "destructive" });
    }
  };

  const handleRenameCategory = async (id: string, name: string) => {
    try {
      await db.updateCategory(id, { name });
      await loadCategories();
    } catch (e) {
      console.error("Failed to rename category:", e);
      toast({ title: t("toast.failed_rename_category"), description: String(e), variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await db.deleteCategory(id);
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
      }
      await loadCategories();
      await loadSnippets();
      toast({ title: t("toast.category_deleted") });
    } catch (e) {
      console.error("Failed to delete category:", e);
      toast({ title: t("toast.failed_delete_category"), description: String(e), variant: "destructive" });
    }
  };

  const handleSelectCategory = (id: string | null) => {
    setSelectedCategoryId(id);
    setSearchQuery("");
  };

  const handleToggleCategoryPin = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    try {
      await db.updateCategory(id, { is_pinned: cat.is_pinned ? 0 : 1 });
      await loadCategories();
      toast({ title: cat.is_pinned ? t("toast.unpinned") : t("toast.pinned") });
    } catch (e) {
      console.error("Failed to toggle category pin:", e);
    }
  };

  const handleToggleSnippetPin = async (id: string) => {
    const snip = snippets.find((s) => s.id === id);
    if (!snip) return;
    try {
      await db.updateSnippet(id, { is_pinned: snip.is_pinned ? 0 : 1 });
      await loadSnippets();
      toast({ title: snip.is_pinned ? t("toast.unpinned") : t("toast.pinned") });
    } catch (e) {
      console.error("Failed to toggle snippet pin:", e);
    }
  };

  const handleCreateSnippet = async (data: SnippetCreateInput) => {
    try {
      if (data.type === "file" && data.file_path) {
        const destPath = await invoke<string>("copy_file_to_storage", {
          sourcePath: data.file_path,
        });
        data.file_path = destPath;
      }
      await db.createSnippet(data);
      await loadSnippets();
      toast({ title: t("toast.snippet_created"), variant: "success" });
    } catch (e) {
      console.error("Failed to create snippet:", e);
      toast({ title: t("toast.failed_create_snippet"), description: String(e), variant: "destructive" });
    }
  };

  const handleUpdateSnippet = async (data: SnippetCreateInput) => {
    if (!editSnippet) return;
    try {
      if (data.type === "file" && data.file_path && data.file_path !== editSnippet.file_path) {
        const destPath = await invoke<string>("copy_file_to_storage", {
          sourcePath: data.file_path,
        });
        data.file_path = destPath;
      }
      await db.updateSnippet(editSnippet.id, data);
      await loadSnippets();
      toast({ title: t("toast.snippet_updated"), variant: "success" });
    } catch (e) {
      console.error("Failed to update snippet:", e);
      toast({ title: t("toast.failed_update_snippet"), description: String(e), variant: "destructive" });
    }
  };

  const handleCopy = async (snippet: Snippet) => {
    try {
      if (snippet.type === "file" && snippet.file_path) {
        await writeText(snippet.file_path);
        toast({ title: t("toast.copy_path"), description: snippet.file_path });
      } else {
        await writeText(snippet.content);
        toast({ title: t("toast.copy_content") });
      }
    } catch (e) {
      toast({ title: t("toast.copy_failed"), description: String(e), variant: "destructive" });
    }
  };

  const handleEdit = (snippet: Snippet) => {
    setEditSnippet(snippet);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await db.deleteSnippet(deleteConfirm);
      await loadSnippets();
      setDeleteConfirm(null);
      toast({ title: t("toast.snippet_deleted") });
    } catch (e) {
      console.error("Failed to delete snippet:", e);
      toast({ title: t("toast.failed_delete_snippet"), description: String(e), variant: "destructive" });
    }
  };

  const openCreateForm = () => {
    setEditSnippet(undefined);
    setFormOpen(true);
  };

  // --- Backup export ---
  const handleExport = async () => {
    try {
      const dir = await open({ directory: true });
      if (!dir) return;

      const { categories: cats, snippets: snips } = await db.listAllCategoriesAndSnippets();
      const files: Array<[string, string]> = [];
      const exportSnippets = snips.map((s) => {
        if (s.type === "file" && s.file_path) {
          const filename = s.file_path.split("\\").pop()?.split("/").pop() ?? "file";
          const destName = `${s.id}_${filename}`;
          files.push([s.file_path, destName]);
          return { ...s, backupFile: `files/${destName}` };
        }
        return { ...s, backupFile: null };
      });

      const data = {
        version: "0.2.0",
        exportedAt: Date.now(),
        categories: cats,
        snippets: exportSnippets,
      };

      await invoke("export_backup", { path: dir, data: JSON.stringify(data), files });
      toast({ title: t("toast.backup_exported") });
    } catch (e) {
      console.error("Export failed:", e);
      toast({ title: t("toast.failed_export"), description: String(e), variant: "destructive" });
    }
  };

  // --- Backup import ---
  const handleImport = (mode: "replace" | "merge") => {
    setImportDialogOpen(mode);
  };

  const confirmImport = async () => {
    const mode = importDialogOpen;
    if (!mode) return;
    setImporting(true);
    try {
      const dir = await open({ directory: true });
      if (!dir) {
        setImportDialogOpen(false);
        return;
      }

      const jsonStr = await invoke<string>("read_backup_json", { path: dir });
      const data = JSON.parse(jsonStr);
      if (!data.categories || !data.snippets) {
        throw new Error(t("toast.invalid_backup"));
      }

      if (mode === "replace") {
        await db.deleteAllCategories();
      }

      for (const cat of data.categories) {
        await db.upsertCategory(cat);
      }

      for (const s of data.snippets) {
        if (s.backupFile && s.type === "file") {
          const sourcePath = `${dir}\\${s.backupFile}`;
          const destPath = await invoke<string>("copy_file_to_storage", { sourcePath });
          s.file_path = destPath;
        }
        const snippet: Snippet = {
          id: s.id,
          title: s.title,
          type: s.type,
          content: s.content ?? "",
          file_path: s.file_path ?? null,
          file_type: s.file_type ?? null,
          category_id: s.category_id,
          remark: s.remark ?? "",
          is_pinned: s.is_pinned ?? 0,
          created_at: s.created_at,
          updated_at: s.updated_at,
        };
        await db.upsertSnippet(snippet);
      }

      await loadCategories();
      await loadSnippets();
      toast({ title: mode === "replace" ? t("toast.backup_imported") : t("toast.backup_imported_merge") });
    } catch (e) {
      console.error("Import failed:", e);
      toast({ title: t("toast.failed_import"), description: String(e), variant: "destructive" });
    } finally {
      setImporting(false);
      setImportDialogOpen(false);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (!searchQuery) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-56 border-r flex flex-col shrink-0">
        <div className="flex items-center justify-between px-3 h-12 border-b shrink-0">
          <div className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">{t("app.title")}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSettingsOpen(true)}
            title={t("settings.title")}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <CategorySidebar
            categories={filteredCategories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleSelectCategory}
            onAddCategory={handleAddCategory}
            onRenameCategory={handleRenameCategory}
            onDeleteCategory={handleDeleteCategory}
            onTogglePin={handleToggleCategoryPin}
          />
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-4 h-12 border-b shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder={t("search.placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <AppWindow className="h-3.5 w-3.5" />
            <span>{t("shortcut.hint")}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto"
            onClick={toggleTheme}
            title={t("theme.toggle")}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={openCreateForm}>
            <Plus className="h-4 w-4" />
            {t("snippet.new")}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {snippets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <FileDown className="h-12 w-12 opacity-30" />
              <p className="text-sm">
                {searchQuery ? t("empty.no_match") : t("empty.no_snippets")}
              </p>
              <Button variant="outline" size="sm" onClick={openCreateForm}>
                <Plus className="h-4 w-4 mr-1" />
                {t("empty.create_first")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 auto-rows-min">
              {snippets.map((snippet) => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  onCopy={handleCopy}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onTogglePin={handleToggleSnippetPin}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <SnippetForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditSnippet(undefined);
        }}
        categories={categories}
        initialData={editSnippet}
        onSubmit={editSnippet ? handleUpdateSnippet : handleCreateSnippet}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onExport={handleExport}
        onImport={handleImport}
      />

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
            <DialogDescription>
              {t("delete.confirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              {t("snippet.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t("snippet.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!importDialogOpen}
        onOpenChange={(open) => { if (!open) setImportDialogOpen(false); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {importDialogOpen === "replace" ? t("import.replace") : t("import.merge")}
            </DialogTitle>
            <DialogDescription>
              {importDialogOpen === "replace"
                ? t("import.confirm_replace")
                : t("import.confirm_merge")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              {t("snippet.cancel")}
            </Button>
            <Button onClick={confirmImport} disabled={importing}>
              {importDialogOpen === "replace" ? t("import.replace") : t("import.merge")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

export default App;
