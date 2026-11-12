import { Component, lazy, Suspense, type ReactNode } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { PageLoader } from "./components/Spinner";
import { Button } from "./components/ui";
import Home from "./pages/Home";
import Ledger from "./pages/Ledger";
import MyPools from "./pages/MyPools";
import NotFound from "./pages/NotFound";
import Pools from "./pages/Pools";

const PoolDetail = lazy(() => import("./pages/PoolDetail"));
const Create = lazy(() => import("./pages/Create"));
const Docs = lazy(() => import("./pages/Docs"));

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page"><div className="errorbox" role="alert"><div><strong>Something went wrong on this page</strong><p>{this.state.error.message}</p></div><Button variant="soft" size="sm" onClick={() => { this.setState({ error: null }); }}>Try again</Button></div></div>
    );
  }
}

export default function App() {
  return (
    <HashRouter>
      <Boundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="pools" element={<Pools />} />
              <Route path="pools/:id" element={<PoolDetail />} />
              <Route path="create" element={<Create />} />
              <Route path="me" element={<MyPools />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="docs" element={<Docs />} />
              <Route path="docs/:slug" element={<Docs />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </Boundary>
    </HashRouter>
  );
}
