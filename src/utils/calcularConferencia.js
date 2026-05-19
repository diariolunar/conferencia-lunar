export function obterComentariosMinimosPorCapitulo(capitulo = {}, regra = {}) {
  const modoRegra = capitulo.modoRegra || capitulo.tipoRegra || "normal";

  if (modoRegra === "especial") {
    return 1;
  }

  if (modoRegra === "poesia") {
    return 3;
  }

  const totalPalavras = Number(capitulo.totalPalavras) || 0;

  const comentariosPadrao = Number(regra.comentariosPadrao) || 6;

  const capituloCurtoAtivo = regra.capituloCurtoAtivo !== false;
  const capituloCurtoLimitePalavras =
    Number(regra.capituloCurtoLimitePalavras) || 500;
  const capituloCurtoComentarios =
    Number(regra.capituloCurtoComentarios) || 1;

  const capituloLongoAtivo = regra.capituloLongoAtivo !== false;
  const capituloLongoLimitePalavras =
    Number(regra.capituloLongoLimitePalavras) || 4000;
  const capituloLongoComentarios =
    Number(regra.capituloLongoComentarios) || 12;

  if (capituloCurtoAtivo && totalPalavras < capituloCurtoLimitePalavras) {
    return capituloCurtoComentarios;
  }

  if (capituloLongoAtivo && totalPalavras > capituloLongoLimitePalavras) {
    return capituloLongoComentarios;
  }

  return comentariosPadrao;
}

export function calcularConferenciaCapitulo({
  comentarios = [],
  capitulo = {},
  regra = {},
  tempoRealSegundos = 0,
  tempoEstimadoSegundos = 0
}) {
  const comentariosMinimos = obterComentariosMinimosPorCapitulo(capitulo, regra);

  const regraFinal = {
    exigirDistribuicao: true,
    minimoInicio: 1,
    minimoMeio: 1,
    minimoFim: 1,
    exigirTempoMinimo: true,
    ...regra
  };

  const totalComentarios = comentarios.length;

  const distribuicao = comentarios.reduce(
    (acc, comentario) => {
      const area = comentario.area || "semArea";

      if (!acc[area]) {
        acc[area] = 0;
      }

      acc[area] += 1;
      return acc;
    },
    {
      inicio: 0,
      meio: 0,
      fim: 0,
      semArea: 0
    }
  );

  const motivos = [];

  if (totalComentarios < comentariosMinimos) {
    motivos.push(
      `Teve ${totalComentarios} comentário(s), mas o mínimo para esse capítulo era ${comentariosMinimos}.`
    );
  }

  if (regraFinal.exigirDistribuicao) {
    if (distribuicao.inicio < Number(regraFinal.minimoInicio || 0)) {
      motivos.push("Faltou comentário suficiente no início.");
    }

    if (distribuicao.meio < Number(regraFinal.minimoMeio || 0)) {
      motivos.push("Faltou comentário suficiente no meio.");
    }

    if (distribuicao.fim < Number(regraFinal.minimoFim || 0)) {
      motivos.push("Faltou comentário suficiente no fim.");
    }
  }

  const tempoEstimado =
    Number(tempoEstimadoSegundos) ||
    Number(capitulo.tempoEstimadoSegundos) ||
    0;

  const tempoReal =
    Number(tempoRealSegundos) || Number(capitulo.tempoRealSegundos) || 0;

  if (
    regraFinal.exigirTempoMinimo &&
    tempoEstimado > 0 &&
    tempoReal > 0 &&
    tempoReal < tempoEstimado
  ) {
    motivos.push("O tempo de leitura ficou abaixo do tempo estimado.");
  }

  return {
    capitulo,
    comentariosMinimos,
    totalComentarios,
    distribuicao,
    tempoEstimadoSegundos: tempoEstimado,
    tempoRealSegundos: tempoReal,
    status: motivos.length === 0 ? "aprovado" : "reprovado",
    motivos
  };
}
