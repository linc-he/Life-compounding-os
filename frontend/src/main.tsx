import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./index.css";

try {
  if (localStorage.getItem("zhixing-theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
