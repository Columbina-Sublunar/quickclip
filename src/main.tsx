import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/i18n";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
