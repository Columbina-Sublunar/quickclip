import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SnippetPreview } from "@/components/SnippetPreview";
import { useLanguage } from "@/i18n";
import {
  Copy,
  FileText,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileType,
  Edit3,
  Trash2,
  Check,
  FileDown,
  Pin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Snippet } from "@/lib/types";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const SPREADSHEET_EXTS = new Set(["xlsx", "xls", "csv"]);
const PRESENTATION_EXTS = new Set(["ppt", "pptx"]);
const DOC_EXTS = new Set(["doc", "docx"]);
const CODE_EXTS = new Set(["md", "markdown"]);

function getFileIcon(fileType: string | null) {
  const ft = fileType?.toLowerCase() ?? "";
  if (IMAGE_EXTS.has(ft)) return { icon: FileImage, color: "text-pink-500" };
  if (SPREADSHEET_EXTS.has(ft)) return { icon: FileSpreadsheet, color: "text-green-500" };
  if (PRESENTATION_EXTS.has(ft)) return { icon: FileType, color: "text-orange-500" };
  if (DOC_EXTS.has(ft)) return { icon: FileText, color: "text-blue-500" };
  if (CODE_EXTS.has(ft)) return { icon: FileCode, color: "text-amber-500" };
  if (ft === "pdf") return { icon: FileText, color: "text-red-500" };
  return { icon: FileDown, color: "text-muted-foreground" };
}

interface SnippetCardProps {
  snippet: Snippet;
  onCopy: (snippet: Snippet) => Promise<void>;
  onEdit: (snippet: Snippet) => void;
  onDelete: (id: string) => void;
  onTogglePin?: (id: string) => void;
}

export function SnippetCard({ snippet, onCopy, onEdit, onDelete, onTogglePin }: SnippetCardProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const { icon: Icon, color } = getFileIcon(snippet.file_type);

  const handleCopy = async () => {
    await onCopy(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="group">
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 shrink-0">
            {snippet.type === "file" ? (
              <Icon className={`h-4 w-4 ${color}`} />
            ) : (
              <FileDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {snippet.title}
            </CardTitle>
            {snippet.remark && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {snippet.remark}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onTogglePin?.(snippet.id)}
            title={snippet.is_pinned ? t("snippet.unpin") : t("snippet.pin")}
          >
            <Pin className={cn("h-3.5 w-3.5", snippet.is_pinned && "fill-foreground")} />
          </Button>
          <Button
            variant={copied ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
            title={t("snippet.copy")}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(snippet)}
            title={t("snippet.edit")}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-destructive"
            onClick={() => onDelete(snippet.id)}
            title={t("snippet.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <PreviewContent snippet={snippet} />
      </CardContent>
    </Card>
  );
}

function PreviewContent({ snippet }: { snippet: Snippet }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const hasContent = snippet.content.length > 0;

  if (!hasContent && snippet.type === "file") {
    return (
      <p className="text-xs text-muted-foreground italic">
        {t("snippet.stored_locally")}
      </p>
    );
  }

  if (!hasContent) {
    return (
      <p className="text-xs text-muted-foreground italic">
        {t("snippet.empty")}
      </p>
    );
  }

  const isLong = snippet.content.length > 200;

  return (
    <div>
      <div className={cn(!expanded && isLong && "max-h-20 overflow-hidden relative")}>
        <SnippetPreview snippet={snippet} />
        {!expanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary mt-1 hover:underline"
        >
          {expanded ? t("snippet.show_less") : t("snippet.show_more")}
        </button>
      )}
    </div>
  );
}
