import { useState } from "react";
import {
  prepararPlanoConferencia,
  verificarPlanoConferencia
} from "../services/conferenciaService.js";
import { salvarHistoricoConferencia } from "../services/historicoService.js";
import { formatarTempo } from "../utils/estimarTempoLeitura.js";
import { gerarResumoConferencia } from "../utils/gerarResumoConferencia.js";

const DIAS_SEMANA = [
  "Segunda-Feira",
  "Terça-Feira",
  "Quarta-Feira",
  "Quinta-Feira",
  "Sexta-Feira",
  "Sábado",
  "Domingo"
];

function criarId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function definirStatusGeral(resultados = []) {
  if (!resultados.length) {
    return "sem-resultados";
  }

  const validos = resultados.filter((item) => item.status !== "ignorado");

  if (!validos.length) {
    return "ignorado";
  }

  const temErro = validos.some(
    (item) =>
      item.status === "erro" ||
      item.status === "parcial" ||
      item.status === "reprovado"
  );

  return temErro ? "reprovado" : "aprovado";
}

function montarRegistroTemporario({ resultado, diaSemana }) {
  const ficha = resultado.ficha || {};

  return {
    subNome: ficha.sub || "",
    diaSemana,
    nome: ficha.nome || "",
    user: ficha.user || "",
    adm: ficha.adm || "",
    statusGeral: definirStatusGeral(resultado.resultados || []),
    totalLeituras: resultado.resultados?.length || 0,
    leituras: (resultado.resultados || []).map((item) => ({
      obraInformada: item.leitura?.obra || "",
      capitulosTexto: item.leitura?.capitulosTexto || "",
      minhaObra: Boolean(item.leitura?.minhaObra),
      feedbackOferecido: Boolean(item.leitura?.feedbackOferecido),
      status: item.status || "",
      statusTexto: item.statusTexto || "",
      tipo: item.tipo || "",
      pontuacaoObra: Number(item.pontuacaoObra) || 0,
      motivos: item.motivos || [],
      obraEncontrada: item.obraEncontrada
        ? {
            id: item.obraEncontrada.id || "",
            nome: item.obraEncontrada.nome || "",
            autor: item.obraEncontrada.autor || "",
            userAutor: item.obraEncontrada.userAutor || "",
            linkWattpad: item.obraEncontrada.linkWattpad || "",
            capaUrl: item.obraEncontrada.capaUrl || ""
          }
        : null,
      capitulos: (item.capitulos || []).map((capituloResultado) => {
        const capitulo = capituloResultado.capitulo || {};

        return {
          pedido: capituloResultado.pedido || null,
          encontrado: Boolean(capituloResultado.encontrado),
          status: capituloResultado.status || "",
          statusTexto: capituloResultado.statusTexto || "",
          titulo: capitulo.titulo || "",
          numero: capitulo.numero ?? null,
          tipo: capitulo.tipo || "",
          modoRegra: capitulo.modoRegra || "normal",
          linkWattpad: capitulo.linkWattpad || "",
          totalPalavras: Number(capitulo.totalPalavras) || 0,
          totalParagrafos: Number(capitulo.totalParagrafos) || 0,
          comentariosMinimos: Number(capituloResultado.comentariosMinimos) || 0,
          totalComentarios: Number(capituloResultado.totalComentarios) || 0,
          distribuicao: capituloResultado.distribuicao || {
            inicio: 0,
            meio: 0,
            fim: 0,
            semArea: 0
          },
          tempoEstimado: capituloResultado.tempoEstimado || {
            texto: "0 minuto",
            totalSegundos: 0
          },
          tempoReal: capituloResultado.tempoReal || {
            inicio: "",
            fim: "",
            totalSegundos: 0
          },
          motivos: capituloResultado.motivos || [],
          aprovacaoManual: capituloResultado.aprovacaoManual || null,
          comentarios: capituloResultado.comentarios || []
        };
      })
    }))
  };
}

