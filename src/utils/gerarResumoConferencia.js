export function formatarStatus(status = "") {
  const mapa = {
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    ignorado: "Ignorado",
    erro: "Erro",
    parcial: "Parcial",
    "aprovado-manual": "Aprovado manualmente",
    "erro-comentarios": "Erro nos comentários",
    "capitulo-nao-encontrado": "Capítulo não encontrado"
  };

  return mapa[status] || status || "Sem status";
}

export function formatarTempoSegundos(totalSegundos = 0) {
  const segundos = Number(totalSegundos) || 0;

  if (segundos <= 0) {
    return "0s";
  }

  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;

  if (minutos <= 0) {
    return `${resto}s`;
  }

  if (resto <= 0) {
    return `${minutos}min`;
  }

  return `${minutos}min ${resto}s`;
}

export function gerarResumoConferencia(registro = {}) {
  const linhas = [];

  linhas.push("🌙 RESUMO DA CONFERÊNCIA");
  linhas.push("");

  linhas.push(`👤 Leitor: ${registro.nome || "Não informado"}`);
  linhas.push(`🔗 User: ${registro.user || "Não informado"}`);
  linhas.push(`🌘 Sub: ${registro.subNome || "Não informado"}`);
  linhas.push(`📅 Dia: ${registro.diaSemana || "Não informado"}`);
  linhas.push(`📌 Status geral: ${formatarStatus(registro.statusGeral)}`);
  linhas.push("");

  (registro.leituras || []).forEach((leitura, leituraIndex) => {
    linhas.push(`📖 Leitura ${leituraIndex + 1}: ${leitura.obraEncontrada?.nome || leitura.obraInformada || "Obra não informada"}`);
    linhas.push(`Status: ${leitura.statusTexto || formatarStatus(leitura.status)}`);

    if (leitura.motivos?.length) {
      linhas.push("Motivos:");
      leitura.motivos.forEach((motivo) => {
        linhas.push(`- ${motivo}`);
      });
    }

    (leitura.capitulos || []).forEach((capitulo) => {
      linhas.push("");
      linhas.push(`• ${capitulo.titulo || "Capítulo não informado"}`);
      linhas.push(`  Regra: ${capitulo.modoRegra || "normal"}`);
      linhas.push(`  Status: ${capitulo.statusTexto || formatarStatus(capitulo.status)}`);
      linhas.push(`  Comentários: ${capitulo.totalComentarios || 0}/${capitulo.comentariosMinimos || 0}`);
      linhas.push(
        `  Distribuição: início ${capitulo.distribuicao?.inicio || 0}, meio ${capitulo.distribuicao?.meio || 0}, fim ${capitulo.distribuicao?.fim || 0}`
      );
      linhas.push(
        `  Tempo real: ${formatarTempoSegundos(capitulo.tempoReal?.totalSegundos || 0)}`
      );

      if (capitulo.aprovacaoManual?.aprovado) {
        linhas.push(`  Aprovação manual: ${capitulo.aprovacaoManual.motivo}`);
      }

      if (capitulo.motivos?.length) {
        linhas.push("  Pendências:");
        capitulo.motivos.forEach((motivo) => {
          linhas.push(`  - ${motivo}`);
        });
      }
    });

    linhas.push("");
  });

  return linhas.join("\n");
}