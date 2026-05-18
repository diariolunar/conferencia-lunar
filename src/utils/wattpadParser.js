export function extrairIdWattpadPorLink(link = "") {
  const match = String(link).match(/wattpad\.com\/(?:story\/)?(\d+)/i);
  return match ? match[1] : "";
}

export function prepararLinkWattpad(link = "") {
  const valor = String(link).trim();

  if (!valor) {
    return "";
  }

  if (valor.startsWith("http://") || valor.startsWith("https://")) {
    return valor;
  }

  return `https://${valor}`;
}

export function ehLinkWattpad(link = "") {
  return String(link).toLowerCase().includes("wattpad.com");
}