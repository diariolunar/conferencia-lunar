import EmptyState from "../components/EmptyState.jsx";

export default function Membros() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Participantes</p>
          <h2>Membros</h2>
        </div>

        <button className="primary-button" type="button">
          Novo membro
        </button>
      </div>

      <EmptyState
        titulo="Nenhum membro cadastrado"
        descricao="Essa tela será usada para organizar users do Wattpad, nomes, subs e status."
      />
    </section>
  );
}