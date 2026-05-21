import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { buscarObraPorId } from "../services/obrasService.js";

import {
  atualizarCapitulo,
  criarCapitulo,
  excluirCapitulo,
  listarCapitulos
} from "../services/capitulosService.js";

import { estimarTempoLeitura } from "../utils/estimarTempoLeitura.js";

const formularioInicial = {
  titulo: "",
  numero: "",
  tipo: "capitulo",
  linkWattpad: "",
  totalPalavras: "",
  totalParagrafos: "",
  ordem: "",
  observacoes: ""
};

export default function ObraDetalhes() {
  const { obraId } = useParams();

  const [obra, setObra] = useState(null);
  const [capitulos, setCapitulos] = useState([]);

  const [formulario, setFormulario] =
    useState(formularioInicial);

  const [capituloEditando, setCapituloEditando] =
    useState(null);

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarDados();
  }, [obraId]);

  async function carregarDados() {
    try {
      setCarregando(true);

      const [obraEncontrada, capitulosEncontrados] =
        await Promise.all([
          buscarObraPorId(obraId),
          listarCapitulos(obraId)
        ]);

      setObra(obraEncontrada);
      setCapitulos(capitulosEncontrados);
    } catch (error) {
      console.error(error);
      setErro("Não consegui carregar a obra.");
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovoCapitulo() {
    setCapituloEditando(null);
    setFormulario(formularioInicial);
    setMostrarFormulario(true);
  }

  function abrirEdicao(capitulo) {
    setCapituloEditando(capitulo);

    setFormulario({
      titulo: capitulo.titulo || "",
      numero:
        capitulo.numero === null
          ? ""
          : capitulo.numero || "",
      tipo: capitulo.tipo || "capitulo",
      linkWattpad: capitulo.linkWattpad || "",
      totalPalavras:
        capitulo.totalPalavras || "",
      totalParagrafos:
        capitulo.totalParagrafos || "",
      ordem: capitulo.ordem || "",
      observacoes:
        capitulo.observacoes || ""
    });

    setMostrarFormulario(true);
  }

  function fecharFormulario() {
    setCapituloEditando(null);
    setFormulario(formularioInicial);
    setMostrarFormulario(false);
  }

  function atualizarCampo(campo, valor) {
    setFormulario((estadoAtual) => ({
      ...estadoAtual,
      [campo]: valor
    }));
  }

  async function salvarCapitulo(event) {
    event.preventDefault();

    if (!formulario.titulo.trim()) {
      setErro("Informe o título.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      const payload = {
        titulo: formulario.titulo,
        numero:
          formulario.numero === ""
            ? null
            : Number(formulario.numero),
        tipo: formulario.tipo,
        linkWattpad: formulario.linkWattpad,
        totalPalavras:
          Number(formulario.totalPalavras) || 0,
        totalParagrafos:
          Number(formulario.totalParagrafos) || 0,
        ordem:
          Number(formulario.ordem) || 0,
        observacoes:
          formulario.observacoes || ""
      };

      if (capituloEditando) {
        await atualizarCapitulo(
          obraId,
          capituloEditando.id,
          payload
        );
      } else {
        await criarCapitulo(obraId, payload);
      }

      fecharFormulario();
      await carregarDados();
    } catch (error) {
      console.error(error);
      setErro("Não consegui salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerCapitulo(capitulo) {
    const confirmar = window.confirm(
      `Excluir "${capitulo.titulo}"?`
    );

    if (!confirmar) {
      return;
    }

    try {
      await excluirCapitulo(obraId, capitulo.id);
      await carregarDados();
    } catch (error) {
      console.error(error);
      setErro("Não consegui excluir.");
    }
  }

  if (carregando) {
    return (
      <section className="page">
        <div className="panel">
          <p className="muted">
            Carregando obra...
          </p>
        </div>
      </section>
    );
  }

  if (!obra) {
    return (
      <section className="page">
        <div className="panel">
          <h3>Obra não encontrada</h3>

          <Link
            className="secondary-button"
            to="/obras"
          >
            Voltar
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">
            Detalhes da obra
          </p>

          <h2>{obra.nome}</h2>
        </div>

        <div className="button-row">
          <Link
            className="secondary-button"
            to="/obras"
          >
            Voltar
          </Link>

          <button
            className="primary-button"
            type="button"
            onClick={abrirNovoCapitulo}
          >
            Novo capítulo
          </button>
        </div>
      </div>

      {erro ? (
        <p className="form-error">{erro}</p>
      ) : null}

      <div className="obra-detail-grid">
        <div className="panel obra-info-panel">
          {obra.capaUrl ? (
            <img
              className="obra-cover-large"
              src={obra.capaUrl}
              alt={obra.nome}
            />
          ) : (
            <div className="obra-cover-large placeholder">
              📕
            </div>
          )}

          <div>
            <h3>{obra.nome}</h3>

            <p>
              <strong>Autor:</strong>{" "}
              {obra.autor || "Não informado"}
            </p>

            <p>
              <strong>User:</strong>{" "}
              {obra.userAutor ||
                "Não informado"}
            </p>

            <p>
              <strong>Sub:</strong>{" "}
              {obra.sub || "Não informado"}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              <span
                className={`status-badge ${obra.status}`}
              >
                {obra.status}
              </span>
            </p>
          </div>
        </div>

        <div className="panel">
          <h3>Resumo</h3>

          <div className="mini-stats">
            <div>
              <span>Capítulos</span>

              <strong>
                {capitulos.length}
              </strong>
            </div>

            <div>
              <span>Palavras</span>

              <strong>
                {capitulos
                  .reduce(
                    (acc, item) =>
                      acc +
                      (Number(
                        item.totalPalavras
                      ) || 0),
                    0
                  )
                  .toLocaleString("pt-BR")}
              </strong>
            </div>

            <div>
              <span>Parágrafos</span>

              <strong>
                {capitulos
                  .reduce(
                    (acc, item) =>
                      acc +
                      (Number(
                        item.totalParagrafos
                      ) || 0),
                    0
                  )
                  .toLocaleString("pt-BR")}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {mostrarFormulario ? (
        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>
                {capituloEditando
                  ? "Editar capítulo"
                  : "Novo capítulo"}
              </h3>

              <p>
                Capítulos podem ter apenas
                título sem numeração.
              </p>
            </div>

            <button
              className="ghost-button"
              type="button"
              onClick={fecharFormulario}
            >
              Fechar
            </button>
          </div>

          <form
            className="form-grid"
            onSubmit={salvarCapitulo}
          >
            <label className="field">
              <span>Tipo</span>

              <select
                value={formulario.tipo}
                onChange={(event) =>
                  atualizarCampo(
                    "tipo",
                    event.target.value
                  )
                }
              >
                <option value="capitulo">
                  Capítulo
                </option>

                <option value="prologo">
                  Prólogo
                </option>

                <option value="extra">
                  Especial
                </option>

                <option value="poesia">
                  Poesia
                </option>
              </select>
            </label>

            <label className="field">
              <span>Número (opcional)</span>

              <input
                type="number"
                value={formulario.numero}
                onChange={(event) =>
                  atualizarCampo(
                    "numero",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="field field-full">
              <span>Título *</span>

              <input
                type="text"
                value={formulario.titulo}
                onChange={(event) =>
                  atualizarCampo(
                    "titulo",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="field field-full">
              <span>Link Wattpad</span>

              <input
                type="url"
                value={formulario.linkWattpad}
                onChange={(event) =>
                  atualizarCampo(
                    "linkWattpad",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="field">
              <span>Total palavras</span>

              <input
                type="number"
                value={formulario.totalPalavras}
                onChange={(event) =>
                  atualizarCampo(
                    "totalPalavras",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="field">
              <span>Total parágrafos</span>

              <input
                type="number"
                value={formulario.totalParagrafos}
                onChange={(event) =>
                  atualizarCampo(
                    "totalParagrafos",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="field">
              <span>Ordem</span>

              <input
                type="number"
                value={formulario.ordem}
                onChange={(event) =>
                  atualizarCampo(
                    "ordem",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="field field-full">
              <span>Observações</span>

              <textarea
                rows="4"
                value={formulario.observacoes}
                onChange={(event) =>
                  atualizarCampo(
                    "observacoes",
                    event.target.value
                  )
                }
              />
            </label>

            <div className="form-actions field-full">
              <button
                className="secondary-button"
                type="button"
                onClick={fecharFormulario}
              >
                Cancelar
              </button>

              <button
                className="primary-button"
                type="submit"
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="panel">
        <div className="section-title-row">
          <div>
            <h3>Capítulos cadastrados</h3>
          </div>
        </div>

        {capitulos.length === 0 ? (
          <div className="empty-state compact">
            <h3>
              Nenhum capítulo cadastrado
            </h3>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Palavras</th>
                  <th>Parágrafos</th>
                  <th>Tempo</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {capitulos.map((capitulo) => {
                  const tempo =
                    estimarTempoLeitura(
                      capitulo.totalPalavras
                    );

                  return (
                    <tr key={capitulo.id}>
                      <td>
                        <strong>
                          {capitulo.titulo}
                        </strong>

                        <span className="table-subtext">
                          {capitulo.tipo}
                        </span>
                      </td>

                      <td>
                        {Number(
                          capitulo.totalPalavras
                        ).toLocaleString("pt-BR")}
                      </td>

                      <td>
                        {Number(
                          capitulo.totalParagrafos
                        ).toLocaleString("pt-BR")}
                      </td>

                      <td>{tempo.texto}</td>

                      <td>
                        <div className="table-actions">
                          <button
                            className="mini-button"
                            type="button"
                            onClick={() =>
                              abrirEdicao(
                                capitulo
                              )
                            }
                          >
                            Editar
                          </button>

                          <button
                            className="mini-button danger"
                            type="button"
                            onClick={() =>
                              removerCapitulo(
                                capitulo
                              )
                            }
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}