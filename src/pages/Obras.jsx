import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  atualizarCapaObra,
  atualizarObra,
  criarObra,
  excluirObra,
  listarObras
} from "../services/obrasService.js";

import { salvarCapitulosImportados } from "../services/capitulosService.js";
import { buscarDadosDaObraWattpad } from "../services/wattpadService.js";
import { sincronizarTodasAsObrasComWattpad } from "../services/sincronizacaoWattpadService.js";

const formularioInicial = {
  nome: "",
  autor: "",
  userAutor: "",
  linkWattpad: "",
  status: "ativa",
  observacoes: ""
};

export default function Obras() {
  const [obras, setObras] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [obraEditando, setObraEditando] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarObras();
  }, []);

  async function carregarObras() {
    try {
      setCarregando(true);
      setErro("");

      const lista = await listarObras();
      setObras(lista);
    } catch (error) {
      console.error(error);
      setErro(
        "Não consegui carregar as obras. Verifique se o Firebase está configurado."
      );
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovaObra() {
    setFormulario(formularioInicial);
    setObraEditando(null);
    setMostrarFormulario(true);
    setErro("");
    setMensagem("");
  }

  function abrirEdicao(obra) {
    setFormulario({
      nome: obra.nome || "",
      autor: obra.autor || "",
      userAutor: obra.userAutor || "",
      linkWattpad: obra.linkWattpad || "",
      status: obra.status || "ativa",
      observacoes: obra.observacoes || ""
    });

    setObraEditando(obra);
    setMostrarFormulario(true);
    setErro("");
    setMensagem("");
  }

  function fecharFormulario() {
    setFormulario(formularioInicial);
    setObraEditando(null);
    setMostrarFormulario(false);
    setErro("");
  }

  function atualizarCampo(campo, valor) {
    setFormulario((estadoAtual) => ({
      ...estadoAtual,
      [campo]: valor
    }));
  }

  async function importarDadosAutomaticamente(obraId, linkWattpad) {
    setMensagem("Obra salva. Buscando capa e capítulos do Wattpad...");

    const dadosWattpad = await buscarDadosDaObraWattpad(linkWattpad);

    if (dadosWattpad.obra?.capaUrl) {
      await atualizarCapaObra(obraId, dadosWattpad.obra.capaUrl);
    }

    if (!dadosWattpad.capitulos.length) {
      setMensagem(
        "Obra salva, mas nenhum capítulo foi encontrado automaticamente."
      );
      return;
    }

    await salvarCapitulosImportados(obraId, dadosWattpad.capitulos);

    const capaTexto = dadosWattpad.obra?.capaUrl
      ? "Capa encontrada"
      : "Capa não encontrada";

    setMensagem(
      `Obra salva. ${capaTexto}. ${dadosWattpad.capitulos.length} capítulo(s) importado(s) automaticamente.`
    );
  }

  async function salvarObra(event) {
    event.preventDefault();

    if (!formulario.nome.trim()) {
      setErro("Informe o nome da obra.");
      return;
    }

    if (!formulario.linkWattpad.trim()) {
      setErro("Informe o link da obra no Wattpad.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      if (obraEditando) {
        await atualizarObra(obraEditando.id, formulario);
        setMensagem("Obra atualizada com sucesso.");
      } else {
        const obraCriada = await criarObra(formulario);

        try {
          await importarDadosAutomaticamente(obraCriada.id, formulario.linkWattpad);
        } catch (error) {
          console.error(error);
          setMensagem("");
          setErro(
            `A obra foi salva, mas não consegui buscar capa/capítulos automaticamente. Motivo: ${error.message}`
          );
        }
      }

      await carregarObras();

      setFormulario(formularioInicial);
      setObraEditando(null);
      setMostrarFormulario(false);
    } catch (error) {
      console.error(error);
      setErro(
        "Não consegui salvar a obra. Verifique se o Firebase está configurado corretamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function sincronizarTodas() {
    try {
      setSincronizando(true);
      setErro("");
      setMensagem("Atualizando todas as obras cadastradas pelo Wattpad...");

      const resumo = await sincronizarTodasAsObrasComWattpad(obras);

      setMensagem(
        `Atualização concluída: ${resumo.criados} capítulo(s) novo(s), ${resumo.atualizados} atualizado(s), ${resumo.ignoradas} obra(s) ignorada(s), ${resumo.erros} erro(s).`
      );

      await carregarObras();
    } catch (error) {
      console.error(error);
      setMensagem("");
      setErro(`Não consegui atualizar todas as obras. Motivo: ${error.message}`);
    } finally {
      setSincronizando(false);
    }
  }

  async function removerObra(obra) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir a obra "${obra.nome}"?`
    );

    if (!confirmar) {
      return;
    }

    try {
      setErro("");
      setMensagem("");
      await excluirObra(obra.id);
      await carregarObras();
      setMensagem("Obra excluída com sucesso.");
    } catch (error) {
      console.error(error);
      setErro("Não consegui excluir a obra.");
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Biblioteca</p>
          <h2>Obras</h2>
        </div>

        <div className="button-row">
          <button
            className="secondary-button"
            type="button"
            onClick={sincronizarTodas}
            disabled={sincronizando || salvando || carregando || obras.length === 0}
          >
            {sincronizando ? "Atualizando..." : "Atualizar todas do Wattpad"}
          </button>

          <button
            className="primary-button"
            type="button"
            onClick={abrirNovaObra}
            disabled={sincronizando}
          >
            Nova obra
          </button>
        </div>
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}
      {mensagem ? <p className="form-success">{mensagem}</p> : null}

      {mostrarFormulario ? (
        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>{obraEditando ? "Editar obra" : "Nova obra"}</h3>
              <p>
                Cadastre a obra pelo link do Wattpad. Depois de salvar, o
                sistema tenta buscar a capa e os capítulos automaticamente.
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

          <form className="form-grid" onSubmit={salvarObra}>
            <label className="field">
              <span>Nome da obra *</span>
              <input
                type="text"
                value={formulario.nome}
                onChange={(event) => atualizarCampo("nome", event.target.value)}
                placeholder="Ex: Cidade de Alfas"
                disabled={salvando}
              />
            </label>

            <label className="field">
              <span>Autor</span>
              <input
                type="text"
                value={formulario.autor}
                onChange={(event) => atualizarCampo("autor", event.target.value)}
                placeholder="Ex: Emily Oliveira"
                disabled={salvando}
              />
            </label>

            <label className="field">
              <span>User do autor no Wattpad</span>
              <input
                type="text"
                value={formulario.userAutor}
                onChange={(event) =>
                  atualizarCampo("userAutor", event.target.value)
                }
                placeholder="Ex: EmilyOliveira150"
                disabled={salvando}
              />
            </label>

            <label className="field">
              <span>Status</span>
              <select
                value={formulario.status}
                onChange={(event) => atualizarCampo("status", event.target.value)}
                disabled={salvando}
              >
                <option value="ativa">Ativa</option>
                <option value="pausada">Pausada</option>
                <option value="finalizada">Finalizada</option>
                <option value="inativa">Inativa</option>
              </select>
            </label>

            <label className="field field-full">
              <span>Link da obra no Wattpad *</span>
              <input
                type="url"
                value={formulario.linkWattpad}
                onChange={(event) =>
                  atualizarCampo("linkWattpad", event.target.value)
                }
                placeholder="https://www.wattpad.com/story/..."
                disabled={salvando || Boolean(obraEditando)}
              />
            </label>

            <label className="field field-full">
              <span>Observações</span>
              <textarea
                value={formulario.observacoes}
                onChange={(event) =>
                  atualizarCampo("observacoes", event.target.value)
                }
                placeholder="Alguma regra ou anotação sobre essa obra..."
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

              <button className="primary-button" type="submit" disabled={salvando}>
                {salvando
                  ? obraEditando
                    ? "Salvando..."
                    : "Salvando e buscando dados..."
                  : obraEditando
                    ? "Salvar edição"
                    : "Cadastrar obra"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="panel">
        <div className="section-title-row">
          <div>
            <h3>Obras cadastradas</h3>
            <p>
              Ao cadastrar uma obra nova, a capa e os capítulos serão buscados
              automaticamente no Wattpad. O botão acima atualiza todas as obras já cadastradas.
            </p>
          </div>
        </div>

        {carregando ? (
          <p className="muted">Carregando obras...</p>
        ) : obras.length === 0 ? (
          <div className="empty-state compact">
            <h3>Nenhuma obra cadastrada ainda</h3>
            <p>Clique em “Nova obra” para começar.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Obra</th>
                  <th>Autor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {obras.map((obra) => (
                  <tr key={obra.id}>
                    <td>
                      <div className="obra-cell">
                        {obra.capaUrl ? (
                          <img src={obra.capaUrl} alt={`Capa de ${obra.nome}`} />
                        ) : (
                          <div className="cover-placeholder">📕</div>
                        )}

                        <div>
                          <strong>{obra.nome}</strong>
                          <span>{obra.linkWattpad}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong>{obra.autor || "Não informado"}</strong>
                      <span className="table-subtext">
                        {obra.userAutor || "Sem user"}
                      </span>
                    </td>

                    <td>
                      <span className={`status-badge ${obra.status || "ativa"}`}>
                        {obra.status || "ativa"}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        <Link
                          className="mini-button primary"
                          to={`/obras/${obra.id}`}
                        >
                          Capítulos
                        </Link>

                        <button
                          className="mini-button"
                          type="button"
                          onClick={() => abrirEdicao(obra)}
                          disabled={sincronizando}
                        >
                          Editar
                        </button>

                        <button
                          className="mini-button danger"
                          type="button"
                          onClick={() => removerObra(obra)}
                          disabled={sincronizando}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
