import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { ensureState, saveState } from "./lib/store";
import "./index.css";

// 首次加载即持久化种子数据（localStorage 本地持久化）
const state = ensureState();
saveState(state);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
