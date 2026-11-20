import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import TodayPage from "@/pages/today";
import PointsPage from "@/pages/points";
import ReviewPage from "@/pages/review";
import "./index.css";

const NAV = [
  { to: "/", label: "今日" },
  { to: "/points", label: "复利点" },
  { to: "/review", label: "复盘" },
];

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <div className="min-h-screen bg-stage text-zinc-900 font-sans antialiased">
        <nav className="sticky top-0 z-10 bg-stage/80 backdrop-blur border-b border-hairline">
          <div className="max-w-2xl mx-auto flex items-center gap-6 px-6 h-12">
            <span className="text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5">
              <span className="h-[5px] w-[5px] rounded-full bg-accent" aria-hidden />
              复利 OS
            </span>
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `text-xs ${
                    isActive ? "text-accent font-medium" : "text-muted hover:text-zinc-800"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="/review" element={<ReviewPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  </StrictMode>
);
