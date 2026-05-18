export function normalizarTexto(texto = "") {
  return String(texto)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
}

export function normalizarParaBusca(texto = "") {
  return normalizarTexto(texto)
    .toLowerCase()
    .replace(/[^\w\s:.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}