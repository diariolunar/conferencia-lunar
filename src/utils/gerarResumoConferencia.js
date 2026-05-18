export function gerarResumoConferencia(registro = {}) {
  const linhas = [];

  linhas.push(`🌙 CONFERÊNCIA LUNAR`);
  linhas.push("");
  linhas.push(`📌 Sub: ${registro.subNome || "Não informado"}`);
  linhas.push(`👤 Membro: ${registro.nome || "Não informado"}`);
  linhas.push(`🔖 User: ${registro.user || "Não informado"}`);
  linhas.push(`📅 Dia: ${registro.diaSemana || "Não informado"}`);
  linhas.push(`📊 Status geral: ${formatarStatus(registro.statusGeral)}`);
  linhas.push("");

  if (!registro.leituras?.length) {
    linhas.push("Nenhuma leitura registrada.");
    return linhas.join("\n");
  }

  registro.leituras.forEach((leitura, index) => {
    linhas.push(`━━━━━━━━━━━━━━━━━━━━`);
    linhas.push(`📕 Leitura ${index + 1}: ${leitura.obraEncontrada?.nome || leitura.obraInformada || "Obra não informada"}`);
    linhas.push(`📌 Status: ${leitura.statusTexto || formatarStatus(leitura.status)}`);

    if (leitura.minhaObra) {
      linhas.push(`⚪ Minha Obra — ignorada`);
      linhas.push("");
      return;
    }

    if (leitura.motivos?.length) {
      linhas.push(`⚠️ Motivos:`);
      leitura.motivos.forEach((motivo) => {
        linhas.push(`• ${motivo}`);
      });
    }

    if (leitura.capitulos?.length) {
      linhas.push("");

      leitura.capitulos.forEach((capitulo) => {
        const emoji = capitulo.status === "aprovado" ? "✅" : capitulo.status === "aprovado-manual" ? "🟦" : "❌";

        linhas.push(`${emoji} ${capitulo.tipo === "prologo" ? "Prólogo" : `Capítulo ${capitulo.numero || "-"}`}: ${capitulo.titulo || "Não encontrado"}`);
        linhas.push(`• Comentários: ${capitulo.totalComentarios || 0}/${capitulo.comentariosMinimos || 0}`);
        linhas.push(`• Distribuição: início ${capitulo.distribuicao?.inicio || 0} | meio ${capitulo.distribuicao?.meio || 0} | fim ${capitulo.distribuicao?.fim || 0}`);
        linhas.push(`• Tempo estimado: ${capitulo.tempoEstimado?.texto || "0 minuto"}`);
        linhas.push(`• Tempo real: ${formatarTempoSegundos(capitulo.tempoReal?.totalSegundos || 0)}`);

        if (capitulo.aprovacaoManual?.aprovado) {
          linhas.push(`• Aprovado manualmente: ${capitulo.aprovacaoManual.motivo || "Sem motivo informado"}`);
        }

        if (capitulo.motivos?.length) {
          linhas.push(`• Pendências:`);
          capitulo.motivos.forEach((motivo) => {
            linhas.push(`  - ${motivo}`);
          });
        }

        linhas.push("");
      });
    }
  });

  return linhas.join("\n").trim();
}

export function formatarStatus(status = "") {
  const mapa = {
    aprovado: "Aprovado ✅",
    reprovado: "Reprovado ❌",
    ignorado: "Ignorado ⚪",
    parcial: "Parcial ⚠️",
    erro: "Erro ❌",
    "aprovado-manual": "Aprovado manualmente 🟦",
    "sem-resultados": "Sem resultados"
  };

  return mapa[status] || status || "Indefinido";
}

export function formatarTempoSegundos(totalSegundos = 0) {
  const segundosTotal = Number(totalSegundos) || 0;

  if (segundosTotal <= 0) {
    return "0 minuto";
  }

  const minutos = Math.floor(segundosTotal / 60);
  const segundos = segundosTotal % 60;

  if (minutos <= 0) {
    return `${segundos} segundo${segundos === 1 ? "" : "s"}`;
  }

  if (segundos <= 0) {
    return `${minutos} minuto${minutos === 1 ? "" : "s"}`;
  }

  return `${minutos} minuto${minutos === 1 ? "" : "s"} e ${segundos} segundo${segundos === 1 ? "" : "s"}`;
}