import { useEffect, useMemo, useState } from "react";

import {
  buscarConferencias,
  excluirConferencia,
  salvarConferencia
} from "../services/conferenciasService.js";

import { interpretarFicha } from "../utils/interpretarFicha.js";

import {
  buscarObraPorNome,
  listarObras
} from "../services/obrasService.js";

import { listarCapitulos } from "../services/capitulosService.js";

import { conferirFichaCompleta } from "../services/conferenciaService.js";

const DIAS_SEMANA = [
  "Segunda-Feira",
  "Terça-Feira",
  "Quarta-Feira",
  "Quinta-Feira",
  "Sexta-Feira",
  "Sábado",
  "Domingo"
];

export default function Conferencia() {
  const [textoFicha, setTextoFicha] = useState("");
  const [diaSemana, setDiaSemana] = useState(DIAS_SEMANA[0]);

  const [fichaInterpretada, setFichaInterpretada] = useState(null);

  const [obrasBanco, setObrasBanco] = useState([]);

  const [mapeamento, setMapeamento] = useState({});

  const [resultado, setResultado] = useState(null);

  const [carregando, setCarregando] = useState(false);

  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarObras();
  }, []);

  async function carregarObras() {
    try {
      const obras = await listarObras();
      setObrasBanco(obras || []);
    } catch (error) {
      console.error(error);
    }
  }

  function interpretar() {
    try {
      setErro("");
      setResultado(null);

      const ficha = interpretarFicha(textoFicha);

      setFichaInterpretada(ficha);

      const novoMapeamento = {};

      ficha.leituras.forEach((leitura, index) => {
        const obraEncontrada = buscarObraPorNome(
          obrasBanco,
          leitura.obra
        );

        novoMapeamento[index] = {
          obraId: obraEncontrada?.id || "",
          capitulos: []
        };
      });

      setMapeamento(novoMapeamento);
    } catch (error) {
      console.error(error);
      setErro("Não consegui interpretar a ficha.");
    }
  }

  async function alterarObra(leituraIndex, obraId) {
    const capitulos = obraId
      ? await listarCapitulos(obraId)
      : [];

    setMapeamento((estadoAtual) => ({
      ...estadoAtual,
      [leituraIndex]: {
        ...estadoAtual[leituraIndex],
        obraId,
        capitulosDisponiveis: capitulos
      }
    }));
  }

  function alterarCapitulo(leituraIndex, capituloIndex, valor) {
    setMapeamento((estadoAtual) => {
      const leituraAtual = estadoAtual[leituraIndex] || {};

      const capitulos = [...(leituraAtual.capitulos || [])];

      capitulos[capituloIndex] = valor;

      return {
        ...estadoAtual,
        [leituraIndex]: {
          ...leituraAtual,
          capitulos
        }
      };
    });
  }

  function adicionarCapitulo(leituraIndex) {
    setMapeamento((estadoAtual) => {
      const leituraAtual = estadoAtual[leituraIndex] || {};

      return {
        ...estadoAtual,
        [leituraIndex]: {
          ...leituraAtual,
          capitulos: [
            ...(leituraAtual.capitulos || []),
            ""
          ]
        }
      };
    });
  }

  async function iniciarConferencia() {
    try {
      setErro("");
      setCarregando(true);

      const leiturasTratadas = [];

      for (let index = 0; index < fichaInterpretada.leituras.length; index++) {
        const leitura = fichaInterpretada.leituras[index];

        const dadosMapeados = mapeamento[index];

        if (!dadosMapeados?.obraId) {
          continue;
        }

        const obra = obrasBanco.find(
          (item) => item.id === dadosMapeados.obraId
        );

        const capitulosDisponiveis =
          dadosMapeados.capitulosDisponiveis ||
          (await listarCapitulos(dadosMapeados.obraId));

        const capitulosSelecionados = (
          dadosMapeados.capitulos || []
        )
          .map((idSelecionado) =>
            capitulosDisponiveis.find(
              (capitulo) => capitulo.id === idSelecionado
            )
          )
          .filter(Boolean);

        leiturasTratadas.push({
          obra,
          leitura,
          capitulos: capitulosSelecionados
        });
      }

      const resultadoFinal = await conferirFichaCompleta({
        ficha: fichaInterpretada,
        leituras: leiturasTratadas
      });

      setResultado(resultadoFinal);
    } catch (error) {
      console.error(error);
      setErro("Não consegui fazer a conferência.");
    } finally {
      setCarregando(false);
    }
  }

  async function salvarResultado() {
    try {
      if (!resultado) {
        return;
      }

      await salvarConferencia({
        ...resultado,
        diaSemana
      });

      alert("Conferência salva com sucesso.");
    } catch (error) {
      console.error(error);
      alert("Não consegui salvar.");
    }
  }

  async function removerConferencia(id) {
    const confirmar = window.confirm(
      "Deseja excluir essa conferência?"
    );

    if (!confirmar) {
      return;
    }

    try {
      await excluirConferencia(id);
      alert("Conferência removida.");
    } catch (error) {
      console.error(error);
      alert("Não consegui excluir.");
    }
  }

  const historico = useMemo(() => {
    return buscarConferencias();
  }, [resultado]);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Conferência</p>
          <h2>Conferir ficha</h2>
        </div>
      </div>

      <div className="panel">
        <div className="form-grid">
          <label className="field field-full">
            <span>Ficha</span>

            <textarea
              rows="14"
              value={textoFicha}
              onChange={(event) =>
                setTextoFicha(event.target.value)
              }
              placeholder="Cole aqui a ficha..."
            />
          </label>

          <label className="field">
            <span>Dia da semana</span>

            <select
              value={diaSemana}
              onChange={(event) =>
                setDiaSemana(event.target.value)
              }
            >
              {DIAS_SEMANA.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="button-row">
          <button
            className="primary-button"
            type="button"
            onClick={interpretar}
          >
            Interpretar ficha
          </button>
        </div>
      </div>

      {erro ? (
        <div className="panel">
          <p className="form-error">{erro}</p>
        </div>
      ) : null}

      {fichaInterpretada ? (
        <div className="panel">
          <h3>Confirmar leituras</h3>

          {fichaInterpretada.leituras.map(
            (leitura, leituraIndex) => {
              const dadosMapeados =
                mapeamento[leituraIndex] || {};

              const capitulosDisponiveis =
                dadosMapeados.capitulosDisponiveis || [];

              return (
                <div
                  className="conferencia-bloco"
                  key={leituraIndex}
                >
                  <div className="field">
                    <span>Obra</span>

                    <select
                      value={dadosMapeados.obraId || ""}
                      onChange={(event) =>
                        alterarObra(
                          leituraIndex,
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Selecione a obra
                      </option>

                      {obrasBanco.map((obra) => (
                        <option
                          key={obra.id}
                          value={obra.id}
                        >
                          {obra.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field field-full">
                    <span>Capítulos</span>

                    <div className="capitulos-manual-lista">
                      {(dadosMapeados.capitulos || []).map(
                        (capituloSelecionado, capituloIndex) => (
                          <select
                            key={capituloIndex}
                            value={capituloSelecionado}
                            onChange={(event) =>
                              alterarCapitulo(
                                leituraIndex,
                                capituloIndex,
                                event.target.value
                              )
                            }
                          >
                            <option value="">
                              Selecione manualmente
                            </option>

                            {capitulosDisponiveis.map(
                              (opcao) => (
                                <option
                                  key={opcao.id}
                                  value={opcao.id}
                                >
                                  {opcao.titulo}
                                </option>
                              )
                            )}
                          </select>
                        )
                      )}

                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() =>
                          adicionarCapitulo(
                            leituraIndex
                          )
                        }
                      >
                        Adicionar capítulo
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          )}

          <div className="button-row">
            <button
              className="primary-button"
              type="button"
              onClick={iniciarConferencia}
              disabled={carregando}
            >
              {carregando
                ? "Conferindo..."
                : "Iniciar conferência"}
            </button>
          </div>
        </div>
      ) : null}

      {resultado ? (
        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>Resultado</h3>
            </div>

            <button
              className="primary-button"
              type="button"
              onClick={salvarResultado}
            >
              Salvar conferência
            </button>
          </div>

          <pre className="resultado-json">
            {JSON.stringify(resultado, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="panel">
        <h3>Histórico</h3>

        <div className="historico-lista">
          {historico.map((item) => (
            <div
              className="historico-card"
              key={item.id}
            >
              <div>
                <strong>{item.user}</strong>
                <p>{item.diaSemana}</p>
              </div>

              <button
                className="mini-button danger"
                type="button"
                onClick={() =>
                  removerConferencia(item.id)
                }
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
