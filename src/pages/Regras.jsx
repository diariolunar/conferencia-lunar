import { useEffect, useState } from "react";

import {
  buscarRegraPadrao,
  salvarRegraPadrao
} from "../services/regrasService.js";

const formularioInicial = {
  comentariosPadrao: 6,

  capituloCurtoAtivo: true,
  capituloCurtoLimitePalavras: 500,
  capituloCurtoComentarios: 1,

  capituloLongoAtivo: true,
  capituloLongoLimitePalavras: 4000,
  capituloLongoComentarios: 12,

  palavrasPorMinuto: 250,

  exigirDistribuicao: true,
  minimoInicio: 1,
  minimoMeio: 1,
  minimoFim: 1,

  exigirTempoMinimo: true,
  ignorarMinhaObra: true
};

export default function Regras() {
  const [formulario, setFormulario] = useState(formularioInicial);
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

      const regra = await buscarRegraPadrao();

      setFormulario({
        ...formularioInicial,
        ...regra
      });
    } catch (error) {
      console.error(error);
      setErro("Não consegui carregar as regras.");
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

  function atualizarNumero(campo, valor) {
    setFormulario((estadoAtual) => ({
      ...estadoAtual,
      [campo]: Number(valor)
    }));
  }

  async function salvar(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      await salvarRegraPadrao(formulario);

      setMensagem("Regras salvas com sucesso.");
    } catch (error) {
      console.error(error);
      setErro("Não consegui salvar as regras.");
    } finally {
      setSalvando(false);
    }
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
          <p className="eyebrow">Configuração da conferência</p>
          <h2>Regras de leitura</h2>
        </div>
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}
      {mensagem ? <p className="form-success">{mensagem}</p> : null}

      <form className="panel form-grid" onSubmit={salvar}>
        <div className="field field-full">
          <h3>Comentários mínimos</h3>
          <p className="muted">
            Regra normal usada quando o capítulo não for curto, longo, especial
            ou poesia.
          </p>
        </div>

        <label className="field">
          <span>Comentários padrão</span>
          <input
            type="number"
            min="0"
            value={formulario.comentariosPadrao}
            onChange={(event) =>
              atualizarNumero("comentariosPadrao", event.target.value)
            }
          />
        </label>

        <label className="field">
          <span>Palavras por minuto</span>
          <input
            type="number"
            min="1"
            value={formulario.palavrasPorMinuto}
            onChange={(event) =>
              atualizarNumero("palavrasPorMinuto", event.target.value)
            }
          />
        </label>

        <div className="field field-full">
          <h3>Capítulos curtos</h3>
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={formulario.capituloCurtoAtivo}
            onChange={(event) =>
              atualizarCampo("capituloCurtoAtivo", event.target.checked)
            }
          />
          <span>Ativar regra de capítulo curto</span>
        </label>

        <label className="field">
          <span>Menos de quantas palavras?</span>
          <input
            type="number"
            min="0"
            value={formulario.capituloCurtoLimitePalavras}
            onChange={(event) =>
              atualizarNumero("capituloCurtoLimitePalavras", event.target.value)
            }
          />
        </label>

        <label className="field">
          <span>Comentários exigidos</span>
          <input
            type="number"
            min="0"
            value={formulario.capituloCurtoComentarios}
            onChange={(event) =>
              atualizarNumero("capituloCurtoComentarios", event.target.value)
            }
          />
        </label>

        <div className="field field-full">
          <h3>Capítulos longos</h3>
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={formulario.capituloLongoAtivo}
            onChange={(event) =>
              atualizarCampo("capituloLongoAtivo", event.target.checked)
            }
          />
          <span>Ativar regra de capítulo longo</span>
        </label>

        <label className="field">
          <span>Mais de quantas palavras?</span>
          <input
            type="number"
            min="0"
            value={formulario.capituloLongoLimitePalavras}
            onChange={(event) =>
              atualizarNumero("capituloLongoLimitePalavras", event.target.value)
            }
          />
        </label>

        <label className="field">
          <span>Comentários exigidos</span>
          <input
            type="number"
            min="0"
            value={formulario.capituloLongoComentarios}
            onChange={(event) =>
              atualizarNumero("capituloLongoComentarios", event.target.value)
            }
          />
        </label>

        <div className="field field-full">
          <h3>Distribuição</h3>
          <p className="muted">
            Essa regra vale somente para capítulos normais. Especial e poesia não
            exigem início, meio e fim.
          </p>
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={formulario.exigirDistribuicao}
            onChange={(event) =>
              atualizarCampo("exigirDistribuicao", event.target.checked)
            }
          />
          <span>Exigir comentários no início, meio e fim</span>
        </label>

        <label className="field">
          <span>Mínimo no início</span>
          <input
            type="number"
            min="0"
            value={formulario.minimoInicio}
            onChange={(event) =>
              atualizarNumero("minimoInicio", event.target.value)
            }
          />
        </label>

        <label className="field">
          <span>Mínimo no meio</span>
          <input
            type="number"
            min="0"
            value={formulario.minimoMeio}
            onChange={(event) =>
              atualizarNumero("minimoMeio", event.target.value)
            }
          />
        </label>

        <label className="field">
          <span>Mínimo no fim</span>
          <input
            type="number"
            min="0"
            value={formulario.minimoFim}
            onChange={(event) =>
              atualizarNumero("minimoFim", event.target.value)
            }
          />
        </label>

        <div className="field field-full">
          <h3>Outras regras</h3>
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={formulario.exigirTempoMinimo}
            onChange={(event) =>
              atualizarCampo("exigirTempoMinimo", event.target.checked)
            }
          />
          <span>Exigir tempo mínimo de leitura</span>
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={formulario.ignorarMinhaObra}
            onChange={(event) =>
              atualizarCampo("ignorarMinhaObra", event.target.checked)
            }
          />
          <span>Ignorar leituras marcadas como Minha Obra</span>
        </label>

        <div className="form-actions field-full">
          <button className="primary-button" type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar regras"}
          </button>
        </div>
      </form>
    </section>
  );
}