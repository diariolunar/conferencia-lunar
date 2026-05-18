import { Sparkles } from "lucide-react";

export default function Header() {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Projeto Lunar</p>
        <h1>Sistema de Conferência Wattpad</h1>
      </div>

      <div className="topbar-badge">
        <Sparkles size={18} />
        <span>Versão inicial</span>
      </div>
    </header>
  );
}