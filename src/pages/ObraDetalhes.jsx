import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { buscarObraPorId } from "../services/obrasService.js";

import {
  atualizarCapitulo,
  criarCapitulo,
  excluirCapitulo,
  excluirCapitulosImportadosDaObra,
  excluirTodosCapitulosDaObra,
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

function obterDescricaoCapitulo(capitulo = {}) {
  if (capitulo.tipo === "prologo") {
    return "Prólogo";
  }

  if (capitulo.tipo === "extra") {
    return "Extra";
  }

  if (capitulo.tipo === "bonus") {
    return "Bônus";
  }

  if (capitulo.origem === "wattpad") {
    return "Importado do Wattpad";
  }

  if (capitulo.observacoes) {
    return capitulo.observacoes;
  }

  return "";
}

export default function ObraDetalhes() {
  const { obraId } = useParams();

  const [obra, setObra] = useState(null);
  const [capitulos, setCapitulos] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [capituloEditando, setCapituloEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarDados();
  }, [obraId]);

  async function carregarDados() {
    try {
      setCarregando(true);
      setErro("");

      const [obraEncontrada, capitulosEncontrados] =
        await Promise.all([
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
    setMensagem("");
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
    setMensagem("");
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

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const numeroTratado =
        formulario.tipo === "prologo"
          ? 0
          : String(formulario.numero).trim()
            ? Number(formulario.numero)
            : null;

      const ordemTratada = String(formulario.ordem).trim()
        ? Number(formulario.ordem)
        : capituloEditando?.ordem || capitulos.length + 1;

      const dados = {
        ...formulario,
        numero: numeroTratado,
        ordem: ordemTratada,
        origem: capituloEditando?.origem || "manual"
      };

      if (capituloEditando) {
        await atualizarCapitulo(
          obraId,
          capituloEditando.id,
          dados
        );
      } else {
        await criarCapitulo(obraId, dados);
      }

      await carregarDados();
      fecharFormulario();

      setMensagem("Capítulo salvo com sucesso.");
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
      setMensagem("");

      await excluirCapitulo(obraId, capitulo.id);

      await carregarDados();

      setMensagem("Capítulo excluído com sucesso.");
    } catch (error) {
      console.error(error);
      setErro("Não consegui excluir o capítulo.");
    }
  }

  async function limparImportados() {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir apenas os capítulos importados automaticamente do Wattpad nesta obra?"
    );

    if (!confirmar) {
      return;
    }

    try {
      setLimpando(true);
      setErro("");
      setMensagem("");

      const total = await excluirCapitulosImportadosDaObra(obraId);

      await carregarDados();

      setMensagem(
        `${total} capítulo(s) importado(s) foram excluídos.`
      );
    } catch (error) {
      console.error(error);
      setErro("Não consegui limpar os capítulos importados.");
    } finally {
      setLimpando(false);
    }
  }

  async function limparTodos() {
    const confirmar = window.confirm(
      "ATENÇÃO: isso vai apagar TODOS os capítulos desta obra, inclusive os cadastrados manualmente. Deseja continuar?"
    );

    if (!confirmar) {
      return;
    }

    const confirmarNovamente = window.confirm(
      "Confirma mesmo? Essa ação não pode ser desfeita."
    );

    if (!confirmarNovamente) {
      return;
    }

    try {
      setLimpando(true);
      setErro("");
      setMensagem("");

      const total = await excluirTodosCapitulosDaObra(obraId);

      await carregarDados();

      setMensagem(
        `${total} capítulo(s) foram excluídos desta obra.`
      );
    } catch (error) {
      console.error(error);
      setErro("Não consegui limpar todos os capítulos.");
    } finally {
      setLimpando(false);
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
            className="secondary-button"
            type="button"
            onClick={limparImportados}
            disabled={limpando || capitulos.length === 0}
          >
            {limpando ? "Limpando..." : "Limpar importados"}
          </button>

          <button
            className="mini-button danger"
            type="button"
            onClick={limparTodos}
            disabled={limpando || capitulos.length === 0}
          >
            Limpar todos
          </button>

          <button
            className="primary-button"
            type="button"
            onClick={abrirNovoCapitulo}
            disabled={limpando}
          >
            Novo capítulo
          </button>
        </div>
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}
      {mensagem ? <p className="form-success">{mensagem}</p> : null}

      <div className="obra-detail-grid">
        <div className="panel obra-info-panel">
          {obra.capaUrl ? (
            <img
              className="obra-cover-large"
              src={obra.capaUrl}
              alt={obra.nome}
            />
          ) : (
            <div className="obra-cover-large placeholder">📕</div>
          )}

          <div>
            <h3>{obra.nome}</h3>

            <p>
              <strong>Autor:</strong>{" "}
              {obra.autor || "Não informado"}
            </p>

            <p>
              <strong>User:</strong>{" "}
              {obra.userAutor || "Não informado"}
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
                <a
                  href={obra.linkWattpad}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir no Wattpad
                </a>
              </p>
            ) : null}

            {obra.observacoes ? (
              <p>
                <strong>Observações:</strong>{" "}
                {obra.observacoes}
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
              <span>Importados</span>
              <strong>
                {
                  capitulos.filter(
                    (capitulo) => capitulo.origem === "wattpad"
                  ).length
                }
              </strong>
            </div>

            <div>
              <span>Manuais</span>
              <strong>
                {
                  capitulos.filter(
                    (capitulo) => capitulo.origem !== "wattpad"
                  ).length
                }
              </strong>
            </div>

            <div>
              <span>Palavras</span>
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
              <h3>
                {capituloEditando ? "Editar capítulo" : "Novo capítulo"}
              </h3>

              <p>
                Cadastre ou corrija capítulos manualmente. O número é opcional.
              </p>
            </div>

            <button
              className="ghost-button"
              type="button"
              onClick={fecharFormulario}
              disabled={salvando}
            >
              Fechar
            </button>
          </div>

          <form className="form-grid" onSubmit={salvarCapitulo}>
            <label className="field">
              <span>Tipo</span>

              <select
                value={formulario.tipo}
                onChange={(event) =>
                  atualizarCampo("tipo", event.target.value)
                }
                disabled={salvando}
              >
                <option value="capitulo">Capítulo</option>
                <option value="prologo">Prólogo</option>
                <option value="extra">Extra</option>
                <option value="bonus">Bônus</option>
              </select>
            </label>

            <label className="field">
              <span>Número opcional</span>

              <input
                type="number"
                value={formulario.numero}
                onChange={(event) =>
                  atualizarCampo("numero", event.target.value)
                }
                placeholder="Pode deixar vazio"
                disabled={salvando || formulario.tipo === "prologo"}
              />
            </label>

            <label className="field field-full">
              <span>Título do capítulo *</span>

              <input
                type="text"
                value={formulario.titulo}
                onChange={(event) =>
                  atualizarCampo("titulo", event.target.value)
                }
                placeholder="Ex: A Floresta"
                disabled={salvando}
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
                disabled={salvando}
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
                disabled={salvando}
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
                disabled={salvando}
              />
            </label>

            <label className="field">
              <span>Ordem de exibição</span>

              <input
                type="number"
                value={formulario.ordem}
                onChange={(event) =>
                  atualizarCampo("ordem", event.target.value)
                }
                placeholder="Usado para ordenar"
                disabled={salvando}
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
                disabled={salvando}
              />
            </label>

            <div className="form-actions field-full">
              <button
                className="secondary-button"
                type="button"
                onClick={fecharFormulario}
                disabled={salvando}
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
              Use “Limpar importados” para remover capítulos que foram puxados
              errado pelo Wattpad sem apagar os manuais.
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
                  <th>Tempo</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {capitulos.map((capitulo) => {
                  const tempo = estimarTempoLeitura(
                    Number(capitulo.totalPalavras) || 0
                  );

                  const descricao = obterDescricaoCapitulo(capitulo);

                  return (
                    <tr key={capitulo.id}>
                      <td>
                        <strong>{capitulo.titulo}</strong>

                        {descricao ? (
                          <span className="table-subtext">
                            {descricao}
                          </span>
                        ) : null}
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
