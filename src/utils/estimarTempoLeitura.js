export function estimarTempoLeitura(
  totalPalavras = 0,
  palavrasPorMinuto = 250
) {
  const palavras = Number(totalPalavras) || 0;
  const ppm = Number(palavrasPorMinuto) || 250;

  if (palavras <= 0) {
    return {
      minutos: 0,
      segundos: 0,
      totalSegundos: 0,
      texto: "0 minuto"
    };
  }

  const minutosFloat = palavras / ppm;
  const totalSegundos = Math.max(
    1,
    Math.round(minutosFloat * 60)
  );

  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;

  let texto = "";

  if (minutos > 0) {
    texto += `${minutos} minuto${minutos > 1 ? "s" : ""}`;
  }

  if (segundos > 0) {
    if (texto) {
      texto += " e ";
    }

    texto += `${segundos} segundo${segundos > 1 ? "s" : ""}`;
  }

  return {
    minutos,
    segundos,
    totalSegundos,
    texto
  };
}

export function formatarTempoSegundos(totalSegundos = 0) {
  const segundos = Number(totalSegundos) || 0;

  const minutosInteiros = Math.floor(segundos / 60);
  const segundosRestantes = segundos % 60;

  if (minutosInteiros <= 0) {
    return `${segundosRestantes}s`;
  }

  if (segundosRestantes <= 0) {
    return `${minutosInteiros}min`;
  }

  return `${minutosInteiros}min ${segundosRestantes}s`;
}