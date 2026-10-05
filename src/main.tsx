import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { listenForInstall } from "./pwa/install-store";
import { registerServiceWorker } from "./pwa/register-sw";
import "./styles/index.css";

listenForInstall();
registerServiceWorker();

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
