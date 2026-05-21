import { useEffect, useState } from "react";

import {
  criarSub,
  excluirSub,
  listarSubs
} from "../services/subsService.js";

const formularioInicial = {
  codigo: "",
  nome: "",
  adm: "",
  descricao: ""
};

export default function Subs() {
  const [subs, setSubs] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarSubs();
  }, []);

  async function carregarSubs() {
    try {
      const lista = await listarSubs();
      setSubs(lista);
    } catch (error) {
      console.error(error);
      setErro("Não consegui carregar os subs.");
    }
  }

  function atualizarCampo(campo, valor) {
    setFormulario((estadoAtual) => ({
      ...estadoAtual,
      [campo]: valor
    }));
  }

  async function salvarSub(event) {
    event.preventDefault();

    if (!formulario.nome.trim()) {
      setErro("Informe o nome do sub.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");

      await criarSub(formulario);

      setFormulario(formularioInicial);
      setMostrarFormulario(false);

      await carregarSubs();
    } catch (error) {
      console.error(error);
      setErro("Não consegui salvar o sub.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerSub(id) {
    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este sub?"
    );

    if (!confirmar) {
      return;
    }

    try {
      await excluirSub(id);
      await carregarSubs();
    } catch (error) {
      console.error(error);
      setErro("Não consegui excluir o sub.");
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Organização</p>
          <h2>Subs cadastrados</h2>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={() => setMostrarFormulario((estado) => !estado)}
        >
          {mostrarFormulario ? "Fechar" : "Novo sub"}
        </button>
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}

      {mostrarFormulario ? (
        <div className="panel">
          <form className="form-grid" onSubmit={salvarSub}>
            <label className="field">
              <span>Código</span>

              <input
                type="text"
                value={formulario.codigo}
                onChange={(event) =>
                  atualizarCampo("codigo", event.target.value)
                }
                placeholder="A-6"
              />
            </label>

            <label className="field">
              <span>ADM</span>

              <input
                type="text"
                value={formulario.adm}
                onChange={(event) =>
                  atualizarCampo("adm", event.target.value)
                }
              />
            </label>

            <label className="field field-full">
              <span>Nome do sub *</span>

              <input
                type="text"
                value={formulario.nome}
                onChange={(event) =>
                  atualizarCampo("nome", event.target.value)
                }
              />
            </label>

            <label className="field field-full">
              <span>Descrição</span>

              <textarea
                rows="4"
                value={formulario.descricao}
                onChange={(event) =>
                  atualizarCampo("descricao", event.target.value)
                }
              />
            </label>

            <div className="form-actions field-full">
              <button
                className="primary-button"
                type="submit"
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Salvar sub"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {subs.length === 0 ? (
        <div className="panel empty-state">
          <h3>Nenhum sub cadastrado</h3>
          <p>Cadastre seu primeiro sub.</p>
        </div>
      ) : (
        <div className="card-grid">
          {subs.map((sub) => (
            <article className="card" key={sub.id}>
              <div className="card-content">
                <div>
                  <span className="eyebrow">{sub.codigo || "SUB"}</span>

                  <h3>{sub.nome}</h3>

                  <p>{sub.adm || "ADM não informado"}</p>

                  {sub.descricao ? (
                    <small>{sub.descricao}</small>
                  ) : null}
                </div>

                <div className="card-actions">
                  <button
                    className="mini-button danger"
                    type="button"
                    onClick={() => removerSub(sub.id)}
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