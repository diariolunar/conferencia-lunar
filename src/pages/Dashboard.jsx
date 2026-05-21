import { Link } from "react-router-dom";
import {
  BookOpen,
  ClipboardCheck,
  FileClock,
  FolderKanban,
  SlidersHorizontal
} from "lucide-react";

const cards = [
  {
    title: "Obras",
    description: "Cadastre obras e importe capítulos do Wattpad.",
    path: "/obras",
    icon: BookOpen
  },
  {
    title: "Subs",
    description: "Organize os subs de leitura do projeto.",
    path: "/subs",
    icon: FolderKanban
  },
  {
    title: "Regras",
    description: "Configure comentários mínimos, tempo e distribuição.",
    path: "/regras",
    icon: SlidersHorizontal
  },
  {
    title: "Conferência",
    description: "Cole a ficha, revise capítulos e verifique comentários.",
    path: "/conferencia",
    icon: ClipboardCheck
  },
  {
    title: "Histórico",
    description: "Veja conferências por sub, dia e membro.",
    path: "/historico",
    icon: FileClock
  }
];

export default function Dashboard() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Painel principal</p>
          <h2>Dashboard</h2>
        </div>
      </div>

      <div className="hero-panel">
        <div>
          <p className="eyebrow">Lunar Conferência</p>
          <h2>Controle de leituras do Wattpad</h2>
          <p>
            Sistema para cadastrar obras, importar capítulos, conferir comentários
            e salvar o histórico por sub, dia e membro.
          </p>
        </div>

        <Link className="primary-button" to="/conferencia">
          Iniciar conferência
        </Link>
      </div>

      <div className="dashboard-grid">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link className="dashboard-card" to={card.path} key={card.path}>
              <div className="dashboard-card-icon">
                <Icon size={24} />
              </div>

              <div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}