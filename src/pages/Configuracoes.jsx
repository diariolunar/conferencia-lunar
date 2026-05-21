export default function Configuracoes() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Sistema</p>
          <h2>Configurações</h2>
        </div>
      </div>

      <div className="panel">
        <h3>Configurações gerais</h3>

        <p className="muted">
          As principais configurações do sistema ficam nas páginas de Regras,
          Obras, Subs e Histórico.
        </p>

        <div className="settings-list">
          <div className="settings-item">
            <strong>Firebase</strong>
            <span>Configurado pelo arquivo .env e variáveis do Vercel.</span>
          </div>

          <div className="settings-item">
            <strong>Wattpad</strong>
            <span>
              A busca de capítulos e comentários usa as rotas da pasta api/wattpad.
            </span>
          </div>

          <div className="settings-item">
            <strong>Histórico</strong>
            <span>
              O histórico é salvo no Firebase por sub, dia da semana e membro.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}