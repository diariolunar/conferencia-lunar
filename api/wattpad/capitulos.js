function extrairStoryId(link = "") {
  const texto = String(link || "").trim();

  const patterns = [
    /story\/(\d+)/i,
    /stories\/(\d+)/i,
    /wattpad\.com\/story\/(\d+)/i,
    /wattpad\.com\/(\d+)/i,
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

async function buscarTexto(url) {
  const resposta = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,text/plain,*/*;q=0.8"
    }
  });

  if (!resposta.ok) {
    throw new Error(`Status ${resposta.status}`);
  }

  return resposta.text();
}

async function buscarJson(url) {
  const resposta = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "application/json,text/plain,*/*"
    }
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

function extrairSlugDaObra(html = "", storyId = "") {
  const canonicalPatterns = [
    /rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /property=["']og:url["'][^>]+content=["']([^"']+)["']/i
  ];

  for (const pattern of canonicalPatterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      const url = decodificarHtml(match[1]);
      const slugMatch = url.match(new RegExp(`story/${storyId}-([^?#"']+)`, "i"));

      if (slugMatch?.[1]) {
        return normalizarSlug(slugMatch[1]);
      }
    }
  }

  return "";
}

function extrairLinksDeCapitulos(html = "", storySlug = "") {
  const encontrados = [];
  const vistos = new Set();

  const hrefRegex = /href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    const hrefOriginal = decodificarHtml(match[1] || "");
    const textoLink = limparHtml(decodificarHtml(match[2] || ""));

    if (!hrefOriginal) {
      continue;
    }

    const href = hrefOriginal.startsWith("http")
      ? hrefOriginal
      : `https://www.wattpad.com${hrefOriginal.startsWith("/") ? "" : "/"}${hrefOriginal}`;

    const parteMatch = href.match(/wattpad\.com\/(\d+)-([^?#"']+)/i);

    if (!parteMatch) {
      continue;
    }

    const id = parteMatch[1];
    const slug = normalizarSlug(parteMatch[2] || "");

    if (!id || vistos.has(id)) {
      continue;
    }

    if (storySlug) {
      const slugCurto = storySlug.split("-").slice(0, 3).join("-");

      if (!slug.includes(storySlug) && !slug.includes(slugCurto)) {
        continue;
      }
    }

    vistos.add(id);

    encontrados.push({
      id,
      title: textoLink || parteMatch[2].replace(/-/g, " "),
      url: href
    });
  }

  return encontrados;
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

function procurarPartesEmObjeto(valor, encontrados = []) {
  if (!valor || typeof valor !== "object") {
    return encontrados;
  }

  if (Array.isArray(valor)) {
    valor.forEach((item) => procurarPartesEmObjeto(item, encontrados));
    return encontrados;
  }

  const id = valor.id || valor.partId;
  const titulo = valor.title || valor.name;

  if (id && titulo) {
    encontrados.push(valor);
  }

  Object.values(valor).forEach((conteudo) =>
    procurarPartesEmObjeto(conteudo, encontrados)
  );

  return encontrados;
}

function removerDuplicadosPorId(partes = []) {
  const mapa = new Map();

  partes.forEach((parte) => {
    const id = String(parte.id || parte.partId || "");

    if (!id) {
      return;
    }

    if (!mapa.has(id)) {
      mapa.set(id, parte);
    }
  });

  return Array.from(mapa.values());
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

function converterParteEmCapitulo(parte = {}, index = 0) {
  const id = String(parte.id || parte.partId || "");
  const tituloBruto = parte.title || parte.name || `Capítulo ${index + 1}`;
  const titulo = limparHtml(decodificarHtml(tituloBruto));
  const tipo = detectarTipo(titulo);

  return {
    idWattpad: id,
    titulo,
    numero: extrairNumeroCapitulo(titulo, tipo),
    tipo,
    linkWattpad: montarLinkParte(parte),
    totalPalavras: Number(
      parte.wordCount ||
        parte.word_count ||
        parte.words ||
        parte.length ||
        0
    ),
    totalParagrafos: 0,
    ordem: index,
    observacoes: ""
  };
}

async function buscarPartesPelaApi(storyId) {
  const urls = [
    `https://www.wattpad.com/api/v3/stories/${storyId}`,
    `https://www.wattpad.com/v4/stories/${storyId}`
  ];

  for (const url of urls) {
    try {
      const dados = await buscarJson(url);

      const partes =
        dados.parts ||
        dados.story?.parts ||
        dados.data?.parts ||
        dados.tableOfContents ||
        dados.story?.publishedParts ||
        [];

      if (Array.isArray(partes) && partes.length > 0) {
        return removerDuplicadosPorId(partes);
      }

      const encontradas = removerDuplicadosPorId(procurarPartesEmObjeto(dados));

      if (encontradas.length > 0) {
        return encontradas;
      }
    } catch {
      // tenta o próximo
    }
  }

  return [];
}

async function buscarPartesPelaPagina(storyId) {
  const html = await buscarTexto(`https://www.wattpad.com/story/${storyId}`);
  const titulo = extrairTituloDaPagina(html);
  const capaUrl = extrairCapaDaPagina(html);
  const storySlug = extrairSlugDaObra(html, storyId);

  const nextData = extrairJsonNextData(html);

  if (nextData) {
    const partesJson = removerDuplicadosPorId(procurarPartesEmObjeto(nextData));

    if (partesJson.length > 0) {
      return {
        partes: partesJson,
        obra: {
          titulo,
          capaUrl,
          autor: "",
          userAutor: ""
        },
        debug: {
          metodo: "next-data",
          storySlug
        }
      };
    }
  }

  const partesHtml = extrairLinksDeCapitulos(html, storySlug);

  return {
    partes: removerDuplicadosPorId(partesHtml),
    obra: {
      titulo,
      capaUrl,
      autor: "",
      userAutor: ""
    },
    debug: {
      metodo: "html-links",
      storySlug
    }
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        sucesso: false,
        erro: "Método não permitido."
      });
    }

    const { link } = req.body || {};
    const storyId = extrairStoryId(link);

    if (!storyId) {
      return res.status(400).json({
        sucesso: false,
        erro: "Não consegui identificar o ID da obra no Wattpad.",
        debug: {
          linkRecebido: link || "",
          storyId: ""
        }
      });
    }

    let obra = {
      titulo: "",
      capaUrl: "",
      autor: "",
      userAutor: ""
    };

    let origem = "api";
    let debugPagina = {};
    let partes = await buscarPartesPelaApi(storyId);

    if (!partes.length) {
      origem = "pagina";
      const resultadoPagina = await buscarPartesPelaPagina(storyId);
      partes = resultadoPagina.partes;
      obra = resultadoPagina.obra || obra;
      debugPagina = resultadoPagina.debug || {};
    } else {
      try {
        const resultadoPagina = await buscarPartesPelaPagina(storyId);
        obra = resultadoPagina.obra || obra;
        debugPagina = resultadoPagina.debug || {};
      } catch {
        // não trava
      }
    }

    partes = removerDuplicadosPorId(partes);

    if (!partes.length) {
      return res.status(404).json({
        sucesso: false,
        erro: "Nenhum capítulo encontrado no Wattpad.",
        debug: {
          linkRecebido: link || "",
          storyId,
          origem,
          ...debugPagina,
          partesEncontradas: 0
        }
      });
    }

    const capitulos = [];

    for (let index = 0; index < partes.length; index += 1) {
      const capitulo = converterParteEmCapitulo(partes[index], index);

      if (capitulo.idWattpad) {
        try {
          const textoParte = await buscarTextoParte(capitulo.idWattpad);

          if (textoParte) {
            capitulo.totalPalavras =
              capitulo.totalPalavras || contarPalavras(textoParte);
            capitulo.totalParagrafos = contarParagrafos(textoParte);
          }
        } catch {
          // não trava
        }
      }

      capitulos.push(capitulo);
    }

    return res.status(200).json({
      sucesso: true,
      storyId,
      total: capitulos.length,
      obra,
      capitulos,
      debug: {
        origem,
        linkRecebido: link || "",
        storyId,
        ...debugPagina,
        brutosEncontrados: partes.length,
        depoisDoFiltro: capitulos.length
      }
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      sucesso: false,
      erro: error.message || "Erro ao buscar capítulos do Wattpad."
    });
  }
}
