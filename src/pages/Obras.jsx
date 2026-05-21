import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  criarObra,
  excluirObra,
  listarObras
} from "../services/obrasService.js";

const formularioInicial = {
  nome: "",
  autor: "",
  userAutor: "",
  sub: "",
  linkWattpad: "",
  capaUrl: "",
  status: "ativa",
  observacoes: ""
};

export default function Obras() {
  const [obras, setObras] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarObras();
  }, []);

  async function carregarObras() {
    try {
      setCarregando(true);

      const lista = await listarObras();
      setObras(lista);
    } catch (error) {
      console.error(error);
      setErro("Não consegui carregar as obras.");
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((estadoAtual) => ({
      ...estadoAtual,
      [campo]: valor
    }));
  }

  async function salvarObra(event) {
    event.preventDefault();

    if (!formulario.nome.trim()) {
      setErro("Informe o nome da obra.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      await criarObra(formulario);

      setFormulario(formularioInicial);
      setMostrarFormulario(false);

      await carregarObras();
    } catch (error) {
      console.error(error);
      setErro("Não consegui salvar a obra.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerObra(id) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir esta obra?"
    );

    if (!confirmar) {
      return;
    }

    try {
      await excluirObra(id);
      await carregarObras();
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
          <h2>Obras cadastradas</h2>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={() => setMostrarFormulario((estado) => !estado)}
        >
          {mostrarFormulario ? "Fechar" : "Nova obra"}
        </button>
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}

      {mostrarFormulario ? (
        <div className="panel">
          <form className="form-grid" onSubmit={salvarObra}>
            <label className="field field-full">
              <span>Nome da obra *</span>

              <input
                type="text"
                value={formulario.nome}
                onChange={(event) =>
                  atualizarCampo("nome", event.target.value)
                }
                placeholder="Nome da obra"
              />
            </label>

            <label className="field">
              <span>Autor</span>

              <input
                type="text"
                value={formulario.autor}
                onChange={(event) =>
                  atualizarCampo("autor", event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>User do autor</span>

              <input
                type="text"
                value={formulario.userAutor}
                onChange={(event) =>
                  atualizarCampo("userAutor", event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Sub</span>

              <input
                type="text"
                value={formulario.sub}
                onChange={(event) =>
                  atualizarCampo("sub", event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Status</span>

              <select
                value={formulario.status}
                onChange={(event) =>
                  atualizarCampo("status", event.target.value)
                }
              >
                <option value="ativa">Ativa</option>
                <option value="pausada">Pausada</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </label>

            <label className="field field-full">
              <span>Link Wattpad</span>

              <input
                type="url"
                value={formulario.linkWattpad}
                onChange={(event) =>
                  atualizarCampo("linkWattpad", event.target.value)
                }
              />
            </label>

            <label className="field field-full">
              <span>URL da capa</span>

              <input
                type="url"
                value={formulario.capaUrl}
                onChange={(event) =>
                  atualizarCampo("capaUrl", event.target.value)
                }
              />
            </label>

            <label className="field field-full">
              <span>Observações</span>

              <textarea
                rows="4"
                value={formulario.observacoes}
                onChange={(event) =>
                  atualizarCampo("observacoes", event.target.value)
                }
              />
            </label>

            <div className="form-actions field-full">
              <button
                className="primary-button"
                type="submit"
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar obra"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {carregando ? (
        <div className="panel">
          <p className="muted">Carregando obras...</p>
        </div>
      ) : obras.length === 0 ? (
        <div className="panel empty-state">
          <h3>Nenhuma obra cadastrada</h3>
          <p>Cadastre sua primeira obra.</p>
        </div>
      ) : (
        <div className="card-grid">
          {obras.map((obra) => (
            <article className="card" key={obra.id}>
              {obra.capaUrl ? (
                <img
                  className="obra-cover"
                  src={obra.capaUrl}
                  alt={obra.nome}
                />
              ) : (
                <div className="obra-cover placeholder">📕</div>
              )}

              <div className="card-content">
                <div>
                  <h3>{obra.nome}</h3>

                  <p>{obra.autor || "Autor não informado"}</p>

                  <span className={`status-badge ${obra.status}`}>
                    {obra.status}
                  </span>
                </div>

                <div className="card-actions">
                  <Link
                    className="mini-button primary"
                    to={`/obras/${obra.id}`}
                  >
                    Abrir
                  </Link>

                  <button
                    className="mini-button danger"
                    type="button"
                    onClick={() => removerObra(obra.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}