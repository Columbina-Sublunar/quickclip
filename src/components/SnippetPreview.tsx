import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as mammoth from "mammoth";
import { readFile as readBinaryFile } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useLanguage } from "@/i18n";
import type { Snippet } from "@/lib/types";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

interface SnippetPreviewProps {
  snippet: Snippet;
  className?: string;
}

export function SnippetPreview({ snippet, className }: SnippetPreviewProps) {
  if (snippet.type === "text") {
    return (
      <pre className={`text-sm whitespace-pre-wrap break-all font-mono ${className ?? ""}`}>
        {snippet.content}
      </pre>
    );
  }

  if (snippet.type === "file" && snippet.file_type) {
    const ft = snippet.file_type.toLowerCase();

    if (ft === "markdown" || ft === "md") {
      return (
        <div className={`prose prose-sm dark:prose-invert max-w-none ${className ?? ""}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {snippet.content}
          </ReactMarkdown>
        </div>
      );
    }

    if (ft === "docx") {
      return <DocxPreview filePath={snippet.file_path} className={className} />;
    }

    if (IMAGE_EXTS.has(ft)) {
      return <ImagePreview filePath={snippet.file_path} className={className} />;
    }
  }

  return null;
}

function ImagePreview({ filePath, className }: { filePath: string | null; className?: string }) {
  if (!filePath) return null;
  return (
    <div className={`max-w-full overflow-hidden rounded ${className ?? ""}`}>
      <img
        src={convertFileSrc(filePath)}
        alt="Preview"
        className="max-h-64 w-auto object-contain"
        onError={() => {}}
      />
    </div>
  );
}

function DocxPreview({ filePath, className }: { filePath: string | null; className?: string }) {
  const { t } = useLanguage();
  const [html, setHtml] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!filePath) {
      setError(true);
      return;
    }
    readBinaryFile(filePath)
      .then((data) => mammoth.convertToHtml({ arrayBuffer: data.buffer as ArrayBuffer }))
      .then((result) => setHtml(result.value))
      .catch(() => setError(true));
  }, [filePath]);

  if (error) {
    return (
      <div className={`text-sm text-muted-foreground ${className ?? ""}`}>
        {t("preview.not_available")}
      </div>
    );
  }

  if (!html) {
    return (
      <div className={`text-sm text-muted-foreground animate-pulse ${className ?? ""}`}>
        {t("preview.loading")}
      </div>
    );
  }

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none [&_table]:border [&_td]:border [&_th]:border [&_td]:px-2 [&_th]:px-2 ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
