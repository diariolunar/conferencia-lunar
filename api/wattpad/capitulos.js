function extrairStoryId(link = "") {
  const texto = String(link || "").trim();

  const patterns = [
    /story\/(\d+)/i,
    /stories\/(\d+)/i,
    /wattpad\.com\/story\/(\d+)/i,
    /[?&]story_id=(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = texto.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

function extrairSlugDaUrlObra(url = "", storyId = "") {
  const texto = String(url || "");

  if (!storyId) {
    return "";
  }

  const match = texto.match(new RegExp(`story/${storyId}-([^?#"']+)`, "i"));

  if (match?.[1]) {
    return normalizarSlug(match[1]);
  }

  return "";
}

function normalizar(texto = "") {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarSlug(texto = "") {
  return normalizar(texto).replace(/\s+/g, "-");
}

function limparHtml(texto = "") {
  return String(texto || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodificarHtml(texto = "") {
  return String(texto || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\u002F/g, "/")
    .replace(/\\/g, "");
}

function detectarTipo(titulo = "") {
  const busca = normalizar(titulo);

  if (busca.includes("prologo")) {
    return "prologo";
  }

  if (busca.includes("bonus")) {
    return "bonus";
  }

  if (busca.includes("extra") || busca.includes("especial")) {
    return "extra";
  }

  return "capitulo";
}

function extrairNumeroCapitulo(titulo = "", tipo = "capitulo") {
  if (tipo === "prologo") {
    return 0;
  }

  const busca = normalizar(titulo);
  const match = busca.match(/\b(?:capitulo|cap|chapter)\s*(\d+)\b/i);

  if (match) {
    return Number(match[1]);
  }

  return null;
}

function contarPalavras(texto = "") {
  const limpo = limparHtml(texto);

  if (!limpo) {
    return 0;
  }

  return limpo.split(/\s+/).filter(Boolean).length;
}

function contarParagrafos(texto = "") {
  const html = String(texto || "");
  const paragrafosHtml = html.match(/<p[\s\S]*?<\/p>/gi);

  if (paragrafosHtml?.length) {
    return paragrafosHtml.length;
  }

  const limpo = limparHtml(html);

  if (!limpo) {
    return 0;
  }

  return limpo
    .split(/\n+/)
    .map((linha) => linha.trim())
    .filter(Boolean).length;
}

function montarHeaders(accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8") {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    Accept: accept,
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: "https://www.wattpad.com/"
  };
}

async function buscarPagina(url) {
  const resposta = await fetch(url, {
    headers: montarHeaders()
  });

  if (!resposta.ok) {
    throw new Error(`Status ${resposta.status}`);
  }

  const html = await resposta.text();

  return {
    html,
    finalUrl: resposta.url || url
  };
}

async function buscarTexto(url) {
  const resposta = await fetch(url, {
    headers: montarHeaders()
  });

  if (!resposta.ok) {
    throw new Error(`Status ${resposta.status}`);
  }

  return resposta.text();
}

async function buscarJson(url) {
  const resposta = await fetch(url, {
    headers: montarHeaders("application/json,text/plain,*/*")
  });

  if (!resposta.ok) {
    throw new Error(`Status ${resposta.status}`);
  }

  return resposta.json();
}

async function buscarTextoParte(partId) {
  const urls = [
    `https://www.wattpad.com/apiv2/storytext?id=${partId}`,
    `https://www.wattpad.com/${partId}`
  ];

  for (const url of urls) {
    try {
      const texto = await buscarTexto(url);

      if (texto) {
        return texto;
      }
    } catch {
      // tenta o próximo
    }
  }

  return "";
}

function extrairTituloDaPagina(html = "") {
  const patterns = [
    /property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
    /"title"\s*:\s*"([^"]+)"/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodificarHtml(limparHtml(match[1]))
        .replace(/\s*-\s*Wattpad\s*$/i, "")
        .trim();
    }
  }

  return "";
}

function extrairCapaDaPagina(html = "") {
  const patterns = [
    /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /"cover"\s*:\s*"([^"]+)"/i,
    /"coverUrl"\s*:\s*"([^"]+)"/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodificarHtml(match[1]);
    }
  }

  return "";
}

function extrairCanonicalUrl(html = "") {
  const patterns = [
    /rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']og:url["']/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodificarHtml(match[1]);
    }
  }

  return "";
}

function resolverSlugSeguroDaObra({
  html = "",
  storyId = "",
  linkOriginal = "",
  finalUrl = ""
}) {
  const slugDoLinkOriginal = extrairSlugDaUrlObra(linkOriginal, storyId);

  if (slugDoLinkOriginal) {
    return slugDoLinkOriginal;
  }

  const slugDaUrlFinal = extrairSlugDaUrlObra(finalUrl, storyId);

  if (slugDaUrlFinal) {
    return slugDaUrlFinal;
  }

  const canonical = extrairCanonicalUrl(html);
  const slugCanonical = extrairSlugDaUrlObra(canonical, storyId);

  if (slugCanonical) {
    return slugCanonical;
  }

  const titulo = extrairTituloDaPagina(html);

  if (titulo) {
    return normalizarSlug(titulo);
  }

  return "";
}

function extrairJsonNextData(html = "") {
  const match = String(html).match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );

  if (!match?.[1]) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function montarLinkParte(parte = {}) {
  if (parte.url && String(parte.url).startsWith("http")) {
    return parte.url;
  }

  if (parte.url) {
    return `https://www.wattpad.com${String(parte.url).startsWith("/") ? "" : "/"}${parte.url}`;
  }

  const id = parte.id || parte.partId;

  return id ? `https://www.wattpad.com/${id}` : "";
}

function extrairSlugDoLinkCapitulo(link = "") {
  const texto = String(link || "");
  const match = texto.match(/wattpad\.com\/\d+-([^?#"']+)/i);

  if (match?.[1]) {
    return normal
