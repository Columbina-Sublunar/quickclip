import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useLanguage } from "@/i18n";
import { Upload } from "lucide-react";
import type { Category, Snippet, SnippetCreateInput } from "@/lib/types";

const FILE_FILTERS = [
  {
    name: "All supported files",
    extensions: [
      "md", "markdown", "docx", "pdf",
      "png", "jpg", "jpeg", "gif", "webp", "svg",
      "xlsx", "xls", "csv", "ppt", "pptx", "doc",
      "txt", "zip",
    ],
  },
];

interface SnippetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  initialData?: Snippet;
  onSubmit: (data: SnippetCreateInput) => Promise<void>;
}

export function SnippetForm({
  open,
  onOpenChange,
  categories,
  initialData,
  onSubmit,
}: SnippetFormProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"text" | "file">("text");
  const [content, setContent] = useState("");
  const [filePath, setFilePath] = useState<string>("");
  const [fileType, setFileType] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [remark, setRemark] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title);
        setType(initialData.type);
        setContent(initialData.content);
        setFilePath(initialData.file_path ?? "");
        setFileType(initialData.file_type);
        setCategoryId(initialData.category_id);
        setRemark(initialData.remark);
      } else {
        setTitle("");
        setType("text");
        setContent("");
        setFilePath("");
        setFileType(null);
        setCategoryId(categories[0]?.id ?? "");
        setRemark("");
        setFileName("");
      }
    }
  }, [open, initialData, categories]);

  const handleFileSelect = async () => {
    const selected = await openDialog({
      multiple: false,
      filters: FILE_FILTERS,
    });
    if (!selected) return;

    const path = selected as string;
    const ext = path.split(".").pop()?.toLowerCase() ?? "";

    setFilePath(path);
    setFileType(ext);
    setFileName(path.split("\\").pop() ?? path.split("/").pop() ?? path);

    try {
      if (ext === "md" || ext === "markdown") {
        const text = await readTextFile(path);
        setContent(text);
      } else {
        setContent("");
      }
    } catch (e) {
      setContent(`Error reading file: ${e}`);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !categoryId) return;
    setSubmitting(true);

    try {
      const data: SnippetCreateInput = {
        title: title.trim(),
        type,
        content,
        file_path: filePath || undefined,
        file_type: fileType,
        category_id: categoryId,
        remark: remark.trim() || undefined,
      };

      await onSubmit(data);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? t("snippet.edit_title") : t("snippet.new_title")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="title">{t("snippet.title")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("snippet.title")}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t("snippet.type")}</Label>
            <Select
              value={type}
              onValueChange={(v: "text" | "file") => {
                setType(v);
                if (v === "text") {
                  setFilePath("");
                  setFileType(null);
                  setFileName("");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">{t("snippet.text")}</SelectItem>
                <SelectItem value="file">{t("snippet.file")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "text" ? (
            <div className="grid gap-2">
              <Label htmlFor="content">{t("snippet.content")}</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("snippet.content_placeholder")}
                rows={6}
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>{t("snippet.select_file")}</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleFileSelect} className="w-full justify-start gap-2">
                  <Upload className="h-4 w-4" />
                  {fileName || t("snippet.select_file")}
                </Button>
              </div>
              {fileName && (
                <p className="text-xs text-muted-foreground">{filePath}</p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="category">{t("snippet.category")}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder={t("snippet.select_category")} />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 ? (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    {t("snippet.no_categories")}
                  </div>
                ) : (
                  categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="remark">{t("snippet.remark")}</Label>
            <Input
              id="remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={t("snippet.remark_placeholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("snippet.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !title.trim() || !categoryId}>
            {submitting ? t("snippet.saving") : initialData ? t("snippet.update") : t("snippet.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
