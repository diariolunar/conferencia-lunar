import { useEffect, useMemo, useState } from "react";

import {
  aprovarCapituloManual,
  excluirHistoricoConferencia,
  limparHistoricoGeral,
  limparHistoricoPorSub,
  listarHistoricoConferencias
} from "../services/historicoService.js";

import {
  formatarStatus,
  formatarTempoSegundos,
  gerarResumoConferencia
} from "../utils/gerarResumoConferencia.js";

const DIAS_LEITURA = [
  "Segunda-Feira",
  "Terça-Feira",
  "Quarta-Feira",
  "Quinta-Feira",
  "Sexta-Feira"
];

function formatarData(data) {
  try {
    if (!data) {
      return "Sem data";
    }

    if (typeof data.toDate === "function") {
      return data.toDate().toLocaleString("pt-BR");
    }

    return new Date(data).toLocaleString("pt-BR");
  } catch {
    return "Sem data";
  }
}

function definirClasseStatus(status) {
  if (status === "aprovado" || status === "aprovado-manual") {
    return "success";
  }

  if (status === "reprovado" || status === "erro" || status === "erro-comentarios") {
    return "danger";
  }

  if (status === "ignorado") {
    return "neutral";
  }

  return "pending";
}

function agruparHistorico(registros = []) {
  const estrutura = {};

  registros.forEach((registro) => {
    const subNome = registro.subNome || "Sub não identificado";
    const subId = registro.subId || "";
    const diaSemana = registro.diaSemana || "Sem dia";
    const user = registro.user || "Sem user";

    if (!estrutura[subNome]) {
      estrutura[subNome] = {
        subId,
        subNome,
        registros: [],
        dias: {}
      };
    }

    if (!estrutura[subNome].subId && subId) {
      estrutura[subNome].subId = subId;
    }

    estrutura[subNome].registros.push(registro);

    if (!estrutura[subNome].dias[diaSemana]) {
      estrutura[subNome].dias[diaSemana] = {
        diaSemana,
        registros: [],
        membros: {}
      };
    }

    estrutura[subNome].dias[diaSemana].registros.push(registro);

    if (!estrutura[subNome].dias[diaSemana].membros[user]) {
      estrutura[subNome].dias[diaSemana].membros[user] = {
        user,
        nome: registro.nome || "",
        subNome,
        diaSemana,
        registros: []
      };
    }

    estrutura[subNome].dias[diaSemana].membros[user].registros.push(registro);
  });

  return estrutura;
}

function calcularEstatisticas(registros = []) {
  const stats = {
    total: registros.length,
    aprovados: 0,
    reprovados: 0,
    ignorados: 0,
    membros: new Set(),
    leituras: 0,
    capitulos: 0,
    comentarios: 0
  };

  registros.forEach((registro) => {
    if (registro.user) {
      stats.membros.add(registro.user);
    }

    if (registro.statusGeral === "aprovado") {
      stats.aprovados += 1;
    } else if (registro.statusGeral === "reprovado") {
      stats.reprovados += 1;
    } else if (registro.statusGeral === "ignorado") {
      stats.ignorados += 1;
    }

    (registro.leituras || []).forEach((leitura) => {
      stats.leituras += 1;

      (leitura.capitulos || []).forEach((capitulo) => {
        stats.capitulos += 1;
        stats.comentarios += Number(capitulo.totalComentarios) || 0;
      });
    });
  });

  return {
    ...stats,
    membros: stats.membros.size
  };
}

function calcularPainelSemanal(registros = []) {
  return DIAS_LEITURA.map((dia) => {
    const registrosDia = registros.filter((registro) => registro.diaSemana === dia);
    const stats = calcularEstatisticas(registrosDia);

    return {
      dia,
      ...stats
    };
  });
}

