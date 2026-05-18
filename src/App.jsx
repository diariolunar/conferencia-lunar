import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Obras from "./pages/Obras.jsx";
import ObraDetalhes from "./pages/ObraDetalhes.jsx";
import Regras from "./pages/Regras.jsx";
import Membros from "./pages/Membros.jsx";
import Subs from "./pages/Subs.jsx";
import Conferencia from "./pages/Conferencia.jsx";
import Historico from "./pages/Historico.jsx";
import Configuracoes from "./pages/Configuracoes.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="obras" element={<Obras />} />
        <Route path="obras/:obraId" element={<ObraDetalhes />} />
        <Route path="regras" element={<Regras />} />
        <Route path="membros" element={<Membros />} />
        <Route path="subs" element={<Subs />} />
        <Route path="conferencia" element={<Conferencia />} />
        <Route path="historico" element={<Historico />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}