import { useEffect, useState } from "react";

import {
  atualizarSub,
  criarSub,
  excluirSub,
  listarSubs
} from "../services/subsService.js";

const estadoInicial = {
  nome: "",
  codigo: "",
  adm: "",
  status: "ativo"
};

export default function Subs() {
  const [subs, setSubs] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [editando, setEditando] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarSubs();
  }, []);

  async function carregarSubs() {
    try {
      setCarregando(true);
      setErro("");

      const lista = await listarSubs();
      setSubs(lista);
    } catch (error) {
      console.error(error);
      setErro("Não consegui carregar os subs.");
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

  function limparFormulario() {
    setFormulario(estadoInicial);
    setEditando(null);
    setErro("");
  }

  function editarSub(sub) {
    setFormulario({
      nome: sub.nome || "",
      codigo: sub.codigo || "",
      adm: sub.adm || "",
      status: sub.status || "ativo"
    });

    setEditando(sub);
    setErro("");
    setMensagem("");
  }

  async function salvarSub(event) {
    event.preventDefault();

    if (!formulario.nome.trim()) {
      setErro("Informe o nome do sub.");
      return;
    }

    if (!formulario.codigo.trim()) {
      setErro("Informe o código do sub.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      if (editando) {
        await atualizarSub(editando.id, formulario);
        setMensagem("Sub atualizado com sucesso.");
      } else {
        await criarSub(formulario);
        setMensagem("Sub criado com sucesso.");
      }

      limparFormulario();
      await carregarSubs();
    } catch (error) {
      console.error(error);
      setErro("Não consegui salvar o sub.");
    } finally {
      setSalvando(false);
    }
  }

  async function removerSub(sub) {
    const confirmar = window.confirm(`Tem certeza que deseja excluir "${sub.nome}"?`);

    if (!confirmar) {
      return;
    }

    try {
      setErro("");
      setMensagem("");

      await excluirSub(sub.id);
      await carregarSubs();

      setMensagem("Sub excluído com sucesso.");
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
          <h2>Subs</h2>
        </div>
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}
      {mensagem ? <p className="form-success">{mensagem}</p> : null}

      <div className="two-columns">
        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>{editando ? "Editar sub" : "Novo sub"}</h3>
              <p>
                Cadastre os subs para organizar o histórico por sub, membro e dia
                da semana.
              </p>
            </div>
          </div>

          <form className="form-grid" onSubmit={salvarSub}>
            <label className="field">
              <span>Nome do sub *</span>
              <input
                type="text"
                value={formulario.nome}
                onChange={(event) => atualizarCampo("nome", event.target.value)}
                placeholder="Ex: A-6 Trono Profano"
                disabled={salvando}
              />
            </label>

            <label className="field">
              <span>Código *</span>
              <input
                type="text"
                value={formulario.codigo}
                onChange={(event) => atualizarCampo("codigo", event.target.value)}
                placeholder="Ex: A-6"
                disabled={salvando}
              />
            </label>

            <label className="field">
              <span>ADM</span>
              <input
                type="text"
                value={formulario.adm}
                onChange={(event) => atualizarCampo("adm", event.target.value)}
                placeholder="Ex: Mayke"
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
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>

            <div className="form-actions field-full">
              {editando ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={limparFormulario}
                  disabled={salvando}
                >
                  Cancelar edição
                </button>
              ) : null}

              <button className="primary-button" type="submit" disabled={salvando}>
                {salvando
                  ? "Salvando..."
                  : editando
                    ? "Salvar edição"
                    : "Criar sub"}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>Subs cadastrados</h3>
              <p>Esses subs serão usados para organizar o histórico.</p>
            </div>
          </div>

          {carregando ? (
            <p className="muted">Carregando subs...</p>
          ) : subs.length === 0 ? (
            <div className="empty-state compact">
              <h3>Nenhum sub cadastrado</h3>
              <p>Cadastre o primeiro sub para começar.</p>
            </div>
          ) : (
            <div className="subs-list">
              {subs.map((sub) => (
                <article className="sub-card" key={sub.id}>
                  <div>
                    <span>{sub.codigo || "Sem código"}</span>
                    <h4>{sub.nome}</h4>
                    <p>ADM: {sub.adm || "Não informado"}</p>

                    <strong
                      className={`status-pill ${
                        sub.status === "ativo" ? "success" : "danger"
                      }`}
                    >
                      {sub.status || "ativo"}
                    </strong>
                  </div>

                  <div className="sub-actions">
                    <button
                      className="mini-button"
                      type="button"
                      onClick={() => editarSub(sub)}
                    >
                      Editar
                    </button>

                    <button
                      className="mini-button danger"
                      type="button"
                      onClick={() => removerSub(sub)}
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}