export default function Historico() {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");
  const [subSelecionado, setSubSelecionado] = useState("");
  const [membroSelecionado, setMembroSelecionado] = useState(null);
  const [modalAprovacao, setModalAprovacao] = useState(null);
  const [motivoAprovacao, setMotivoAprovacao] = useState("");
  const [salvandoAprovacao, setSalvandoAprovacao] = useState(false);
  const [limpando, setLimpando] = useState(false);

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function carregarHistorico() {
    try {
      setCarregando(true);
      setErro("");
      setMensagem("");

      const lista = await listarHistoricoConferencias(500);
      setHistorico(lista);
    } catch (error) {
      console.error(error);
      setErro("Não consegui carregar o histórico.");
    } finally {
      setCarregando(false);
    }
  }

  async function excluirRegistro(id) {
    const confirmar = window.confirm("Tem certeza que deseja excluir esta conferência?");

    if (!confirmar) {
      return;
    }

    try {
      await excluirHistoricoConferencia(id);
      setMensagem("Conferência excluída com sucesso.");
      await carregarHistorico();
    } catch (error) {
      console.error(error);
      setErro("Não consegui excluir a conferência.");
    }
  }

  async function limparTudo() {
    const confirmar = window.confirm(
      "Tem certeza que deseja apagar TODO o histórico geral? Essa ação não pode ser desfeita."
    );

    if (!confirmar) {
      return;
    }

    try {
      setLimpando(true);
      setErro("");
      setMensagem("");

      const total = await limparHistoricoGeral();

      setMembroSelecionado(null);
      setSubSelecionado("");
      setMensagem(`Histórico geral limpo com sucesso. ${total} registro(s) apagado(s).`);
      await carregarHistorico();
    } catch (error) {
      console.error(error);
      setErro("Não consegui limpar o histórico geral.");
    } finally {
      setLimpando(false);
    }
  }

  async function limparSub(sub) {
    if (!sub?.subNome) {
      setErro("Sub inválido.");
      return;
    }

    const confirmar = window.confirm(
      `Tem certeza que deseja apagar todo o histórico do sub "${sub.subNome}"? Essa ação não pode ser desfeita.`
    );

    if (!confirmar) {
      return;
    }

    try {
      setLimpando(true);
      setErro("");
      setMensagem("");

      const total = await limparHistoricoPorSub({
        subId: sub.subId || "",
        subNome: sub.subNome
      });

      setMembroSelecionado(null);
      setMensagem(`Histórico do sub "${sub.subNome}" limpo com sucesso. ${total} registro(s) apagado(s).`);
      await carregarHistorico();
    } catch (error) {
      console.error(error);
      setErro("Não consegui limpar o histórico do sub.");
    } finally {
      setLimpando(false);
    }
  }

  async function copiarResumo(registro) {
    try {
      await navigator.clipboard.writeText(gerarResumoConferencia(registro));
      setMensagem("Resumo copiado.");
    } catch (error) {
      console.error(error);
      setErro("Não consegui copiar o resumo automaticamente.");
    }
  }

  function abrirModalAprovacao({ registro, leituraIndex, capituloIndex, capitulo }) {
    setMotivoAprovacao("");
    setModalAprovacao({
      registro,
      leituraIndex,
      capituloIndex,
      capitulo
    });
  }

  function fecharModalAprovacao() {
    setModalAprovacao(null);
    setMotivoAprovacao("");
    setSalvandoAprovacao(false);
  }

  async function confirmarAprovacaoManual() {
    if (!modalAprovacao) {
      return;
    }

    if (!motivoAprovacao.trim()) {
      setErro("Informe o motivo da aprovação manual.");
      return;
    }

    try {
      setSalvandoAprovacao(true);
      setErro("");
      setMensagem("");

      await aprovarCapituloManual({
        registro: modalAprovacao.registro,
        leituraIndex: modalAprovacao.leituraIndex,
        capituloIndex: modalAprovacao.capituloIndex,
        motivo: motivoAprovacao
      });

      setMensagem("Capítulo aprovado manualmente.");
      fecharModalAprovacao();
      await carregarHistorico();
    } catch (error) {
      console.error(error);
      setErro(error.message || "Não consegui aprovar manualmente.");
    } finally {
      setSalvandoAprovacao(false);
    }
  }

  const historicoFiltrado = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return historico.filter((registro) => {
      const bateSub = !subSelecionado || registro.subNome === subSelecionado;

      const texto = [
        registro.subNome,
        registro.subCodigo,
        registro.user,
        registro.nome,
        registro.diaSemana,
        registro.statusGeral,
        ...(registro.leituras || []).map((leitura) => leitura.obraInformada)
      ]
        .join(" ")
        .toLowerCase();

      const bateBusca = !termo || texto.includes(termo);

      return bateSub && bateBusca;
    });
  }, [historico, busca, subSelecionado]);

  const agrupado = useMemo(() => {
    return agruparHistorico(historicoFiltrado);
  }, [historicoFiltrado]);

  const subsDisponiveis = useMemo(() => {
    return Array.from(new Set(historico.map((registro) => registro.subNome).filter(Boolean))).sort();
  }, [historico]);

  const estatisticasGerais = useMemo(() => {
    return calcularEstatisticas(historicoFiltrado);
  }, [historicoFiltrado]);

  const painelSemanal = useMemo(() => {
    return calcularPainelSemanal(historicoFiltrado);
  }, [historicoFiltrado]);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Conferências salvas</p>
          <h2>Histórico</h2>
        </div>

        <div className="button-row">
          <button className="secondary-button" type="button" onClick={carregarHistorico}>
            Atualizar
          </button>

          <button
            className="mini-button danger"
            type="button"
            onClick={limparTudo}
            disabled={limpando}
          >
            {limpando ? "Limpando..." : "Limpar geral"}
          </button>
        </div>
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}
      {mensagem ? <p className="form-success">{mensagem}</p> : null}

      <div className="history-dashboard-grid">
        <ResumoCard titulo="Conferências" valor={estatisticasGerais.total} />
        <ResumoCard titulo="Membros" valor={estatisticasGerais.membros} />
        <ResumoCard titulo="Aprovadas" valor={estatisticasGerais.aprovados} />
        <ResumoCard titulo="Reprovadas" valor={estatisticasGerais.reprovados} />
        <ResumoCard titulo="Capítulos" valor={estatisticasGerais.capitulos} />
        <ResumoCard titulo="Comentários" valor={estatisticasGerais.comentarios} />
      </div>

      <div className="panel">
        <div className="section-title-row">
          <div>
            <h3>Painel semanal</h3>
            <p>Resumo das conferências de segunda a sexta.</p>
          </div>
        </div>

        <div className="weekly-panel">
          {painelSemanal.map((dia) => (
            <div className="weekly-day-card" key={dia.dia}>
              <strong>{dia.dia}</strong>
              <span>{dia.total} conferência(s)</span>
              <small>{dia.aprovados} aprovadas · {dia.reprovados} reprovadas</small>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="section-title-row">
          <div>
            <h3>Filtros</h3>
            <p>Filtre por sub, user, nome, obra ou status.</p>
          </div>
        </div>

        <div className="history-filters">
          <label className="field">
            <span>Sub</span>
            <select
              value={subSelecionado}
              onChange={(event) => {
                setSubSelecionado(event.target.value);
                setMembroSelecionado(null);
              }}
            >
              <option value="">Todos os subs</option>
              {subsDisponiveis.map((sub) => (
                <option value={sub} key={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Buscar</span>
            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="User, nome, obra, dia..."
            />
          </label>
        </div>
      </div>

      {membroSelecionado ? (
        <TelaMembroDia
          membro={membroSelecionado}
          onVoltar={() => setMembroSelecionado(null)}
          onExcluir={excluirRegistro}
          onCopiarResumo={copiarResumo}
          onAprovarManual={abrirModalAprovacao}
        />
      ) : (
        <div className="panel">
          {carregando ? (
            <p className="muted">Carregando histórico...</p>
          ) : historicoFiltrado.length === 0 ? (
            <div className="empty-state compact">
              <h3>Nenhuma conferência encontrada</h3>
              <p>Faça uma conferência primeiro ou ajuste os filtros.</p>
            </div>
          ) : (
            <div className="history-tree">
              {Object.values(agrupado).map((sub) => (
                <SubHistorico
                  key={sub.subNome}
                  sub={sub}
                  limpando={limpando}
                  onLimparSub={limparSub}
                  onAbrirMembro={setMembroSelecionado}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {modalAprovacao ? (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Aprovar leitura manualmente</h3>

            <p>
              Você está aprovando manualmente:{" "}
              <strong>{modalAprovacao.capitulo?.titulo || "capítulo"}</strong>
            </p>

            <label className="field field-full">
              <span>Motivo obrigatório</span>
              <textarea
                rows="5"
                value={motivoAprovacao}
                onChange={(event) => setMotivoAprovacao(event.target.value)}
                placeholder="Explique por que essa leitura será aprovada mesmo sem cumprir todas as regras..."
              />
            </label>

            <div className="form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={fecharModalAprovacao}
                disabled={salvandoAprovacao}
              >
                Cancelar
              </button>

              <button
                className="primary-button"
                type="button"
                onClick={confirmarAprovacaoManual}
                disabled={salvandoAprovacao}
              >
                {salvandoAprovacao ? "Salvando..." : "Confirmar aprovação"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ResumoCard({ titulo, valor }) {
  return (
    <div className="history-stat-card">
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function SubHistorico({ sub, limpando, onLimparSub, onAbrirMembro }) {
  const stats = calcularEstatisticas(sub.registros);

  return (
    <details className="history-sub-block" open>
      <summary>
        <div>
          <span>Sub</span>
          <strong>{sub.subNome}</strong>
          <small>
            {stats.membros} membro(s) · {stats.total} conferência(s) · {stats.aprovados} aprovada(s)
          </small>
        </div>
      </summary>

      <div className="history-sub-actions">
        <button
          className="mini-button danger"
          type="button"
          onClick={() => onLimparSub(sub)}
          disabled={limpando}
        >
          {limpando ? "Limpando..." : "Limpar histórico deste sub"}
        </button>
      </div>

      <div className="member-days-list">
        {DIAS_LEITURA.map((dia) => {
          const blocoDia = sub.dias[dia] || {
            diaSemana: dia,
            registros: [],
            membros: {}
          };

          const statsDia = calcularEstatisticas(blocoDia.registros);

          return (
            <details className="history-day-block" key={dia} open>
              <summary>
                <div>
                  <span>Dia</span>
                  <strong>{dia}</strong>
                  <small>
                    {statsDia.membros} membro(s) · {statsDia.total} conferência(s)
                  </small>
                </div>
              </summary>

              {blocoDia.registros.length === 0 ? (
                <div className="empty-state compact">
                  <p>Nenhuma leitura registrada nesse dia.</p>
                </div>
              ) : (
                <div className="member-grid">
                  {Object.values(blocoDia.membros).map((membro) => {
                    const membroStats = calcularEstatisticas(membro.registros);

                    return (
                      <button
                        className="member-card"
                        type="button"
                        key={`${dia}-${membro.user}`}
                        onClick={() => onAbrirMembro(membro)}
                      >
                        <span>User</span>
                        <strong>{membro.user}</strong>
                        <small>{membro.nome || "Nome não informado"}</small>

                        <div className="member-card-metrics">
                          <em>{membroStats.total} conf.</em>
                          <em>{membroStats.aprovados} ✅</em>
                          <em>{membroStats.reprovados} ❌</em>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </details>
          );
        })}
      </div>
    </details>
  );
}

function TelaMembroDia({ membro, onVoltar, onExcluir, onCopiarResumo, onAprovarManual }) {
  const stats = calcularEstatisticas(membro.registros);

  return (
    <div className="panel member-detail-panel">
      <div className="member-detail-header">
        <div>
          <p className="eyebrow">Leituras do dia</p>
          <h3>{membro.user}</h3>
          <span>
            {membro.nome || "Nome não informado"} · {membro.subNome} · {membro.diaSemana}
          </span>
        </div>

        <button className="secondary-button" type="button" onClick={onVoltar}>
          Voltar
        </button>
      </div>

      <div className="history-dashboard-grid compact">
        <ResumoCard titulo="Conferências" valor={stats.total} />
        <ResumoCard titulo="Aprovadas" valor={stats.aprovados} />
        <ResumoCard titulo="Reprovadas" valor={stats.reprovados} />
        <ResumoCard titulo="Comentários" valor={stats.comentarios} />
      </div>

      <div className="history-records">
        {membro.registros.map((registro) => (
          <RegistroHistorico
            key={registro.id}
            registro={registro}
            onExcluir={() => onExcluir(registro.id)}
            onCopiarResumo={() => onCopiarResumo(registro)}
            onAprovarManual={onAprovarManual}
          />
        ))}
      </div>
    </div>
  );
}

function RegistroHistorico({ registro, onExcluir, onCopiarResumo, onAprovarManual }) {
  return (
    <article className={`history-card status-${registro.statusGeral}`}>
      <div className="history-card-header">
        <div>
          <span>{formatarData(registro.criadoEm)}</span>
          <h4>{registro.nome || registro.user || "Sem nome"}</h4>
          <p>{registro.diaSemana || "Sem dia"} · {registro.subNome || "Sem sub"}</p>
        </div>

        <strong className={`status-pill ${definirClasseStatus(registro.statusGeral)}`}>
          {formatarStatus(registro.statusGeral)}
        </strong>
      </div>

      <div className="history-card-grid">
        <div>
          <span>Leituras</span>
          <strong>{registro.totalLeituras || 0}</strong>
        </div>

        <div>
          <span>Aprovadas</span>
          <strong>{registro.resumoStatus?.aprovado || 0}</strong>
        </div>

        <div>
          <span>Reprovadas</span>
          <strong>
            {(registro.resumoStatus?.reprovado || 0) + (registro.resumoStatus?.erro || 0)}
          </strong>
        </div>

        <div>
          <span>Ignoradas</span>
          <strong>{registro.resumoStatus?.ignorado || 0}</strong>
        </div>
      </div>

      <div className="history-works">
        {(registro.leituras || []).map((leitura, leituraIndex) => (
          <LeituraHistorico
            key={`${leitura.obraInformada}-${leituraIndex}`}
            registro={registro}
            leitura={leitura}
            leituraIndex={leituraIndex}
            onAprovarManual={onAprovarManual}
          />
        ))}
      </div>

      <div className="history-actions">
        <button className="mini-button primary" type="button" onClick={onCopiarResumo}>
          Copiar resumo
        </button>

        <button className="mini-button danger" type="button" onClick={onExcluir}>
          Excluir
        </button>
      </div>
    </article>
  );
}

function LeituraHistorico({ registro, leitura, leituraIndex, onAprovarManual }) {
  return (
    <div className="history-work-detail">
      <div className="history-work-item">
        <div>
          <strong>{leitura.obraEncontrada?.nome || leitura.obraInformada}</strong>
          <span>{leitura.capitulosTexto || "Sem capítulos"}</span>
        </div>

        <strong className={`status-pill ${definirClasseStatus(leitura.status)}`}>
          {leitura.statusTexto || formatarStatus(leitura.status)}
        </strong>
      </div>

      {leitura.motivos?.length > 0 ? (
        <div className="reason-list">
          {leitura.motivos.map((motivo, index) => (
            <p key={`${motivo}-${index}`}>• {motivo}</p>
          ))}
        </div>
      ) : null}

      <div className="history-chapters">
        {(leitura.capitulos || []).map((capitulo, capituloIndex) => (
          <CapituloHistorico
            key={`${capitulo.titulo}-${capituloIndex}`}
            registro={registro}
            leituraIndex={leituraIndex}
            capituloIndex={capituloIndex}
            capitulo={capitulo}
            onAprovarManual={onAprovarManual}
          />
        ))}
      </div>
    </div>
  );
}

function CapituloHistorico({
  registro,
  leituraIndex,
  capituloIndex,
  capitulo,
  onAprovarManual
}) {
  const podeAprovarManual =
    capitulo.status === "reprovado" ||
    capitulo.status === "erro" ||
    capitulo.status === "erro-comentarios";

  return (
    <div className={`history-chapter-card status-${capitulo.status}`}>
      <div className="history-chapter-header">
        <div>
          <span>{capitulo.tipo === "prologo" ? "Prólogo" : "Capítulo"}</span>
          <strong>{capitulo.titulo || "Capítulo não encontrado"}</strong>
        </div>

        <strong className={`status-pill ${definirClasseStatus(capitulo.status)}`}>
          {capitulo.statusTexto || formatarStatus(capitulo.status)}
        </strong>
      </div>

      <div className="history-chapter-metrics">
        <div>
          <span>Regra</span>
          <strong>{capitulo.modoRegra || "normal"}</strong>
        </div>

        <div>
          <span>Comentários</span>
          <strong>{capitulo.totalComentarios || 0}/{capitulo.comentariosMinimos || 0}</strong>
        </div>

        <div>
          <span>Início</span>
          <strong>{capitulo.distribuicao?.inicio || 0}</strong>
        </div>

        <div>
          <span>Meio</span>
          <strong>{capitulo.distribuicao?.meio || 0}</strong>
        </div>

        <div>
          <span>Fim</span>
          <strong>{capitulo.distribuicao?.fim || 0}</strong>
        </div>

        <div>
          <span>Tempo estimado</span>
          <strong>{capitulo.tempoEstimado?.texto || "0 minuto"}</strong>
        </div>

        <div>
          <span>Tempo real</span>
          <strong>{formatarTempoSegundos(capitulo.tempoReal?.totalSegundos || 0)}</strong>
        </div>
      </div>

      {capitulo.aprovacaoManual?.aprovado ? (
        <div className="manual-approval-box">
          <strong>Aprovado manualmente</strong>
          <p>{capitulo.aprovacaoManual.motivo}</p>
        </div>
      ) : null}

      {capitulo.motivos?.length > 0 ? (
        <div className="reason-list">
          {capitulo.motivos.map((motivo, index) => (
            <p key={`${motivo}-${index}`}>• {motivo}</p>
          ))}
        </div>
      ) : null}

      <div className="history-actions">
        {podeAprovarManual ? (
          <button
            className="mini-button primary"
            type="button"
            onClick={() =>
              onAprovarManual({
                registro,
                leituraIndex,
                capituloIndex,
                capitulo
              })
            }
          >
            Aprovar manualmente
          </button>
        ) : null}

        {capitulo.linkWattpad ? (
          <a
            className="mini-button"
            href={capitulo.linkWattpad}
            target="_blank"
            rel="noreferrer"
          >
            Abrir capítulo
          </a>
        ) : null}
      </div>
    </div>
  );
}
