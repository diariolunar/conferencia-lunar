export default function Membros() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h2>Membros</h2>
        </div>
      </div>

      <div className="panel empty-state">
        <h3>Cadastro de membros desativado</h3>

        <p>
          O sistema agora funciona como conferência por ficha. Os membros são
          identificados automaticamente pelo user informado na ficha e salvos no
          histórico do sub.
        </p>
      </div>
    </section>
  );
}