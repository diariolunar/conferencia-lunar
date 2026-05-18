import { useState } from "react";
import { interpretarFicha } from "../utils/interpretarFicha.js";
import { conferirFichaComBanco } from "../services/conferenciaService.js";
import { salvarHistoricoConferencia } from "../services/historicoService.js";
import { formatarTempo } from "../utils/estimarTempoLeitura.js";
import { gerarResumoConferencia } from "../utils/gerarResumoConferencia.js";

const DIAS_SEMANA = [
  "Segunda-Feira",
  "Terça-Feira",
  "Quarta-Feira",
  "Quinta-Feira",
  "Sexta-Feira",
  "Sábado",
  "Domingo"
];

function montarRegistroTemporario({ resultado, diaSemana }) {
  const ficha = resultado.ficha || {};

  return {
    subNome: ficha.sub || "",
    diaSemana,
    nome: ficha.nome || "",
    user: ficha.user || "",
    adm: ficha.adm || "",
    statusGeral: definirStatusGeral(resultado.resultados || []),
    totalLeituras: resultado.resultados?.length || 0,
    leituras: (resultado.resultados || []).map((item) => ({
      obraInformada: item.leitura?.obra || "",
      capitulosTexto: item.leitura?.capitulosTexto || "",
      minhaObra: Boolean(item.leitura?.minhaObra),
      feedbackOferecido: Boolean(item.leitura?.feedbackOferecido),
      status: item.status || "",
      statusTexto: item.statusTexto || "",
      tipo: item.tipo || "",
      pontuacaoObra: Number(item.pontuacaoObra) || 0,
      motivos: item.motivos || [],
      obraEncontrada: item.obraEncontrada
        ? {
            id: item.obraEncontrada.id || "",
            nome: item.obraEncontrada.nome || "",
            autor: item.obraEncontrada.autor || "",
            userAutor: item.obraEncontrada.userAutor || "",
            linkWattpad: item.obraEncontrada.linkWattpad || "",
            capaUrl: item.obraEncontrada.capaUrl || ""
          }
        : null,
      capitulos: (item.capitulos || []).map((capituloResultado) => {
        const capitulo = capituloResultado.capitulo || {};

        return {
          pedido: capituloResultado.pedido || null,
          encontrado: Boolean(capituloResultado.encontrado),
          status: capituloResultado.status || "",
          statusTexto: capituloResultado.statusTexto || "",
          titulo: capitulo.titulo || "",
          numero: capitulo.numero ?? null,
          tipo: capitulo.tipo || "",
          linkWattpad: capitulo.linkWattpad || "",
          totalPalavras: Number(capitulo.totalPalavras) || 0,
          totalParagrafos: Number(capitulo.totalParagrafos) || 0,
          comentariosMinimos: Number(capituloResultado.comentariosMinimos) || 0,
          totalComentarios: Number(capituloResultado.totalComentarios) || 0,
          distribuicao: capituloResultado.distribuicao || {
            inicio: 0,
            meio: 0,
            fim: 0,
            semArea: 0
          },
          tempoEstimado: capituloResultado.tempoEstimado || {
            texto: "0 minuto",
            totalSegundos: 0
          },
          tempoReal: capituloResultado.tempoReal || {
            inicio: "",
            fim: "",
            totalSegundos: 0
          },
          motivos: capituloResultado.motivos || [],
          comentarios: capituloResultado.comentarios || []
        };
      })
    }))
  };
}

function definirStatusGeral(resultados = []) {
  if (!resultados.length) {
    return "sem-resultados";
  }

  const validos = resultados.filter((item) => item.status !== "ignorado");

  if (!validos.length) {
    return "ignorado";
  }

  const temErro = validos.some(
    (item) =>
      item.status === "erro" ||
      item.status === "parcial" ||
      item.status === "reprovado"
  );

  return temErro ? "reprovado" : "aprovado";
}

function formatarDataDuplicado(valor) {
  if (!valor) {
    return "data não encontrada";
  }

  try {
    if (typeof valor.toDate === "function") {
      return valor.toDate().toLocaleString("pt-BR");
    }

    return new Date(valor).toLocaleString("pt-BR");
  } catch {
    return "data não encontrada";
  }
}

