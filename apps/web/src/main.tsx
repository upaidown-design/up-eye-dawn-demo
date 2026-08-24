import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles.css";
import "./public-home.css";
import "./data-viz.css";
import "./experience.css";
import "./round-experience.css";
import "./chart-experience.css";
import "./field-scene-3d.css";
import "./access-control.css";
import "./access-control-fixes.css";
import "./responsive.css";
import { App } from "./app";
import { LanguageProvider } from "./i18n";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <BrowserRouter basename="/demo">
        <App />
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>,
);
