import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import PageSkeleton from "@/components/ui/PageSkeleton";
import MovieDetailModal from "@/components/detail/MovieDetailModal";
import TVDetailModal from "@/components/detail/TVDetailModal";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import { useAuthStore } from "@/store/authStore";
import { bootstrapAdmin } from "@/lib/auth";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Search = lazy(() => import("./pages/Search"));
const MovieDetail = lazy(() => import("./pages/MovieDetail"));
const TVDetail = lazy(() => import("./pages/TVDetail"));
const WatchMovie = lazy(() => import("./pages/WatchMovie"));
const WatchTV = lazy(() => import("./pages/WatchTV"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const History = lazy(() => import("./pages/History"));
const Genre = lazy(() => import("./pages/Genre"));
const Browse = lazy(() => import("./pages/Browse"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <BrowserRouter>
      <AppBootstrap />
    </BrowserRouter>
  );
}

function AppBootstrap() {
  const initSession = useAuthStore((s) => s.initSession as () => void);

  useEffect(() => {
    bootstrapAdmin().catch(console.error);
    initSession();
  }, [initSession]);

  return <AppRoutes />;
}

function AppRoutes() {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location } | null;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
        {/* ── Public ── */}
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <Login />
            </Suspense>
          }
        />

        {/* ── Protected shell (checks auth, then renders Layout → Outlet) ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Home />
                </Suspense>
              }
            />
            <Route
              path="/search"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Search />
                </Suspense>
              }
            />
            <Route
              path="/movie/:id"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <MovieDetail />
                </Suspense>
              }
            />
            <Route
              path="/tv/:id"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <TVDetail />
                </Suspense>
              }
            />
            <Route
              path="/watch/movie/:id"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <WatchMovie />
                </Suspense>
              }
            />
            <Route
              path="/watch/tv/:id/:s/:e"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <WatchTV />
                </Suspense>
              }
            />
            <Route
              path="/watchlist"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Watchlist />
                </Suspense>
              }
            />
            <Route
              path="/history"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <History />
                </Suspense>
              }
            />
            <Route
              path="/genre/:id"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Genre />
                </Suspense>
              }
            />
            <Route
              path="/browse/:type"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <Browse />
                </Suspense>
              }
            />
            <Route
              path="/sports"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/sports/:sport"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <NotFound />
                </Suspense>
              }
            />
          </Route>

          {/* ── Admin (inside ProtectedRoute, extra role-check) ── */}
          <Route element={<AdminRoute />}>
            <Route
              path="/admin"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <AdminDashboard />
                </Suspense>
              }
            />
          </Route>
        </Route>
      </Routes>

      {/* ── Modal routes ── */}
      {backgroundLocation && (
        <Routes>
          <Route path="/movie/:id" element={<ModalMovieRoute />} />
          <Route path="/tv/:id" element={<ModalTVRoute />} />
        </Routes>
      )}
    </>
  );
}

function ModalMovieRoute() {
  const location = useLocation();
  const id = location.pathname.split("/").pop() ?? "";
  return <MovieDetailModal id={id} />;
}

function ModalTVRoute() {
  const location = useLocation();
  const id = location.pathname.split("/").pop() ?? "";
  return <TVDetailModal id={id} />;
}