export default function Conferencia() {
  const [textoFicha, setTextoFicha] = useState("");
  const [diaSemana, setDiaSemana] = useState("");
  const [fichaInterpretada, setFichaInterpretada] = useState(null);
  const [resultadoConferencia, setResultadoConferencia] = useState(null);
  const [registroTemporario, setRegistroTemporario] = useState(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [conferindo, setConferindo] = useState(false);
  const [salvandoDuplicado, setSalvandoDuplicado] = useState(false);
  const [duplicadoDetectado, setDuplicadoDetectado] = useState(null);
  const [statusAoVivo, setStatusAoVivo] = useState([]);

  function adicionarStatusAoVivo(etapa) {
    setStatusAoVivo((listaAtual) => [...listaAtual, etapa].slice(-80));
  }

  function handleInterpretarFicha() {
    setErro("");
    setMensagem("");
    setResultadoConferencia(null);
    setRegistroTemporario(null);
    setDuplicadoDetectado(null);
    setStatusAoVivo([]);

    if (!textoFicha.trim()) {
      setFichaInterpretada(null);
      setErro("Cole uma ficha antes de tentar interpretar.");
      return;
    }

    const resultado = interpretarFicha(textoFicha);

    if (!resultado.user && resultado.leituras.length === 0) {
      setFichaInterpretada(null);
      setErro(
        "Não consegui encontrar USER, OBRA/GRIMÓRIO/MUNDO ou CAPÍTULOS LIDOS nessa ficha."
      );
      return;
    }

    setFichaInterpretada(resultado);
    setMensagem("Ficha interpretada com sucesso.");
  }

  async function salvarResultadoNoHistorico(resultado, permitirDuplicado = false) {
    await salvarHistoricoConferencia({
      textoFicha,
      resultado,
      diaSemana,
      permitirDuplicado
    });
  }

  async function handleConferirLeituras() {
    setErro("");
    setMensagem("");
    setDuplicadoDetectado(null);
    setRegistroTemporario(null);
    setStatusAoVivo([]);

    if (!diaSemana) {
      setErro("Selecione o dia da semana antes de conferir.");
      return;
    }

    if (!textoFicha.trim()) {
      setErro("Cole uma ficha antes de conferir.");
      return;
    }

    try {
      setConferindo(true);

      adicionarStatusAoVivo({
        id: "inicio",
        tipo: "andamento",
        titulo: "Iniciando conferência",
        detalhe: "Preparando leitura da ficha.",
        horario: new Date().toISOString()
      });

      const resultado = await conferirFichaComBanco(textoFicha, {
        onStatus: adicionarStatusAoVivo
      });

      const registro = montarRegistroTemporario({ resultado, diaSemana });

      setFichaInterpretada(resultado.ficha);
      setResultadoConferencia(resultado);
      setRegistroTemporario(registro);

      try {
        adicionarStatusAoVivo({
          id: "salvando-historico",
          tipo: "andamento",
          titulo: "Salvando no histórico",
          detalhe: "Verificando duplicidade antes de salvar.",
          horario: new Date().toISOString()
        });

        await salvarResultadoNoHistorico(resultado, false);

        adicionarStatusAoVivo({
          id: "historico-salvo",
          tipo: "sucesso",
          titulo: "Histórico salvo",
          detalhe: "Conferência salva sem duplicidade.",
          horario: new Date().toISOString()
        });

        setMensagem("Conferência concluída e salva no histórico do sub.");
      } catch (error) {
        console.error(error);

        if (error.codigo === "duplicado-exato") {
          setDuplicadoDetectado({
            tipo: "duplicado-exato",
            mensagem:
              "Essa conferência inteira já foi salva no histórico.",
            registro: error.registroDuplicado || null,
            conflitos: []
          });

          adicionarStatusAoVivo({
            id: "duplicado-exato",
            tipo: "erro",
            titulo: "Duplicidade detectada",
            detalhe: "Essa conferência inteira já existe no histórico.",
            horario: new Date().toISOString()
          });

          setMensagem(
            "Conferência concluída, mas não foi salva porque já existe igual no histórico."
          );
        } else if (error.codigo === "capitulo-duplicado") {
          setDuplicadoDetectado({
            tipo: "capitulo-duplicado",
            mensagem:
              "Já existe conferência salva para um ou mais capítulos desse membro no mesmo dia.",
            registro: null,
            conflitos: error.conflitos || []
          });

          adicionarStatusAoVivo({
            id: "capitulo-duplicado",
            tipo: "erro",
            titulo: "Capítulo duplicado detectado",
            detalhe:
              "Um ou mais capítulos já foram conferidos para esse membro nesse dia.",
            horario: new Date().toISOString()
          });

          setMensagem(
            "Conferência concluída, mas não foi salva porque há capítulo duplicado no mesmo dia."
          );
        } else {
          adicionarStatusAoVivo({
            id: "erro-salvar",
            tipo: "erro",
            titulo: "Erro ao salvar histórico",
            detalhe: error.message || "Erro desconhecido.",
            horario: new Date().toISOString()
          });

          setMensagem("Conferência concluída, mas não consegui salvar no histórico.");
        }
      }
    } catch (error) {
      console.error(error);

      adicionarStatusAoVivo({
        id: "erro-geral",
        tipo: "erro",
        titulo: "Erro geral na conferência",
        detalhe: error.message || "Erro desconhecido.",
        horario: new Date().toISOString()
      });

      setErro(
        "Não consegui conferir a ficha com o banco de dados. Verifique se as obras, capítulos e regras estão cadastrados."
      );
    } finally {
      setConferindo(false);
    }
  }

  async function handleSalvarDuplicadoMesmoAssim() {
    if (!resultadoConferencia) {
      return;
    }

    try {
      setSalvandoDuplicado(true);
      setErro("");

      adicionarStatusAoVivo({
        id: "salvando-duplicado",
        tipo: "andamento",
        titulo: "Salvando duplicado",
        detalhe: "Salvando conferência mesmo com alerta de duplicidade.",
        horario: new Date().toISOString()
      });

      await salvarResultadoNoHistorico(resultadoConferencia, true);

      adicionarStatusAoVivo({
        id: "duplicado-salvo",
        tipo: "sucesso",
        titulo: "Duplicado salvo",
        detalhe: "Conferência duplicada salva por decisão manual.",
        horario: new Date().toISOString()
      });

      setDuplicadoDetectado(null);
      setMensagem("Conferência duplicada salva mesmo assim no histórico.");
    } catch (error) {
      console.error(error);
      setErro("Não consegui salvar a conferência duplicada.");
    } finally {
      setSalvandoDuplicado(false);
    }
  }

  async function copiarResumo() {
    if (!registroTemporario) {
      setErro("Faça uma conferência antes de copiar o resumo.");
      return;
    }

    const resumo = gerarResumoConferencia(registroTemporario);

    try {
      await navigator.clipboard.writeText(resumo);
      setMensagem("Resumo copiado para a área de transferência.");
    } catch (error) {
      console.error(error);
      setErro("Não consegui copiar automaticamente. Selecione o resumo manualmente.");
    }
  }

  function limparTela() {
    setTextoFicha("");
    setDiaSemana("");
    setFichaInterpretada(null);
    setResultadoConferencia(null);
    setRegistroTemporario(null);
    setDuplicadoDetectado(null);
    setStatusAoVivo([]);
    setErro("");
    setMensagem("");
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Verificação em lote</p>
          <h2>Conferência por ficha</h2>
        </div>

        <button className="secondary-button" type="button" onClick={limparTela}>
          Limpar
        </button>
      </div>

      {erro ? <p className="form-error">{erro}</p> : null}
      {mensagem ? <p className="form-success">{mensagem}</p> : null}

      {duplicadoDetectado ? (
        <AlertaDuplicidade
          duplicadoDetectado={duplicadoDetectado}
          salvandoDuplicado={salvandoDuplicado}
          onSalvarMesmoAssim={handleSalvarDuplicadoMesmoAssim}
        />
      ) : null}

      <div className="two-columns">
        <div className="panel">
          <h3>Ficha do membro</h3>

          <p className="muted">
            Selecione o dia da semana, cole a ficha inteira e acompanhe a
            conferência em tempo real.
          </p>

          <label className="field field-full">
            <span>Dia da semana *</span>
            <select
              value={diaSemana}
              onChange={(event) => setDiaSemana(event.target.value)}
              disabled={conferindo}
            >
              <option value="">Selecione o dia</option>
              {DIAS_SEMANA.map((dia) => (
                <option value={dia} key={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </label>

          <textarea
            className="textarea"
            placeholder="Cole aqui a ficha do sub..."
            rows="16"
            value={textoFicha}
            onChange={(event) => setTextoFicha(event.target.value)}
            disabled={conferindo}
          />

          <div className="button-row">
            <button
              className="secondary-button"
              type="button"
              onClick={handleInterpretarFicha}
              disabled={conferindo}
            >
              Interpretar ficha
            </button>

            <button
              className="primary-button"
              type="button"
              onClick={handleConferirLeituras}
              disabled={conferindo}
            >
              {conferindo ? "Conferindo ao vivo..." : "Conferir leituras"}
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={copiarResumo}
              disabled={!registroTemporario || conferindo}
            >
              Copiar resumo
            </button>
          </div>
        </div>

        <div className="panel">
          <h3>Status ao vivo</h3>
          <StatusAoVivo statusAoVivo={statusAoVivo} conferindo={conferindo} />
        </div>
      </div>

      {fichaInterpretada ? (
        <div className="panel">
          <h3>Prévia da interpretação</h3>
          <PreviewFicha fichaInterpretada={fichaInterpretada} />
        </div>
      ) : null}

      {registroTemporario ? (
        <div className="panel">
          <div className="section-title-row">
            <div>
              <h3>Resumo copiável</h3>
              <p>Use o botão “Copiar resumo” para mandar o resultado no grupo.</p>
            </div>
          </div>

          <pre className="copy-summary-box">
            {gerarResumoConferencia(registroTemporario)}
          </pre>
        </div>
      ) : null}

      {resultadoConferencia ? (
        <ResultadoConferencia resultado={resultadoConferencia} diaSemana={diaSemana} />
      ) : null}
    </section>
  );
}

function AlertaDuplicidade({
  duplicadoDetectado,
  salvandoDuplicado,
  onSalvarMesmoAssim
}) {
  return (
    <div className="duplicate-alert">
      <div>
        <strong>
          {duplicadoDetectado.tipo === "capitulo-duplicado"
            ? "Capítulo duplicado detectado"
            : "Conferência duplicada detectada"}
        </strong>

        <p>{duplicadoDetectado.mensagem}</p>

        {duplicadoDetectado.registro ? (
          <small>
            Registro existente: {formatarDataDuplicado(duplicadoDetectado.registro.criadoEm)}
          </small>
        ) : null}

        {duplicadoDetectado.conflitos?.length > 0 ? (
          <div className="duplicate-conflicts">
            {duplicadoDetectado.conflitos.map((conflito, index) => (
              <p key={`${conflito.registro?.id || index}`}>
                • Registro de {formatarDataDuplicado(conflito.registro?.criadoEm)} tem{" "}
                {conflito.capitulosRepetidos.length} capítulo(s) repetido(s).
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <button
        className="secondary-button"
        type="button"
        onClick={onSalvarMesmoAssim}
        disabled={salvandoDuplicado}
      >
        {salvandoDuplicado ? "Salvando..." : "Salvar mesmo assim"}
      </button>
    </div>
  );
}

function StatusAoVivo({ statusAoVivo, conferindo }) {
  if (statusAoVivo.length === 0) {
    return (
      <div className="live-status-empty">
        <p>Nenhuma conferência em andamento.</p>
      </div>
    );
  }

  return (
    <div className="live-status-box">
      {conferindo ? (
        <div className="live-status-running">
          <span />
          Conferência em andamento...
        </div>
      ) : null}

      <div className="live-status-list">
        {statusAoVivo.map((item) => (
          <div className={`live-status-item ${item.tipo}`} key={item.id}>
            <span className="live-status-dot" />
            <div>
              <strong>{item.titulo}</strong>
              <p>{item.detalhe}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewFicha({ fichaInterpretada }) {
  return (
    <div className="preview-result">
      <div className="preview-section">
        <span>Sub</span>
        <strong>{fichaInterpretada.sub || "Não encontrado"}</strong>
      </div>

      <div className="preview-section">
        <span>Nome</span>
        <strong>{fichaInterpretada.nome || "Não encontrado"}</strong>
      </div>

      <div className="preview-section">
        <span>User</span>
        <strong>{fichaInterpretada.user || "Não encontrado"}</strong>
      </div>

      <div className="preview-section">
        <span>ADM</span>
        <strong>{fichaInterpretada.adm || "Não encontrado"}</strong>
      </div>

      <div className="preview-divider" />

      <h4>Leituras encontradas</h4>

      {fichaInterpretada.leituras.length === 0 ? (
        <p className="muted">Nenhuma leitura encontrada.</p>
      ) : (
        <div className="reading-list">
          {fichaInterpretada.leituras.map((leitura, index) => (
            <article className="reading-card" key={`${leitura.obra}-${index}`}>
              <div className="reading-card-header">
                <span>Obra {index + 1}</span>

                {leitura.minhaObra ? (
                  <strong className="status-pill neutral">Minha Obra</strong>
                ) : (
                  <strong className="status-pill pending">Conferir</strong>
                )}
              </div>

              <h5>{leitura.obra || "Obra não encontrada"}</h5>

              <p>
                <strong>Capítulos informados:</strong>{" "}
                {leitura.capitulosTexto || "Não informado"}
              </p>

              {leitura.capitulos.length > 0 ? (
                <div className="chapter-tags">
                  {leitura.capitulos.map((capitulo, capIndex) => (
                    <span key={`${capitulo.texto}-${capIndex}`}>
                      {capitulo.texto}
                    </span>
                  ))}
                </div>
              ) : leitura.minhaObra ? (
                <p className="muted">Marcada como Minha Obra.</p>
              ) : (
                <p className="form-error">
                  Não consegui identificar os capítulos dessa obra.
                </p>
              )}

              <p>
                <strong>Feedback:</strong>{" "}
                {leitura.feedbackOferecido ? "Marcado ✅" : "Não marcado"}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultadoConferencia({ resultado, diaSemana }) {
  const totalLeituras = resultado.resultados.length;
  const aprovadas = resultado.resultados.filter(
    (item) => item.status === "aprovado"
  ).length;
  const ignoradas = resultado.resultados.filter(
    (item) => item.status === "ignorado"
  ).length;
  const reprovadas = resultado.resultados.filter(
    (item) => item.status === "reprovado" || item.status === "erro"
  ).length;

  return (
    <div className="panel">
      <div className="section-title-row">
        <div>
          <h3>Resultado da conferência</h3>
          <p>
            Resultado salvo em: <strong>{diaSemana || "Dia não informado"}</strong>
          </p>
        </div>
      </div>

      <div className="conference-summary-grid">
        <div>
          <span>Total de leituras</span>
          <strong>{totalLeituras}</strong>
        </div>

        <div>
          <span>Aprovadas</span>
          <strong>{aprovadas}</strong>
        </div>

        <div>
          <span>Ignoradas</span>
          <strong>{ignoradas}</strong>
        </div>

        <div>
          <span>Reprovadas</span>
          <strong>{reprovadas}</strong>
        </div>
      </div>

      <div className="conference-result-list">
        {resultado.resultados.map((item, index) => (
          <article
            className={`conference-card status-${item.status}`}
            key={`${item.leitura.obra}-${index}`}
          >
            <div className="conference-card-header">
              <div>
                <span>Leitura {index + 1}</span>
                <h4>{item.leitura.obra || "Obra não informada"}</h4>
              </div>

              <strong className={`status-pill ${definirClasseStatus(item.status)}`}>
                {item.statusTexto}
              </strong>
            </div>

            {item.obraEncontrada ? (
              <div className="matched-work">
                {item.obraEncontrada.capaUrl ? (
                  <img
                    src={item.obraEncontrada.capaUrl}
                    alt={`Capa de ${item.obraEncontrada.nome}`}
                  />
                ) : (
                  <div className="cover-placeholder">📕</div>
                )}

                <div>
                  <strong>{item.obraEncontrada.nome}</strong>
                  <span>
                    Compatibilidade: {item.pontuacaoObra}% ·{" "}
                    {item.obraEncontrada.autor || "Autor não informado"}
                  </span>
                </div>
              </div>
            ) : null}

            {item.motivos.length > 0 ? (
              <div className="reason-list">
                {item.motivos.map((motivo, motivoIndex) => (
                  <p key={`${motivo}-${motivoIndex}`}>• {motivo}</p>
                ))}
              </div>
            ) : null}

            {item.capitulos.length > 0 ? (
              <div className="chapter-result-list">
                {item.capitulos.map((capituloResultado, capIndex) => (
                  <CapituloResultado
                    key={`${capituloResultado.pedido?.texto}-${capIndex}`}
                    capituloResultado={capituloResultado}
                  />
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function CapituloResultado({ capituloResultado }) {
  if (!capituloResultado.encontrado) {
    return (
      <div className="chapter-result-card error">
        <div>
          <span>Pedido na ficha</span>
          <strong>{capituloResultado.pedido?.texto || "Não identificado"}</strong>
        </div>

        <p>Capítulo não encontrado na obra cadastrada.</p>
      </div>
    );
  }

  const capitulo = capituloResultado.capitulo;
  const tempoRealTexto = formatarTempo(
    Math.floor((Number(capituloResultado.tempoReal.totalSegundos) || 0) / 60),
    (Number(capituloResultado.tempoReal.totalSegundos) || 0) % 60
  );

  return (
    <div className={`chapter-result-card ${capituloResultado.status}`}>
      <div className="chapter-result-title">
        <div>
          <span>
            {capitulo.tipo === "prologo"
              ? "Prólogo"
              : `Capítulo ${capitulo.numero}`}
          </span>
          <strong>{capitulo.titulo}</strong>
        </div>

        <strong className={`status-pill ${definirClasseStatus(capituloResultado.status)}`}>
          {capituloResultado.statusTexto}
        </strong>
      </div>

      <div className="chapter-result-metrics">
        <div>
          <span>Comentários</span>
          <strong>
            {capituloResultado.totalComentarios}/
            {capituloResultado.comentariosMinimos}
          </strong>
        </div>

        <div>
          <span>Início</span>
          <strong>{capituloResultado.distribuicao.inicio}</strong>
        </div>

        <div>
          <span>Meio</span>
          <strong>{capituloResultado.distribuicao.meio}</strong>
        </div>

        <div>
          <span>Fim</span>
          <strong>{capituloResultado.distribuicao.fim}</strong>
        </div>

        <div>
          <span>Tempo estimado</span>
          <strong>{capituloResultado.tempoEstimado.texto}</strong>
        </div>

        <div>
          <span>Tempo real</span>
          <strong>{tempoRealTexto}</strong>
        </div>

        <div>
          <span>Palavras</span>
          <strong>
            {(Number(capitulo.totalPalavras) || 0).toLocaleString("pt-BR")}
          </strong>
        </div>

        <div>
          <span>Parágrafos</span>
          <strong>
            {(Number(capitulo.totalParagrafos) || 0).toLocaleString("pt-BR")}
          </strong>
        </div>
      </div>

      {capituloResultado.motivos.length > 0 ? (
        <div className="reason-list">
          {capituloResultado.motivos.map((motivo, index) => (
            <p key={`${motivo}-${index}`}>• {motivo}</p>
          ))}
        </div>
      ) : null}

      {capituloResultado.comentarios.length > 0 ? (
        <details className="comments-details">
          <summary>Ver comentários encontrados</summary>

          <div className="comments-list">
            {capituloResultado.comentarios.map((comentario) => (
              <div className="comment-item" key={comentario.id}>
                <strong>
                  {comentario.area.toUpperCase()} ·{" "}
                  {comentario.data
                    ? new Date(comentario.data).toLocaleString("pt-BR")
                    : "Sem data"}
                </strong>
                <p>{comentario.texto}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {capitulo.linkWattpad ? (
        <a
          className="mini-button primary"
          href={capitulo.linkWattpad}
          target="_blank"
          rel="noreferrer"
        >
          Abrir capítulo
        </a>
      ) : null}
    </div>
  );
}

function definirClasseStatus(status) {
  if (status === "aprovado" || status === "aprovado-manual") {
    return "success";
  }

  if (status === "ignorado") {
    return "neutral";
  }

  if (status === "reprovado") {
    return "danger";
  }

  if (status === "erro" || status === "erro-comentarios") {
    return "danger";
  }

  if (status === "parcial") {
    return "pending";
  }

  return "pending";
}