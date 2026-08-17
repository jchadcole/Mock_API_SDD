import { Link, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.js";
import ProjectDetail from "./pages/ProjectDetail.js";

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-postman-orange font-bold text-white">
            P
          </div>
          <Link to="/" className="text-lg font-semibold text-slate-900">
            Spec-Driven Development Dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
        </Routes>
      </main>
    </div>
  );
}