export default function Conferencia() {
  const [textoFicha, setTextoFicha] = useState("");
  const [diaSemana, setDiaSemana] = useState("");
  const [plano, setPlano] = useState(null);
  const [resultadoConferencia, setResultadoConferencia] = useState(null);
  const [registroTemporario, setRegistroTemporario] = useState(null);
  const [statusAoVivo, setStatusAoVivo] = useState([]);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [preparando, setPreparando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modalManual, setModalManual] = useState(null);
  const [motivoManual, setMotivoManual] = useState("");

  function adicionarStatus(etapa) {
    setStatusAoVivo((listaAtual) => [...listaAtual, etapa].slice(-100));
  }

  function limparTela() {
    setTextoFicha("");
    setDiaSemana("");
    setPlano(null);
    setResultadoConferencia(null);
    setRegistroTemporario(null);
    setStatusAoVivo([]);
    setErro("");
    setMensagem("");
    setModalManual(null);
    setMotivoManual("");
  }

  async function prepararConferencia() {
    setErro("");
    setMensagem("");
    setPlano(null);
    setResultadoConferencia(null);
    setRegistroTemporario(null);
    setStatusAoVivo([]);

    if (!diaSemana) {
      setErro("Selecione o dia da semana.");
      return;
    }

    if (!textoFicha.trim()) {
      setErro("Cole uma ficha antes de preparar.");
      return;
    }

    try {
      setPreparando(true);

      const novoPlano = await prepararPlanoConferencia(textoFicha, {
        onStatus: adicionarStatus
      });

      setPlano(novoPlano);
      setMensagem("Ficha interpretada. Revise os dados antes de iniciar a verificação.");
    } catch (error) {
      console.error(error);
      setErro("Não consegui preparar a conferência.");
    } finally {
      setPreparando(false);
    }
  }

  function atualizarCapituloSelecionado(leituraId, capituloId, capituloSelecionadoId) {
    setPlano((estadoAtual) => {
      if (!estadoAtual) {
        return estadoAtual;
      }

      return {
        ...estadoAtual,
        leituras: estadoAtual.leituras.map((leitura) => {
          if (leitura.id !== leituraId) {
            return leitura;
          }

          return {
            ...leitura,
            capitulos: leitura.capitulos.map((capitulo) => {
              if (capitulo.id !== capituloId) {
                return capitulo;
              }

              const selecionado =
                leitura.capitulosDisponiveis.find(
                  (item) => item.id === capituloSelecionadoId
                ) || null;

              return {
                ...capitulo,
                capituloSelecionadoId,
                capituloSelecionado: selecionado,
                encontrado: Boolean(selecionado)
              };
            })
          };
        })
      };
    });
  }

  function atualizarModoRegra(leituraId, capituloId, modoRegra) {
    setPlano((estadoAtual) => {
      if (!estadoAtual) {
        return estadoAtual;
      }

      return {
        ...estadoAtual,
        leituras: estadoAtual.leituras.map((leitura) => {
          if (leitura.id !== leituraId) {
            return leitura;
          }

          return {
            ...leitura,
            capitulos: leitura.capitulos.map((capitulo) => {
              if (capitulo.id !== capituloId) {
                return capitulo;
              }

              return {
                ...capitulo,
                modoRegra
              };
            })
          };
        })
      };
    });
  }

  function adicionarCapituloNaLeitura(leituraId, modoRegraInicial = "normal") {
    setPlano((estadoAtual) => {
      if (!estadoAtual) {
        return estadoAtual;
      }

      return {
        ...estadoAtual,
        leituras: estadoAtual.leituras.map((leitura) => {
          if (leitura.id !== leituraId) {
            return leitura;
          }

          return {
            ...leitura,
            capitulos: [
              ...leitura.capitulos,
              {
                id: criarId(),
                pedido: {
                  tipo: "manual",
                  numero: null,
                  texto:
                    modoRegraInicial === "especial"
                      ? "Especial adicionado manualmente"
                      : modoRegraInicial === "poesia"
                        ? "Poesia adicionada manualmente"
                        : "Capítulo adicionado manualmente",
                  titulo:
                    modoRegraInicial === "especial"
                      ? "Especial adicionado manualmente"
                      : modoRegraInicial === "poesia"
                        ? "Poesia adicionada manualmente"
                        : "Capítulo adicionado manualmente"
                },
                capituloSelecionadoId: "",
                capituloSelecionado: null,
                modoRegra: modoRegraInicial,
                encontrado: false,
                manual: true
              }
            ]
          };
        })
      };
    });
  }

  function removerCapituloDaLeitura(leituraId, capituloId) {
    setPlano((estadoAtual) => {
      if (!estadoAtual) {
        return estadoAtual;
      }

      return {
        ...estadoAtual,
        leituras: estadoAtual.leituras.map((leitura) => {
          if (leitura.id !== leituraId) {
            return leitura;
          }

          return {
            ...leitura,
            capitulos: leitura.capitulos.filter(
              (capitulo) => capitulo.id !== capituloId
            )
          };
        })
      };
    });
  }

  function planoTemPendencia() {
    if (!plano) {
      return true;
    }

    return plano.leituras.some((leitura) => {
      if (leitura.minhaObra) {
        return false;
      }

      if (!leitura.obraEncontrada) {
        return true;
      }

      return leitura.capitulos.some((capitulo) => !capitulo.capituloSelecionado);
    });
  }

  async function iniciarVerificacao() {
    setErro("");
    setMensagem("");
    setResultadoConferencia(null);
    setRegistroTemporario(null);

    if (!plano) {
      setErro("Prepare a ficha antes de iniciar a verificação.");
      return;
    }

    if (planoTemPendencia()) {
      setErro("Resolva as pendências de obra/capítulo antes de verificar.");
      return;
    }

    try {
      setVerificando(true);

      const resultado = await verificarPlanoConferencia(plano, {
        onStatus: adicionarStatus
      });

      const registro = montarRegistroTemporario({
        resultado,
        diaSemana
      });

      setResultadoConferencia(resultado);
      setRegistroTemporario(registro);
      setMensagem("Verificação concluída. Revise o resultado antes de salvar.");
    } catch (error) {
      console.error(error);
      setErro("Não consegui verificar os comentários.");
    } finally {
      setVerificando(false);
    }
  }

  function abrirAprovacaoManual(leituraIndex, capituloIndex, capitulo) {
    setModalManual({
      leituraIndex,
      capituloIndex,
      capitulo
    });
    setMotivoManual("");
  }

  function confirmarAprovacaoManual() {
    if (!modalManual) {
      return;
    }

    if (!motivoManual.trim()) {
      setErro("Informe o motivo da aprovação manual.");
      return;
    }

    setResultadoConferencia((estadoAtual) => {
      if (!estadoAtual) {
        return estadoAtual;
      }

      const novoResultado = structuredClone(estadoAtual);
      const leitura = novoResultado.resultados[modalManual.leituraIndex];
      const capitulo = leitura.capitulos[modalManual.capituloIndex];

      capitulo.status = "aprovado-manual";
      capitulo.statusTexto = "Aprovado manualmente";
      capitulo.aprovacaoManual = {
        aprovado: true,
        motivo: motivoManual.trim(),
        data: new Date().toISOString()
      };
      capitulo.motivos = [];

      const aindaTemReprovado = leitura.capitulos.some(
        (item) =>
          item.status === "reprovado" ||
          item.status === "erro" ||
          item.status === "erro-comentarios" ||
          item.status === "capitulo-nao-encontrado"
      );

      if (!aindaTemReprovado) {
        leitura.status = "aprovado";
        leitura.statusTexto = "Leitura aprovada";
        leitura.motivos = [];
      }

      const registro = montarRegistroTemporario({
        resultado: novoResultado,
        diaSemana
      });

      setRegistroTemporario(registro);

      return novoResultado;
    });

    setModalManual(null);
    setMotivoManual("");
    setMensagem("Capítulo aprovado manualmente. Revise e salve o histórico.");
  }

  async function salvarNoHistorico() {
    if (!resultadoConferencia) {
      setErro("Faça a verificação antes de salvar.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      await salvarHistoricoConferencia({
        textoFicha,
        resultado: resultadoConferencia,
        diaSemana,
        permitirDuplicado: false
      });

      setMensagem("Conferência salva no histórico.");
    } catch (error) {
      console.error(error);

      if (error.codigo === "duplicado-exato") {
        setErro("Essa conferência já existe no histórico.");
      } else if (error.codigo === "capitulo-duplicado") {
        setErro("Um ou mais capítulos já foram salvos para esse membro nesse dia.");
      } else {
        setErro("Não consegui salvar no histórico.");
      }
    } finally {
      setSalvando(false);
    }
  }

  async function copiarResumo() {
    if (!registroTemporario) {
      setErro("Verifique a leitura antes de copiar o resumo.");
      return;
    }

    try {
      await navigator.clipboard.writeText(gerarResumoConferencia(registroTemporario));
      setMensagem("Resumo copiado.");
    } catch (error) {
      console.error(error);
      setErro("Não consegui copiar automaticamente.");
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Verificação revisada</p>
          <h2>Conferência por ficha</h2>
        </div>

        <button className="secondary-button" type="button" onClick={limparTela}>
          Limpar
        </button>
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}
      {mensagem ? <p className="form-success">{mensagem}</p> : null}

      <div className="two-columns">
        <div className="panel">
          <h3>1. Preparar ficha</h3>

          <label className="field field-full">
            <span>Dia da semana *</span>
            <select
              value={diaSemana}
              onChange={(event) => setDiaSemana(event.target.value)}
              disabled={preparando || verificando}
            >
              <option value="">Selecione</option>
              {DIAS_SEMANA.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </label>

          <textarea
            className="textarea"
            rows="16"
            value={textoFicha}
            onChange={(event) => setTextoFicha(event.target.value)}
            placeholder="Cole aqui a ficha..."
            disabled={preparando || verificando}
          />

          <div className="button-row">
            <button
              className="primary-button"
              type="button"
              onClick={prepararConferencia}
              disabled={preparando || verificando}
            >
              {preparando ? "Preparando..." : "Interpretar e revisar"}
            </button>
          </div>
        </div>

        <div className="panel">
          <h3>Status ao vivo</h3>
          <StatusAoVivo statusAoVivo={statusAoVivo} ativo={preparando || verificando} />
        </div>
      </div>

      {plano ? (
        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>2. Confirmar dados antes de verificar</h3>
              <p>
                Corrija capítulos não encontrados, adicione capítulos que faltaram
                e marque Normal, Especial ou Poesia.
              </p>
            </div>

            <button
              className="primary-button"
              type="button"
              onClick={iniciarVerificacao}
              disabled={verificando || preparando}
            >
              {verificando ? "Verificando..." : "Iniciar verificação"}
            </button>
          </div>

          <PlanoConferencia
            plano={plano}
            onSelecionarCapitulo={atualizarCapituloSelecionado}
            onMudarRegra={atualizarModoRegra}
            onAdicionarCapitulo={adicionarCapituloNaLeitura}
            onRemoverCapitulo={removerCapituloDaLeitura}
          />
        </div>
      ) : null}

      {resultadoConferencia ? (
        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>3. Revisar resultado antes de salvar</h3>
              <p>
                Aprove manualmente o que for necessário. Nada será salvo até você
                clicar em salvar histórico.
              </p>
            </div>

            <div className="button-row">
              <button
                className="secondary-button"
                type="button"
                onClick={copiarResumo}
              >
                Copiar resumo
              </button>

              <button
                className="primary-button"
                type="button"
                onClick={salvarNoHistorico}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar histórico"}
              </button>
            </div>
          </div>

          <ResultadoConferencia
            resultado={resultadoConferencia}
            onAprovarManual={abrirAprovacaoManual}
          />
        </div>
      ) : null}

      {registroTemporario ? (
        <div className="panel">
          <h3>Resumo copiável</h3>
          <pre className="copy-summary-box">
            {gerarResumoConferencia(registroTemporario)}
          </pre>
        </div>
      ) : null}

      {modalManual ? (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Aprovar manualmente</h3>

            <p>
              Informe o motivo para aprovar:{" "}
              <strong>{modalManual.capitulo?.capitulo?.titulo || "capítulo"}</strong>
            </p>

            <label className="field field-full">
              <span>Motivo obrigatório</span>
              <textarea
                rows="5"
                value={motivoManual}
                onChange={(event) => setMotivoManual(event.target.value)}
                placeholder="Explique por que essa leitura será aprovada..."
              />
            </label>

            <div className="form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setModalManual(null)}
              >
                Cancelar
              </button>

              <button
                className="primary-button"
                type="button"
                onClick={confirmarAprovacaoManual}
              >
                Confirmar aprovação
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PlanoConferencia({
  plano,
  onSelecionarCapitulo,
  onMudarRegra,
  onAdicionarCapitulo,
  onRemoverCapitulo
}) {
  return (
    <div className="review-plan-list">
      <div className="review-reader-card">
        <strong>{plano.ficha.user || "User não encontrado"}</strong>
        <span>
          {plano.ficha.nome || "Nome não encontrado"} ·{" "}
          {plano.ficha.sub || "Sub não encontrado"}
        </span>
      </div>

      {plano.leituras.map((leitura) => (
        <article className="review-work-card" key={leitura.id}>
          <div className="review-work-header">
            <div>
              <span>Obra informada</span>
              <h4>{leitura.leitura.obra || "Obra não informada"}</h4>
            </div>

            <strong
              className={`status-pill ${
                leitura.statusPreparacao === "pronto"
                  ? "success"
                  : leitura.statusPreparacao === "ignorado"
                    ? "neutral"
                    : "danger"
              }`}
            >
              {leitura.statusPreparacao}
            </strong>
          </div>

          {leitura.obraEncontrada ? (
            <div className="matched-work">
              {leitura.obraEncontrada.capaUrl ? (
                <img
                  src={leitura.obraEncontrada.capaUrl}
                  alt={`Capa de ${leitura.obraEncontrada.nome}`}
                />
              ) : (
                <div className="cover-placeholder">📕</div>
              )}

              <div>
                <strong>{leitura.obraEncontrada.nome}</strong>
                <span>Compatibilidade: {leitura.pontuacaoObra}%</span>
              </div>
            </div>
          ) : null}

          {leitura.mensagens?.length ? (
            <div className="reason-list">
              {leitura.mensagens.map((mensagem, index) => (
                <p key={`${mensagem}-${index}`}>• {mensagem}</p>
              ))}
            </div>
          ) : null}

          {leitura.obraEncontrada ? (
            <div className="button-row review-add-buttons">
              <button
                className="secondary-button"
                type="button"
                onClick={() => onAdicionarCapitulo(leitura.id, "normal")}
              >
                + Adicionar capítulo
              </button>

              <button
                className="secondary-button"
                type="button"
                onClick={() => onAdicionarCapitulo(leitura.id, "especial")}
              >
                + Adicionar especial
              </button>

              <button
                className="secondary-button"
                type="button"
                onClick={() => onAdicionarCapitulo(leitura.id, "poesia")}
              >
                + Adicionar poesia
              </button>
            </div>
          ) : null}

          {leitura.capitulos.length > 0 ? (
            <div className="review-chapters-list">
              {leitura.capitulos.map((capitulo) => (
                <div className="review-chapter-card" key={capitulo.id}>
                  <div>
                    <span>Pedido na ficha</span>
                    <strong>
                      {capitulo.pedido?.texto ||
                        capitulo.pedido?.titulo ||
                        capitulo.pedido?.numero ||
                        "Capítulo não identificado"}
                    </strong>

                    {capitulo.manual ? (
                      <button
                        className="mini-button danger remove-review-chapter"
                        type="button"
                        onClick={() =>
                          onRemoverCapitulo(leitura.id, capitulo.id)
                        }
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>

                  <label className="field">
                    <span>Capítulo encontrado/selecionado</span>
                    <select
                      value={capitulo.capituloSelecionadoId}
                      onChange={(event) =>
                        onSelecionarCapitulo(
                          leitura.id,
                          capitulo.id,
                          event.target.value
                        )
                      }
                    >
                      <option value="">Selecione manualmente</option>
                      {leitura.capitulosDisponiveis.map((opcao) => (
                        <option key={opcao.id} value={opcao.id}>
                          {opcao.titulo}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Tipo de regra</span>
                    <select
                      value={capitulo.modoRegra}
                      onChange={(event) =>
                        onMudarRegra(leitura.id, capitulo.id, event.target.value)
                      }
                    >
                      <option value="normal">Normal</option>
                      <option value="especial">Especial — mínimo 1 comentário</option>
                      <option value="poesia">Poesia — mínimo 3 comentários</option>
                    </select>
                  </label>
                </div>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ResultadoConferencia({ resultado, onAprovarManual }) {
  return (
    <div className="conference-result-list">
      {resultado.resultados.map((leitura, leituraIndex) => (
        <article className={`conference-card status-${leitura.status}`} key={leituraIndex}>
          <div className="conference-card-header">
            <div>
              <span>Leitura {leituraIndex + 1}</span>
              <h4>{leitura.leitura.obra || "Obra não informada"}</h4>
            </div>

            <strong className={`status-pill ${definirClasseStatus(leitura.status)}`}>
              {leitura.statusTexto}
            </strong>
          </div>

          {leitura.capitulos.map((capitulo, capituloIndex) => (
            <CapituloResultado
              key={`${capituloIndex}-${capitulo.capitulo?.titulo}`}
              capituloResultado={capitulo}
              leituraIndex={leituraIndex}
              capituloIndex={capituloIndex}
              onAprovarManual={onAprovarManual}
            />
          ))}
        </article>
      ))}
    </div>
  );
}

function CapituloResultado({
  capituloResultado,
  leituraIndex,
  capituloIndex,
  onAprovarManual
}) {
  if (!capituloResultado.encontrado) {
    return (
      <div className="chapter-result-card error">
        <strong>Capítulo não encontrado</strong>
        <p>{capituloResultado.motivos.join(" ")}</p>
      </div>
    );
  }

  const capitulo = capituloResultado.capitulo;

  return (
    <div className={`chapter-result-card ${capituloResultado.status}`}>
      <div className="chapter-result-title">
        <div>
          <span>
            {capitulo.tipo === "prologo" ? "Prólogo" : "Capítulo"}
          </span>
          <strong>{capitulo.titulo}</strong>
        </div>

        <strong className={`status-pill ${definirClasseStatus(capituloResultado.status)}`}>
          {capituloResultado.statusTexto}
        </strong>
      </div>

      <div className="chapter-result-metrics">
        <div>
          <span>Regra</span>
          <strong>{capitulo.modoRegra || "normal"}</strong>
        </div>

        <div>
          <span>Comentários</span>
          <strong>
            {capituloResultado.totalComentarios}/{capituloResultado.comentariosMinimos}
          </strong>
        </div>

        <div>
          <span>Início</span>
          <strong>{capituloResultado.distribuicao.inicio}</strong>
        </div>

        <div>
          <span>Meio</span>
          <strong>{capituloResultado.distribuicao.meio}</strong>
        </div>

        <div>
          <span>Fim</span>
          <strong>{capituloResultado.distribuicao.fim}</strong>
        </div>

        <div>
          <span>Tempo estimado</span>
          <strong>{capituloResultado.tempoEstimado.texto}</strong>
        </div>

        <div>
          <span>Tempo real</span>
          <strong>
            {formatarTempo(
              Math.floor((capituloResultado.tempoReal.totalSegundos || 0) / 60),
              (capituloResultado.tempoReal.totalSegundos || 0) % 60
            )}
          </strong>
        </div>
      </div>

      {capituloResultado.aprovacaoManual?.aprovado ? (
        <div className="manual-approval-box">
          <strong>Aprovado manualmente</strong>
          <p>{capituloResultado.aprovacaoManual.motivo}</p>
        </div>
      ) : null}

      {capituloResultado.motivos.length > 0 ? (
        <div className="reason-list">
          {capituloResultado.motivos.map((motivo, index) => (
            <p key={`${motivo}-${index}`}>• {motivo}</p>
          ))}
        </div>
      ) : null}

      {capituloResultado.comentarios?.length > 0 ? (
        <details className="comments-details">
          <summary>Ver comentários encontrados</summary>

          <div className="comments-list">
            {capituloResultado.comentarios.map((comentario) => (
              <div className="comment-item" key={comentario.id}>
                <strong>
                  {(comentario.area || "semArea").toUpperCase()} ·{" "}
                  {comentario.data
                    ? new Date(comentario.data).toLocaleString("pt-BR")
                    : "Sem data"}
                </strong>

                <p>{comentario.texto}</p>

                {comentario.deeplink ? (
                  <a
                    className="mini-button"
                    href={comentario.deeplink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir comentário
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {capituloResultado.status === "reprovado" ||
      capituloResultado.status === "erro-comentarios" ? (
        <div className="history-actions">
          <button
            className="mini-button primary"
            type="button"
            onClick={() =>
              onAprovarManual(leituraIndex, capituloIndex, capituloResultado)
            }
          >
            Aprovar manualmente
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StatusAoVivo({ statusAoVivo, ativo }) {
  if (statusAoVivo.length === 0) {
    return (
      <div className="live-status-empty">
        <p>Nenhum processo iniciado.</p>
      </div>
    );
  }

  return (
    <div className="live-status-box">
      {ativo ? (
        <div className="live-status-running">
          <span />
          Processando...
        </div>
      ) : null}

      <div className="live-status-list">
        {statusAoVivo.map((item) => (
          <div className={`live-status-item ${item.tipo}`} key={item.id}>
            <span className="live-status-dot" />
            <div>
              <strong>{item.titulo}</strong>
              <p>{item.detalhe}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function definirClasseStatus(status) {
  if (status === "aprovado" || status === "aprovado-manual") {
    return "success";
  }

  if (status === "ignorado") {
    return "neutral";
  }

  if (
    status === "reprovado" ||
    status === "erro" ||
    status === "erro-comentarios"
  ) {
    return "danger";
  }

  return "pending";
}
