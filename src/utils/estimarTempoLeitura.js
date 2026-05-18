export function estimarTempoLeitura(totalPalavras = 0, palavrasPorMinuto = 250) {
  if (!totalPalavras || totalPalavras <= 0) {
    return {
      minutos: 0,
      segundos: 0,
      totalSegundos: 0,
      texto: "0 minuto"
    };
  }

  const totalSegundos = Math.ceil((totalPalavras / palavrasPorMinuto) * 60);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;

  return {
    minutos,
    segundos,
    totalSegundos,
    texto: formatarTempo(minutos, segundos)
  };
}

export function formatarTempo(minutos = 0, segundos = 0) {
  const partes = [];

  if (minutos > 0) {
    partes.push(`${minutos} ${minutos === 1 ? "minuto" : "minutos"}`);
  }

  if (segundos > 0) {
    partes.push(`${segundos} ${segundos === 1 ? "segundo" : "segundos"}`);
  }

  return partes.length ? partes.join(" e ") : "0 minuto";
}