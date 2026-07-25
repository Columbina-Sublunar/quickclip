import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n";
import { Plus, Pencil, Trash2, FolderIcon, ListTodo, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

interface CategorySidebarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onAddCategory: (name: string) => Promise<void>;
  onRenameCategory: (id: string, name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onTogglePin?: (id: string) => void;
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onTogglePin,
}: CategorySidebarProps) {
  const { t } = useLanguage();
  const [newName, setNewName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameName, setRenameName] = useState("");

  const handleAdd = async () => {
    if (newName.trim()) {
      await onAddCategory(newName.trim());
      setNewName("");
      setAddOpen(false);
    }
  };

  const openRename = (id: string, name: string) => {
    setRenameTarget({ id, name });
    setRenameName(name);
  };

  const handleRename = async () => {
    if (renameTarget && renameName.trim()) {
      await onRenameCategory(renameTarget.id, renameName.trim());
      setRenameTarget(null);
    }
  };

  return (
    <div className="flex h-full flex-col gap-1 p-2">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("sidebar.categories")}
        </span>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto">
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            selectedCategoryId === null
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <ListTodo className="h-4 w-4" />
          <span>{t("sidebar.all")}</span>
        </button>

        {categories.map((cat) => (
          <div key={cat.id} className="group relative">
            <button
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                selectedCategoryId === cat.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <FolderIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{cat.name}</span>
            </button>

            <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-background/80 backdrop-blur-sm rounded-md px-0.5">
              <button
                onClick={() => onTogglePin?.(cat.id)}
                className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent"
                title={cat.is_pinned ? t("category.unpin") : t("category.pin")}
              >
                <Pin className={cn("h-3 w-3", cat.is_pinned && "fill-foreground")} />
              </button>
              <button
                onClick={() => openRename(cat.id, cat.name)}
                className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDeleteCategory(cat.id)}
                className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="mt-2 w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            {t("sidebar.new_category")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sidebar.new_category")}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("sidebar.category_name")}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <Button onClick={handleAdd} size="sm">{t("sidebar.add")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sidebar.rename_category")}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder={t("sidebar.category_name")}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
              }}
            />
            <Button onClick={handleRename} size="sm">{t("sidebar.save")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
