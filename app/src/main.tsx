import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { enableMapSet } from "immer";
import "./index.css";
import App from "./App.tsx";
import { initializeCommands } from "./commands";

// Enable Immer MapSet plugin for Set/Map support in stores
enableMapSet();
import { SelfHealingErrorBoundary } from "./components/common/SelfHealingErrorBoundary";

// Initialize command handlers before rendering
initializeCommands();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SelfHealingErrorBoundary componentName="App">
      <App />
    </SelfHealingErrorBoundary>
  </StrictMode>,
);
