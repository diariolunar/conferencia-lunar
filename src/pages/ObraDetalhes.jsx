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
  const [formulario, setFormulario] = useState(formularioInicial);
  const [capituloEditando, setCapituloEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarDados();
  }, [obraId]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");

      const [obraEncontrada, capitulosEncontrados] = await Promise.all([
        buscarObraPorId(obraId),
        listarCapitulos(obraId)
      ]);

      setObra(obraEncontrada);
      setCapitulos(capitulosEncontrados);
    } catch (error) {
      console.error(error);
      setErro("Não consegui carregar os dados da obra.");
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovoCapitulo() {
    setFormulario(formularioInicial);
    setCapituloEditando(null);
    setMostrarFormulario(true);
    setErro("");
  }

  function abrirEdicao(capitulo) {
    setFormulario({
      titulo: capitulo.titulo || "",
      numero: capitulo.numero || "",
      tipo: capitulo.tipo || "capitulo",
      linkWattpad: capitulo.linkWattpad || "",
      totalPalavras: capitulo.totalPalavras || "",
      totalParagrafos: capitulo.totalParagrafos || "",
      ordem: capitulo.ordem || "",
      observacoes: capitulo.observacoes || ""
    });

    setCapituloEditando(capitulo);
    setMostrarFormulario(true);
    setErro("");
  }

  function fecharFormulario() {
    setFormulario(formularioInicial);
    setCapituloEditando(null);
    setMostrarFormulario(false);
    setErro("");
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
      setErro("Informe o título do capítulo.");
      return;
    }

    if (formulario.tipo === "capitulo" && !String(formulario.numero).trim()) {
      setErro("Informe o número do capítulo.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      const dados = {
        ...formulario,
        numero: formulario.tipo === "prologo" ? 0 : formulario.numero,
        ordem:
          formulario.ordem ||
          (formulario.tipo === "prologo" ? 0 : formulario.numero)
      };

      if (capituloEditando) {
        await atualizarCapitulo(obraId, capituloEditando.id, dados);
      } else {
        await criarCapitulo(obraId, dados);
      }

      await carregarDados();
      fecharFormulario();
    } catch (error) {
      console.error(error);
      setErro("Não consegui salvar o capítulo.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerCapitulo(capitulo) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir "${capitulo.titulo}"?`
    );

    if (!confirmar) {
      return;
    }

    try {
      setErro("");
      await excluirCapitulo(obraId, capitulo.id);
      await carregarDados();
    } catch (error) {
      console.error(error);
      setErro("Não consegui excluir o capítulo.");
    }
  }

  if (carregando) {
    return (
      <section className="page">
        <div className="panel">
          <p className="muted">Carregando obra...</p>
        </div>
      </section>
    );
  }

  if (!obra) {
    return (
      <section className="page">
        <div className="panel">
          <h3>Obra não encontrada</h3>
          <p>Não consegui encontrar essa obra no banco de dados.</p>

          <div className="button-row">
            <Link className="secondary-button" to="/obras">
              Voltar para obras
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Detalhes da obra</p>
          <h2>{obra.nome}</h2>
        </div>

        <div className="button-row">
          <Link className="secondary-button" to="/obras">
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

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="obra-detail-grid">
        <div className="panel obra-info-panel">
          {obra.capaUrl ? (
            <img className="obra-cover-large" src={obra.capaUrl} alt={obra.nome} />
          ) : (
            <div className="obra-cover-large placeholder">📕</div>
          )}

          <div>
            <h3>{obra.nome}</h3>

            <p>
              <strong>Autor:</strong> {obra.autor || "Não informado"}
            </p>

            <p>
              <strong>User:</strong> {obra.userAutor || "Não informado"}
            </p>

            <p>
              <strong>Sub:</strong> {obra.sub || "Não informado"}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              <span className={`status-badge ${obra.status || "ativa"}`}>
                {obra.status || "ativa"}
              </span>
            </p>

            {obra.linkWattpad ? (
              <p>
                <strong>Link:</strong>{" "}
                <a href={obra.linkWattpad} target="_blank" rel="noreferrer">
                  Abrir no Wattpad
                </a>
              </p>
            ) : null}

            {obra.observacoes ? (
              <p>
                <strong>Observações:</strong> {obra.observacoes}
              </p>
            ) : null}
          </div>
        </div>

        <div className="panel">
          <h3>Resumo</h3>

          <div className="mini-stats">
            <div>
              <span>Capítulos</span>
              <strong>{capitulos.length}</strong>
            </div>

            <div>
              <span>Palavras cadastradas</span>
              <strong>
                {capitulos
                  .reduce((total, capitulo) => {
                    return total + (Number(capitulo.totalPalavras) || 0);
                  }, 0)
                  .toLocaleString("pt-BR")}
              </strong>
            </div>

            <div>
              <span>Parágrafos</span>
              <strong>
                {capitulos
                  .reduce((total, capitulo) => {
                    return total + (Number(capitulo.totalParagrafos) || 0);
                  }, 0)
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
              <h3>{capituloEditando ? "Editar capítulo" : "Novo capítulo"}</h3>
              <p>
                Cadastre os capítulos que depois serão encontrados quando a ficha
                disser, por exemplo, “5 e 6” ou “Prólogo e 1”.
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

          <form className="form-grid" onSubmit={salvarCapitulo}>
            <label className="field">
              <span>Tipo</span>
              <select
                value={formulario.tipo}
                onChange={(event) => atualizarCampo("tipo", event.target.value)}
              >
                <option value="capitulo">Capítulo</option>
                <option value="prologo">Prólogo</option>
                <option value="extra">Extra</option>
                <option value="bonus">Bônus</option>
              </select>
            </label>

            <label className="field">
              <span>Número</span>
              <input
                type="number"
                value={formulario.numero}
                onChange={(event) => atualizarCampo("numero", event.target.value)}
                placeholder="Ex: 5"
                disabled={formulario.tipo === "prologo"}
              />
            </label>

            <label className="field field-full">
              <span>Título do capítulo *</span>
              <input
                type="text"
                value={formulario.titulo}
                onChange={(event) => atualizarCampo("titulo", event.target.value)}
                placeholder="Ex: Capítulo 5"
              />
            </label>

            <label className="field field-full">
              <span>Link do capítulo no Wattpad</span>
              <input
                type="url"
                value={formulario.linkWattpad}
                onChange={(event) =>
                  atualizarCampo("linkWattpad", event.target.value)
                }
                placeholder="https://www.wattpad.com/..."
              />
            </label>

            <label className="field">
              <span>Total de palavras</span>
              <input
                type="number"
                value={formulario.totalPalavras}
                onChange={(event) =>
                  atualizarCampo("totalPalavras", event.target.value)
                }
                placeholder="Ex: 2500"
              />
            </label>

            <label className="field">
              <span>Total de parágrafos</span>
              <input
                type="number"
                value={formulario.totalParagrafos}
                onChange={(event) =>
                  atualizarCampo("totalParagrafos", event.target.value)
                }
                placeholder="Ex: 80"
              />
            </label>

            <label className="field">
              <span>Ordem de exibição</span>
              <input
                type="number"
                value={formulario.ordem}
                onChange={(event) => atualizarCampo("ordem", event.target.value)}
                placeholder="Ex: 5"
              />
            </label>

            <label className="field field-full">
              <span>Observações</span>
              <textarea
                value={formulario.observacoes}
                onChange={(event) =>
                  atualizarCampo("observacoes", event.target.value)
                }
                placeholder="Alguma observação sobre esse capítulo..."
                rows="4"
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

              <button className="primary-button" type="submit" disabled={salvando}>
                {salvando
                  ? "Salvando..."
                  : capituloEditando
                    ? "Salvar edição"
                    : "Cadastrar capítulo"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="panel">
        <div className="section-title-row">
          <div>
            <h3>Capítulos cadastrados</h3>
            <p>
              Esses capítulos serão usados para bater com o que vier escrito nas
              fichas dos membros.
            </p>
          </div>
        </div>

        {capitulos.length === 0 ? (
          <div className="empty-state compact">
            <h3>Nenhum capítulo cadastrado</h3>
            <p>Clique em “Novo capítulo” para começar.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Capítulo</th>
                  <th>Palavras</th>
                  <th>Parágrafos</th>
                  <th>Tempo estimado</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {capitulos.map((capitulo) => {
                  const tempo = estimarTempoLeitura(
                    Number(capitulo.totalPalavras) || 0
                  );

                  return (
                    <tr key={capitulo.id}>
                      <td>
                        <strong>{capitulo.titulo}</strong>
                        <span className="table-subtext">
                          {capitulo.tipo === "prologo"
                            ? "Prólogo"
                            : `Capítulo ${capitulo.numero || "-"}`}
                        </span>
                      </td>

                      <td>
                        {(Number(capitulo.totalPalavras) || 0).toLocaleString(
                          "pt-BR"
                        )}
                      </td>

                      <td>
                        {(Number(capitulo.totalParagrafos) || 0).toLocaleString(
                          "pt-BR"
                        )}
                      </td>

                      <td>{tempo.texto}</td>

                      <td>
                        <div className="table-actions">
                          {capitulo.linkWattpad ? (
                            <a
                              className="mini-button primary"
                              href={capitulo.linkWattpad}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir
                            </a>
                          ) : null}

                          <button
                            className="mini-button"
                            type="button"
                            onClick={() => abrirEdicao(capitulo)}
                          >
                            Editar
                          </button>

                          <button
                            className="mini-button danger"
                            type="button"
                            onClick={() => removerCapitulo(capitulo)}
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