import { useMemo, useState } from "react";

import {
  prepararPlanoConferencia,
  verificarPlanoConferencia
} from "../services/conferenciaService.js";

import {
  salvarHistoricoConferencia
} from "../services/historicoService.js";

import { listarCapitulos } from "../services/capitulosService.js";

import { DIAS_LEITURA } from "../utils/diasSemana.js";

const MODOS_REGRA = [
  {
    value: "normal",
    label: "Normal"
  },
  {
    value: "especial",
    label: "Especial (1 comentário)"
  },
  {
    value: "poesia",
    label: "Poesia (3 comentários)"
  }
];

export default function Conferencia() {
  const [textoFicha, setTextoFicha] = useState("");

  const [diaSemana, setDiaSemana] =
    useState(DIAS_LEITURA[0]);

  const [statusExecucao, setStatusExecucao] =
    useState([]);

  const [plano, setPlano] = useState(null);

  const [resultado, setResultado] =
    useState(null);

  const [carregandoPlano, setCarregandoPlano] =
    useState(false);

  const [verificando, setVerificando] =
    useState(false);

  const [salvando, setSalvando] =
    useState(false);

  const [erro, setErro] = useState("");

  const [mensagem, setMensagem] =
    useState("");

  function adicionarStatus(item) {
    setStatusExecucao((estadoAtual) => [
      item,
      ...estadoAtual
    ]);
  }

  async function gerarPlano() {
    if (!textoFicha.trim()) {
      setErro("Cole a ficha.");
      return;
    }

    try {
      setErro("");
      setMensagem("");
      setResultado(null);

      setStatusExecucao([]);

      setCarregandoPlano(true);

      const planoGerado =
        await prepararPlanoConferencia(
          textoFicha,
          {
            onStatus: adicionarStatus
          }
        );

      setPlano(planoGerado);
    } catch (error) {
      console.error(error);

      setErro(
        error.message ||
          "Não consegui interpretar a ficha."
      );
    } finally {
      setCarregandoPlano(false);
    }
  }

  async function atualizarCapituloManual(
    leituraId,
    capituloId,
    capituloSelecionadoId
  ) {
    try {
      const novoPlano = structuredClone(plano);

      const leitura =
        novoPlano.leituras.find(
          (item) => item.id === leituraId
        );

      if (!leitura) {
        return;
      }

      const capitulo =
        leitura.capitulos.find(
          (item) => item.id === capituloId
        );

      if (!capitulo) {
        return;
      }

      const capitulosAtualizados =
        leitura.capitulosDisponiveis.length
          ? leitura.capitulosDisponiveis
          : await listarCapitulos(
              leitura.obraEncontrada.id
            );

      leitura.capitulosDisponiveis =
        capitulosAtualizados;

      const selecionado =
        capitulosAtualizados.find(
          (item) =>
            item.id ===
            capituloSelecionadoId
        ) || null;

      capitulo.capituloSelecionadoId =
        capituloSelecionadoId;

      capitulo.capituloSelecionado =
        selecionado;

      capitulo.encontrado =
        Boolean(selecionado);

      setPlano(novoPlano);
    } catch (error) {
      console.error(error);

      setErro(
        "Não consegui atualizar o capítulo."
      );
    }
  }

  function atualizarModoRegra(
    leituraId,
    capituloId,
    modo
  ) {
    const novoPlano =
      structuredClone(plano);

    const leitura =
      novoPlano.leituras.find(
        (item) => item.id === leituraId
      );

    if (!leitura) {
      return;
    }

    const capitulo =
      leitura.capitulos.find(
        (item) => item.id === capituloId
      );

    if (!capitulo) {
      return;
    }

    capitulo.modoRegra = modo;

    setPlano(novoPlano);
  }

  function adicionarCapituloManual(
    leituraId
  ) {
    const novoPlano =
      structuredClone(plano);

    const leitura =
      novoPlano.leituras.find(
        (item) => item.id === leituraId
      );

    if (!leitura) {
      return;
    }

    leitura.capitulos.push({
      id: crypto.randomUUID(),
      pedido: {
        tipo: "capitulo",
        numero: null,
        texto: "Capítulo manual",
        titulo: "Capítulo manual"
      },
      capituloSelecionadoId: "",
      capituloSelecionado: null,
      modoRegra: "normal",
      encontrado: false
    });

    setPlano(novoPlano);
  }

  async function iniciarVerificacao() {
    if (!plano) {
      return;
    }

    try {
      setErro("");
      setMensagem("");
      setResultado(null);

      setVerificando(true);

      const resultadoFinal =
        await verificarPlanoConferencia(
          plano,
          {
            onStatus: adicionarStatus
          }
        );

      setResultado(resultadoFinal);
    } catch (error) {
      console.error(error);

      setErro(
        error.message ||
          "Não consegui verificar."
      );
    } finally {
      setVerificando(false);
    }
  }

  async function salvarHistorico() {
    if (!resultado) {
      return;
    }

    try {
      setErro("");
      setMensagem("");

      setSalvando(true);

      await salvarHistoricoConferencia({
        textoFicha,
        resultado,
        diaSemana
      });

      setMensagem(
        "Conferência salva no histórico."
      );
    } catch (error) {
      console.error(error);

      setErro(
        error.message ||
          "Não consegui salvar."
      );
    } finally {
      setSalvando(false);
    }
  }

  const possuiPendencias = useMemo(() => {
    if (!plano) {
      return false;
    }

    return plano.leituras.some((leitura) =>
      leitura.capitulos.some(
        (capitulo) =>
          !capitulo.capituloSelecionado
      )
    );
  }, [plano]);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            Sistema de conferência
          </p>

          <h2>Conferência</h2>
        </div>
      </div>

      {erro ? (
        <p className="form-error">
          {erro}
        </p>
      ) : null}

      {mensagem ? (
        <p className="form-success">
          {mensagem}
        </p>
      ) : null}

      <div className="conferencia-layout">
        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>Ficha</h3>

              <p>
                Cole a ficha do membro para
                preparar a verificação.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field field-full">
              <span>
                Dia da leitura
              </span>

              <select
                value={diaSemana}
                onChange={(event) =>
                  setDiaSemana(
                    event.target.value
                  )
                }
              >
                {DIAS_LEITURA.map((dia) => (
                  <option
                    value={dia}
                    key={dia}
                  >
                    {dia}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-full">
              <span>
                Ficha completa
              </span>

              <textarea
                rows="14"
                value={textoFicha}
                onChange={(event) =>
                  setTextoFicha(
                    event.target.value
                  )
                }
                placeholder="Cole aqui a ficha..."
              />
            </label>

            <div className="form-actions field-full">
              <button
                className="primary-button"
                type="button"
                onClick={gerarPlano}
                disabled={
                  carregandoPlano
                }
              >
                {carregandoPlano
                  ? "Preparando..."
                  : "Preparar conferência"}
              </button>
            </div>
          </div>
        </div>

        {statusExecucao.length > 0 ? (
          <div className="panel">
            <div className="section-title-row">
              <div>
                <h3>
                  Status em tempo real
                </h3>
              </div>
            </div>

            <div className="conferencia-status-list">
              {statusExecucao.map(
                (status) => (
                  <div
                    key={status.id}
                    className={`status-log-card ${status.tipo}`}
                  >
                    <strong>
                      {status.titulo}
                    </strong>

                    <small>
                      {status.detalhe}
                    </small>
                  </div>
                )
              )}
            </div>
          </div>
        ) : null}

        {plano ? (
          <div className="panel">
            <div className="section-title-row">
              <div>
                <h3>
                  Revisão da conferência
                </h3>

                <p>
                  Confirme capítulos e
                  regras antes de iniciar.
                </p>
              </div>
            </div>

            <div className="conferencia-status-list">
              {plano.leituras.map(
                (leitura) => (
                  <div
                    key={leitura.id}
                    className="plano-leitura-card"
                  >
                    <div className="plano-leitura-header">
                      <div>
                        <strong>
                          {leitura
                            .obraEncontrada
                            ?.nome ||
                            leitura.leitura
                              .obra}
                        </strong>

                        <small>
                          {
                            leitura
                              .leitura
                              .capitulosTexto
                          }
                        </small>
                      </div>

                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() =>
                          adicionarCapituloManual(
                            leitura.id
                          )
                        }
                      >
                        + Capítulo
                      </button>
                    </div>

                    <div className="capitulos-selecionados">
                      {leitura.capitulos.map(
                        (capitulo) => (
                          <div
                            key={
                              capitulo.id
                            }
                            className="capitulo-selecao-card"
                          >
                            <div className="capitulo-selecao-top">
                              <div>
                                <strong>
                                  {capitulo
                                    .pedido
                                    ?.texto ||
                                    "Capítulo"}
                                </strong>

                                <small>
                                  {capitulo
                                    .capituloSelecionado
                                    ?.titulo ||
                                    "Não selecionado"}
                                </small>
                              </div>
                            </div>

                            <div className="inline-fields">
                              <label className="field">
                                <span>
                                  Capítulo
                                </span>

                                <select
                                  value={
                                    capitulo.capituloSelecionadoId
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    atualizarCapituloManual(
                                      leitura.id,
                                      capitulo.id,
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                >
                                  <option value="">
                                    Selecionar
                                  </option>

                                  {leitura.capitulosDisponiveis.map(
                                    (
                                      item
                                    ) => (
                                      <option
                                        key={
                                          item.id
                                        }
                                        value={
                                          item.id
                                        }
                                      >
                                        {
                                          item.titulo
                                        }
                                      </option>
                                    )
                                  )}
                                </select>
                              </label>

                              <label className="field">
                                <span>
                                  Regra
                                </span>

                                <select
                                  value={
                                    capitulo.modoRegra
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    atualizarModoRegra(
                                      leitura.id,
                                      capitulo.id,
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                >
                                  {MODOS_REGRA.map(
                                    (
                                      modo
                                    ) => (
                                      <option
                                        key={
                                          modo.value
                                        }
                                        value={
                                          modo.value
                                        }
                                      >
                                        {
                                          modo.label
                                        }
                                      </option>
                                    )
                                  )}
                                </select>
                              </label>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="form-actions">
              <button
                className="primary-button"
                type="button"
                disabled={
                  verificando ||
                  possuiPendencias
                }
                onClick={
                  iniciarVerificacao
                }
              >
                {verificando
                  ? "Verificando..."
                  : "Iniciar verificação"}
              </button>
            </div>
          </div>
        ) : null}

        {resultado ? (
          <div className="panel">
            <div className="section-title-row">
              <div>
                <h3>
                  Resultado final
                </h3>
              </div>
            </div>

            <div className="conferencia-status-list">
              {resultado.resultados.map(
                (
                  leitura,
                  leituraIndex
                ) => (
                  <div
                    key={
                      leituraIndex
                    }
                    className="history-card"
                  >
                    <div className="history-card-header">
                      <div>
                        <h4>
                          {leitura
                            .obraEncontrada
                            ?.nome ||
                            leitura
                              .leitura
                              .obra}
                        </h4>

                        <p>
                          {
                            leitura.statusTexto
                          }
                        </p>
                      </div>
                    </div>

                    <div className="history-work-detail">
                      {leitura.capitulos.map(
                        (
                          capitulo,
                          index
                        ) => (
                          <div
                            key={
                              index
                            }
                            className="history-chapter-card"
                          >
                            <div className="history-chapter-header">
                              <div>
                                <strong>
                                  {
                                    capitulo
                                      .capitulo
                                      ?.titulo
                                  }
                                </strong>

                                <span>
                                  {
                                    capitulo.statusTexto
                                  }
                                </span>
                              </div>
                            </div>

                            <div className="history-chapter-metrics">
                              <div>
                                <span>
                                  Comentários
                                </span>

                                <strong>
                                  {
                                    capitulo.totalComentarios
                                  }
                                  /
                                  {
                                    capitulo.comentariosMinimos
                                  }
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Início
                                </span>

                                <strong>
                                  {
                                    capitulo
                                      .distribuicao
                                      ?.inicio
                                  }
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Meio
                                </span>

                                <strong>
                                  {
                                    capitulo
                                      .distribuicao
                                      ?.meio
                                  }
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Fim
                                </span>

                                <strong>
                                  {
                                    capitulo
                                      .distribuicao
                                      ?.fim
                                  }
                                </strong>
                              </div>
                            </div>

                            {capitulo
                              .motivos
                              ?.length >
                            0 ? (
                              <div className="reason-list">
                                {capitulo.motivos.map(
                                  (
                                    motivo,
                                    motivoIndex
                                  ) => (
                                    <p
                                      key={
                                        motivoIndex
                                      }
                                    >
                                      •{" "}
                                      {
                                        motivo
                                      }
                                    </p>
                                  )
                                )}
                              </div>
                            ) : null}

                            {capitulo
                              .comentarios
                              ?.length >
                            0 ? (
                              <div className="comments-preview">
                                {capitulo.comentarios.map(
                                  (
                                    comentario
                                  ) => (
                                    <div
                                      key={
                                        comentario.id
                                      }
                                      className="comment-preview-card"
                                    >
                                      <strong>
                                        @
                                        {
                                          comentario.usuario
                                        }
                                      </strong>

                                      <p>
                                        {
                                          comentario.texto
                                        }
                                      </p>

                                      <small>
                                        Área:{" "}
                                        {
                                          comentario.area
                                        }
                                      </small>
                                    </div>
                                  )
                                )}
                              </div>
                            ) : null}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="form-actions">
              <button
                className="primary-button"
                type="button"
                onClick={
                  salvarHistorico
                }
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : "Salvar no histórico"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}