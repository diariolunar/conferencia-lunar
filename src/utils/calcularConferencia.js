import { estimarTempoLeitura } from "./estimarTempoLeitura.js";

export function obterComentariosMinimosPorCapitulo(
  capitulo = {},
  regra = {}
) {
  const modoRegra = capitulo.modoRegra || "normal";

  if (modoRegra === "especial") {
    return 1;
  }

  if (modoRegra === "poesia") {
    return 3;
  }

  const palavras = Number(capitulo.totalPalavras) || 0;

  if (
    regra.capituloCurtoAtivo &&
    palavras <= Number(regra.capituloCurtoLimitePalavras || 0)
  ) {
    return Number(regra.capituloCurtoComentarios || 1);
  }

  if (
    regra.capituloLongoAtivo &&
    palavras >= Number(regra.capituloLongoLimitePalavras || 0)
  ) {
    return Number(regra.capituloLongoComentarios || 12);
  }

  return Number(regra.comentariosPadrao || 6);
}

export function calcularDistribuicaoComentarios(
  comentarios = [],
  totalParagrafos = 0
) {
  const distribuicao = {
    inicio: 0,
    meio: 0,
    fim: 0,
    semArea: 0
  };

  const total = Number(totalParagrafos) || 0;

  if (total <= 0) {
    distribuicao.semArea = comentarios.length;
    return distribuicao;
  }

  const limiteInicio = Math.floor(total / 3);
  const limiteFim = Math.floor((total / 3) * 2);

  comentarios.forEach((comentario) => {
    const indice = Number(comentario.indiceParagrafo);

    if (!Number.isFinite(indice)) {
      distribuicao.semArea += 1;
      return;
    }

    if (indice <= limiteInicio) {
      distribuicao.inicio += 1;
      return;
    }

    if (indice <= limiteFim) {
      distribuicao.meio += 1;
      return;
    }

    distribuicao.fim += 1;
  });

  return distribuicao;
}

export function calcularConferenciaCapitulo({
  comentarios = [],
  capitulo = {},
  regra = {},
  tempoRealSegundos = 0,
  tempoEstimadoSegundos = 0
}) {
  const comentariosMinimos =
    obterComentariosMinimosPorCapitulo(capitulo, regra);

  const totalComentarios = comentarios.length;

  const distribuicao = calcularDistribuicaoComentarios(
    comentarios,
    capitulo.totalParagrafos
  );

  const motivos = [];

  if (totalComentarios < comentariosMinimos) {
    motivos.push(
      `Comentários insuficientes (${totalComentarios}/${comentariosMinimos}).`
    );
  }

  const modoRegra = capitulo.modoRegra || "normal";

  const exigeDistribuicao =
    regra.exigirDistribuicao &&
    modoRegra !== "especial" &&
    modoRegra !== "poesia";

  if (exigeDistribuicao) {
    if (distribuicao.inicio < Number(regra.minimoInicio || 0)) {
      motivos.push("Faltou comentário suficiente no início.");
    }

    if (distribuicao.meio < Number(regra.minimoMeio || 0)) {
      motivos.push("Faltou comentário suficiente no meio.");
    }

    if (distribuicao.fim < Number(regra.minimoFim || 0)) {
      motivos.push("Faltou comentário suficiente no fim.");
    }
  }

  if (
    regra.exigirTempoMinimo &&
    tempoEstimadoSegundos > 0 &&
    tempoRealSegundos > 0
  ) {
    const minimoAceito = Math.floor(tempoEstimadoSegundos * 0.25);

    if (tempoRealSegundos < minimoAceito) {
      motivos.push(
        "Tempo de leitura abaixo do mínimo esperado."
      );
    }
  }

  const status = motivos.length > 0 ? "reprovado" : "aprovado";

  return {
    status,
    statusTexto:
      status === "aprovado"
        ? "Leitura aprovada"
        : "Leitura reprovada",
    motivos,
    comentariosMinimos,
    totalComentarios,
    distribuicao
  };
}

export function calcularConferencia({
  comentarios = {},
  capitulo = {},
  regras = {}
}) {
  const listaComentarios = comentarios.comentarios || [];

  const tempoEstimado = estimarTempoLeitura(
    capitulo.totalPalavras,
    regras.palavrasPorMinuto
  );

  const resultado = calcularConferenciaCapitulo({
    comentarios: listaComentarios,
    capitulo,
    regra: regras,
    tempoRealSegundos:
      comentarios.tempoReal?.totalSegundos || 0,
    tempoEstimadoSegundos:
      tempoEstimado.totalSegundos || 0
  });

  return {
    ...resultado,
    comentarios: listaComentarios,
    tempoEstimado,
    tempoReal:
      comentarios.tempoReal || {
        inicio: "",
        fim: "",
        totalSegundos: 0
      }
  };
}