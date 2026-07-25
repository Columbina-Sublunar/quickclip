import { useState, useEffect } from "react";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n";
import { Globe, Power, PowerOff, Upload, Download } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => void;
  onImport: (mode: "replace" | "merge") => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  onExport,
  onImport,
}: SettingsDialogProps) {
  const { t, toggleLanguage, locale } = useLanguage();
  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
    if (open) {
      isEnabled().then(setAutoStart).catch(() => setAutoStart(false));
    }
  }, [open]);

  const toggleAutoStart = async () => {
    try {
      if (autoStart) {
        await disable();
      } else {
        await enable();
      }
      setAutoStart(!autoStart);
    } catch (e) {
      console.error("Failed to toggle autostart:", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">{t("settings.language")}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              {locale === "en" ? "中文" : "English"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">{t("settings.autostart")}</span>
            <Button
              variant={autoStart ? "default" : "outline"}
              size="sm"
              onClick={toggleAutoStart}
              className="gap-2"
            >
              {autoStart ? (
                <Power className="h-4 w-4 text-green-500" />
              ) : (
                <PowerOff className="h-4 w-4" />
              )}
              {autoStart ? "ON" : "OFF"}
            </Button>
          </div>

          <div className="border-t" />

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="justify-start gap-2"
            >
              <Upload className="h-4 w-4" />
              {t("settings.export_backup")}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onImport("replace")}
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                {t("import.replace")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onImport("merge")}
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                {t("import.merge")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
