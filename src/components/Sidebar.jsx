import { NavLink } from "react-router-dom";

import {
  BookOpen,
  ClipboardCheck,
  FileClock,
  FolderKanban,
  Home,
  Moon,
  Settings,
  SlidersHorizontal,
  Users
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    path: "/",
    icon: Home
  },
  {
    label: "Obras",
    path: "/obras",
    icon: BookOpen
  },
  {
    label: "Subs",
    path: "/subs",
    icon: FolderKanban
  },
  {
    label: "Regras",
    path: "/regras",
    icon: SlidersHorizontal
  },
  {
    label: "Membros",
    path: "/membros",
    icon: Users
  },
  {
    label: "Conferência",
    path: "/conferencia",
    icon: ClipboardCheck
  },
  {
    label: "Histórico",
    path: "/historico",
    icon: FileClock
  },
  {
    label: "Configurações",
    path: "/configuracoes",
    icon: Settings
  }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Moon size={24} />
        </div>

        <div>
          <strong>Lunar</strong>
          <span>Conferência</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}