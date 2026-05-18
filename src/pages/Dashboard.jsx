import { useEffect, useState } from "react";
import { BookOpen, ClipboardCheck, FileClock, Users } from "lucide-react";
import CardResumo from "../components/CardResumo.jsx";
import { listarObras } from "../services/obrasService.js";

export default function Dashboard() {
  const [totalObras, setTotalObras] = useState(0);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarResumo();
  }, []);

  async function carregarResumo() {
    try {
      setErro("");
      const obras = await listarObras();
      setTotalObras(obras.length);
    } catch (error) {
      console.error(error);
      setErro(
        "Ainda não consegui ler o Firebase. Se você não configurou o .env, isso é esperado."
      );
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h2>Dashboard</h2>
        </div>
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="summary-grid">
        <CardResumo
          titulo="Obras cadastradas"
          valor={totalObras}
          descricao="Salvas no Firebase"
          icon={BookOpen}
        />

        <CardResumo
          titulo="Membros"
          valor="0"
          descricao="Base ainda vazia"
          icon={Users}
        />

        <CardResumo
          titulo="Conferências"
          valor="0"
          descricao="Nenhuma conferência feita"
          icon={ClipboardCheck}
        />

        <CardResumo
          titulo="Histórico"
          valor="0"
          descricao="Sem registros"
          icon={FileClock}
        />
      </div>

      <div className="panel">
        <h3>Pacote 2 ativo</h3>
        <p>
          Agora o sistema já tem cadastro de obras e capítulos. O próximo passo
          será criar as regras de aprovação e ligar isso com a conferência por
          ficha.
        </p>
      </div>
    </section>
  );
}