import { MoonStar } from "lucide-react";

export default function Header() {
  return (
    <header className="top-header">
      <div>
        <p className="eyebrow">Projeto Lunar</p>
        <h1>Conferência Wattpad</h1>
      </div>

      <div className="header-badge">
        <MoonStar size={18} />
        <span>Sistema de leitura</span>
      </div>
    </header>
  );
}