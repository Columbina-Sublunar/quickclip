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
import { Toaster } from "@/components/Toaster";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";
import * as db from "@/lib/db";
import { generateId } from "@/lib/id";
import type { Category, Snippet, SnippetCreateInput } from "@/lib/types";
import { Search, Plus, AppWindow, FileDown, Globe } from "lucide-react";

function App() {
  const { t, toggleLanguage } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editSnippet, setEditSnippet] = useState<Snippet | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
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

  const filteredCategories = categories.filter((c) => {
    if (!searchQuery) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <div className="w-56 border-r flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-3 h-12 border-b shrink-0">
          <FileDown className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">{t("app.title")}</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <CategorySidebar
            categories={filteredCategories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleSelectCategory}
            onAddCategory={handleAddCategory}
            onRenameCategory={handleRenameCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        </div>
        <div className="border-t p-2">
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            {t("language.switch_to")}
          </button>
        </div>
      </div>

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
          <Button size="sm" className="gap-1.5 ml-2 shrink-0" onClick={openCreateForm}>
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

      <Toaster />
    </div>
  );
}

export default App;
