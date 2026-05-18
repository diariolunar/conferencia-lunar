import { useEffect, useState } from "react";
import {
  buscarRegraPadrao,
  regraInicial,
  salvarRegraPadrao
} from "../services/regrasService.js";

export default function Regras() {
  const [regra, setRegra] = useState(regraInicial);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarRegra();
  }, []);

  async function carregarRegra() {
    try {
      setCarregando(true);
      setErro("");

      const regraEncontrada = await buscarRegraPadrao();
      setRegra(regraEncontrada);
    } catch (error) {
      console.error(error);
      setErro("Não consegui carregar as regras do Firebase.");
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setRegra((estadoAtual) => ({
      ...estadoAtual,
      [campo]: valor
    }));
  }

  function atualizarCheckbox(campo, marcado) {
    setRegra((estadoAtual) => ({
      ...estadoAtual,
      [campo]: marcado
    }));
  }

  async function salvarRegras(event) {
    event.preventDefault();

    if (Number(regra.comentariosPadrao) <= 0) {
      setErro("O mínimo padrão de comentários precisa ser maior que zero.");
      return;
    }

    if (Number(regra.capituloCurtoLimitePalavras) <= 0) {
      setErro("O limite de capítulo curto precisa ser maior que zero.");
      return;
    }

    if (Number(regra.capituloLongoLimitePalavras) <= 0) {
      setErro("O limite de capítulo longo precisa ser maior que zero.");
      return;
    }

    if (
      Number(regra.capituloCurtoLimitePalavras) >=
      Number(regra.capituloLongoLimitePalavras)
    ) {
      setErro(
        "O limite de capítulo curto precisa ser menor que o limite de capítulo longo."
      );
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      await salvarRegraPadrao(regra);

      setMensagem("Regras salvas com sucesso.");
    } catch (error) {
      console.error(error);
      setErro("Não consegui salvar as regras.");
    } finally {
      setSalvando(false);
    }
  }

  function restaurarPadrao() {
    const confirmar = window.confirm(
      "Tem certeza que deseja restaurar as regras padrão?"
    );

    if (!confirmar) {
      return;
    }

    setRegra(regraInicial);
    setMensagem("");
    setErro("");
  }

  if (carregando) {
    return (
      <section className="page">
        <div className="panel">
          <p className="muted">Carregando regras...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Critérios</p>
          <h2>Regras de aprovação</h2>
        </div>

        <button
          className="secondary-button"
          type="button"
          onClick={restaurarPadrao}
          disabled={salvando}
        >
          Restaurar padrão
        </button>
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}
      {mensagem ? <p className="form-success">{mensagem}</p> : null}

      <form className="rules-page" onSubmit={salvarRegras}>
        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>Comentários mínimos</h3>
              <p>
                Aqui você define quantos comentários o leitor precisa fazer de
                acordo com o tamanho do capítulo.
              </p>
            </div>
          </div>

          <div className="rules-grid">
            <label className="field">
              <span>Mínimo padrão de comentários</span>
              <input
                type="number"
                min="1"
                value={regra.comentariosPadrao}
                onChange={(event) =>
                  atualizarCampo("comentariosPadrao", event.target.value)
                }
                disabled={salvando}
              />
            </label>

            <div className="rule-box">
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={regra.capituloCurtoAtivo}
                  onChange={(event) =>
                    atualizarCheckbox("capituloCurtoAtivo", event.target.checked)
                  }
                  disabled={salvando}
                />
                <span>Usar regra para capítulo curto</span>
              </label>

              <div className="rules-grid inner">
                <label className="field">
                  <span>Menos de quantas palavras?</span>
                  <input
                    type="number"
                    min="1"
                    value={regra.capituloCurtoLimitePalavras}
                    onChange={(event) =>
                      atualizarCampo(
                        "capituloCurtoLimitePalavras",
                        event.target.value
                      )
                    }
                    disabled={salvando || !regra.capituloCurtoAtivo}
                  />
                </label>

                <label className="field">
                  <span>Mínimo de comentários</span>
                  <input
                    type="number"
                    min="1"
                    value={regra.capituloCurtoComentarios}
                    onChange={(event) =>
                      atualizarCampo(
                        "capituloCurtoComentarios",
                        event.target.value
                      )
                    }
                    disabled={salvando || !regra.capituloCurtoAtivo}
                  />
                </label>
              </div>
            </div>

            <div className="rule-box">
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={regra.capituloLongoAtivo}
                  onChange={(event) =>
                    atualizarCheckbox("capituloLongoAtivo", event.target.checked)
                  }
                  disabled={salvando}
                />
                <span>Usar regra para capítulo longo</span>
              </label>

              <div className="rules-grid inner">
                <label className="field">
                  <span>Mais de quantas palavras?</span>
                  <input
                    type="number"
                    min="1"
                    value={regra.capituloLongoLimitePalavras}
                    onChange={(event) =>
                      atualizarCampo(
                        "capituloLongoLimitePalavras",
                        event.target.value
                      )
                    }
                    disabled={salvando || !regra.capituloLongoAtivo}
                  />
                </label>

                <label className="field">
                  <span>Mínimo de comentários</span>
                  <input
                    type="number"
                    min="1"
                    value={regra.capituloLongoComentarios}
                    onChange={(event) =>
                      atualizarCampo(
                        "capituloLongoComentarios",
                        event.target.value
                      )
                    }
                    disabled={salvando || !regra.capituloLongoAtivo}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>Distribuição dos comentários</h3>
              <p>
                Define se o leitor precisa comentar no início, no meio e no fim
                do capítulo.
              </p>
            </div>
          </div>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={regra.exigirDistribuicao}
              onChange={(event) =>
                atualizarCheckbox("exigirDistribuicao", event.target.checked)
              }
              disabled={salvando}
            />
            <span>Exigir comentários no início, meio e fim</span>
          </label>

          <div className="rules-grid three">
            <label className="field">
              <span>Mínimo no início</span>
              <input
                type="number"
                min="0"
                value={regra.minimoInicio}
                onChange={(event) =>
                  atualizarCampo("minimoInicio", event.target.value)
                }
                disabled={salvando || !regra.exigirDistribuicao}
              />
            </label>

            <label className="field">
              <span>Mínimo no meio</span>
              <input
                type="number"
                min="0"
                value={regra.minimoMeio}
                onChange={(event) =>
                  atualizarCampo("minimoMeio", event.target.value)
                }
                disabled={salvando || !regra.exigirDistribuicao}
              />
            </label>

            <label className="field">
              <span>Mínimo no fim</span>
              <input
                type="number"
                min="0"
                value={regra.minimoFim}
                onChange={(event) =>
                  atualizarCampo("minimoFim", event.target.value)
                }
                disabled={salvando || !regra.exigirDistribuicao}
              />
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>Tempo de leitura</h3>
              <p>
                O sistema usa a quantidade de palavras do capítulo para estimar
                o tempo mínimo esperado de leitura.
              </p>
            </div>
          </div>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={regra.exigirTempoMinimo}
              onChange={(event) =>
                atualizarCheckbox("exigirTempoMinimo", event.target.checked)
              }
              disabled={salvando}
            />
            <span>Exigir tempo mínimo de leitura</span>
          </label>

          <div className="rules-grid">
            <label className="field">
              <span>Palavras por minuto</span>
              <input
                type="number"
                min="100"
                value={regra.palavrasPorMinuto}
                onChange={(event) =>
                  atualizarCampo("palavrasPorMinuto", event.target.value)
                }
                disabled={salvando || !regra.exigirTempoMinimo}
              />
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>Casos especiais</h3>
              <p>
                Ajustes usados quando a ficha informa “Minha Obra” ou quando o
                capítulo é prólogo.
              </p>
            </div>
          </div>

          <div className="checkbox-list">
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={regra.ignorarMinhaObra}
                onChange={(event) =>
                  atualizarCheckbox("ignorarMinhaObra", event.target.checked)
                }
                disabled={salvando}
              />
              <span>Ignorar obras marcadas como “Minha Obra”</span>
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={regra.prologoSegueRegraNormal}
                onChange={(event) =>
                  atualizarCheckbox(
                    "prologoSegueRegraNormal",
                    event.target.checked
                  )
                }
                disabled={salvando}
              />
              <span>Prólogo segue a mesma regra de tamanho dos capítulos</span>
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>Resumo da regra atual</h3>
              <p>É assim que o sistema vai interpretar os capítulos.</p>
            </div>
          </div>

          <div className="rule-summary">
            <div>
              <strong>Capítulo curto</strong>
              <span>
                Menos de {regra.capituloCurtoLimitePalavras} palavras = mínimo{" "}
                {regra.capituloCurtoComentarios} comentário(s).
              </span>
            </div>

            <div>
              <strong>Capítulo padrão</strong>
              <span>
                De {regra.capituloCurtoLimitePalavras} até{" "}
                {regra.capituloLongoLimitePalavras} palavras = mínimo{" "}
                {regra.comentariosPadrao} comentário(s).
              </span>
            </div>

            <div>
              <strong>Capítulo longo</strong>
              <span>
                Mais de {regra.capituloLongoLimitePalavras} palavras = mínimo{" "}
                {regra.capituloLongoComentarios} comentário(s).
              </span>
            </div>
          </div>

          <div className="form-actions save-rules-actions">
            <button className="primary-button" type="submit" disabled={salvando}>
              {salvando ? "Salvando regras..." : "Salvar regras"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}