export function removerAcentos(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizarTexto(texto = "") {
  return String(texto)
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizarParaBusca(texto = "") {
  return removerAcentos(normalizarTexto(texto))
    .toLowerCase()
    .trim();
}

export function quebrarLinhas(texto = "") {
  return String(texto)
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);
}

export function slugificar(texto = "") {
  return normalizarParaBusca(texto)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}