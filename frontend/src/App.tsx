import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { MarketProvider } from "./context/MarketContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NavBar } from "./components/layout/NavBar";
import { Sidebar } from "./components/layout/Sidebar";
import { BottomTabBar } from "./components/layout/BottomTabBar";
import { LoadingSpinner } from "./components/common/LoadingSpinner";

const WatchlistPage = lazy(() => import("./pages/WatchlistPage").then((m) => ({ default: m.WatchlistPage })));
const StockDetailPage = lazy(() => import("./pages/StockDetailPage").then((m) => ({ default: m.StockDetailPage })));
const MarketsPage = lazy(() => import("./pages/MarketsPage").then((m) => ({ default: m.MarketsPage })));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage").then((m) => ({ default: m.PortfolioPage })));
const MarketNewsPage = lazy(() => import("./pages/MarketNewsPage").then((m) => ({ default: m.MarketNewsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function App() {
  return (
    <ThemeProvider>
      <MarketProvider>
        <NavBar />
        <div className="flex min-h-[calc(100vh-3.5rem)] pb-16 sm:pb-0">
          <Sidebar />
          <main className="flex-1 min-w-0 lg:ml-56">
            <Suspense
              fallback={
                <div className="mx-auto max-w-6xl px-4 py-10">
                  <LoadingSpinner label="Loading…" />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<WatchlistPage />} />
                <Route path="/watchlist" element={<WatchlistPage />} />
                <Route path="/stock/:market/:symbol" element={<StockDetailPage />} />
                <Route path="/markets" element={<MarketsPage />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/news" element={<MarketNewsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Suspense>
          </main>
        </div>
        <BottomTabBar />
      </MarketProvider>
    </ThemeProvider>
  );
}

export default App;
