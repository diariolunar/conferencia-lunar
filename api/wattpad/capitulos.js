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

function decodificarTextoUrl(texto = "") {
  try {
    return decodeURIComponent(String(texto || ""));
  } catch {
    return String(texto || "");
  }
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

function extrairSlugDaObra(html = "", storyId = "", linkOriginal = "") {
  const link = String(linkOriginal || "");
  const slugLink = link.match(new RegExp(`story/${storyId}-([^?#"']+)`, "i"));

  if (slugLink?.[1]) {
    return normalizarSlug(slugLink[1]);
  }

  const canonical = extrairCanonicalUrl(html);

  if (canonical) {
    const match = canonical.match(new RegExp(`story/${storyId}-([^?#"']+)`, "i"));

    if (match?.[1]) {
      return normalizarSlug(match[1]);
    }
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

  if (parte.slug) {
    return `https://www.wattpad.com/${id}-${parte.slug}`;
  }

  return id ? `https://www.wattpad.com/${id}` : "";
}

function extrairSlugDoLinkCapitulo(link = "") {
  const texto = String(link || "");
  const match = texto.match(/wattpad\.com\/\d+-([^?#"']+)/i);

  if (match?.[1]) {
    return normalizarSlug(decodificarTextoUrl(match[1]));
  }

  return "";
}

function tituloPeloSlugCapitulo(slugParte = "", storySlug = "", indice = 0) {
  let resto = slugParte;

  if (storySlug && resto.startsWith(`${storySlug}-`)) {
    resto = resto.slice(storySlug.length + 1);
  }

  if (storySlug && resto === storySlug) {
    resto = "";
  }

  const titulo = decodificarTextoUrl(resto)
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return titulo || `Capítulo ${indice + 1}`;
}

function pertenceAoSlugDaObra(slugParte = "", storySlug = "") {
  if (!storySlug || !slugParte) {
    return false;
  }

  return slugParte === storySlug || slugParte.startsWith(`${storySlug}-`);
}

function procurarPartesOficiaisEmObjeto(valor, storySlug = "", encontrados = []) {
  if (!valor || typeof valor !== "object") {
    return encontrados;
  }

  if (Array.isArray(valor)) {
    valor.forEach((item) =>
      procurarPartesOficiaisEmObjeto(item, storySlug, encontrados)
    );
    return encontrados;
  }

  const id = valor.id || valor.partId;
  const titulo = valor.title || valor.name;
  const link = montarLinkParte(valor);
  const slugParte = extrairSlugDoLinkCapitulo(link);

  if (id && titulo && pertenceAoSlugDaObra(slugParte, storySlug)) {
    encontrados.push(valor);
  }

  Object.values(valor).forEach((conteudo) =>
    procurarPartesOficiaisEmObjeto(conteudo, storySlug, encontrados)
  );

  return encontrados;
}

function extrairPartesPorRegexBruto(html = "", storySlug = "") {
  if (!storySlug) {
    return [];
  }

  const encontrados = [];
  const vistos = new Set();

  const texto = decodificarHtml(html);

  const regexes = [
    /https?:\/\/www\.wattpad\.com\/(\d+)-([a-zA-Z0-9%_\-]+)/g,
    /www\.wattpad\.com\/(\d+)-([a-zA-Z0-9%_\-]+)/g,
    /["']\/(\d+)-([a-zA-Z0-9%_\-]+)["']/g,
    /\\?\/(\d+)-([a-zA-Z0-9%_\-]+)/g
  ];

  regexes.forEach((regex) => {
    let match;

    while ((match = regex.exec(texto)) !== null) {
      const id = String(match[1] || "");
      const slugParte = normalizarSlug(decodificarTextoUrl(match[2] || ""));

      if (!id || vistos.has(id)) {
        continue;
      }

      if (!pertenceAoSlugDaObra(slugParte, storySlug)) {
        continue;
      }

      vistos.add(id);

      encontrados.push({
        id,
        title: tituloPeloSlugCapitulo(slugParte, storySlug, encontrados.length),
        slug: slugParte,
        url: `https://www.wattpad.com/${id}-${slugParte}`
      });
    }
  });

  return encontrados;
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
    ordem: Number(parte.order || parte.position || index),
    observacoes: ""
  };
}

function extrairObraDaResposta(dados = {}) {
  const story = dados.story || dados.data || dados;

  return {
    titulo: story.title || story.name || "",
    capaUrl: story.cover || story.coverUrl || story.cover_url || "",
    autor: story.user?.name || story.user?.username || story.author?.name || "",
    userAutor: story.user?.username || story.author?.username || ""
  };
}

function extrairPartesDaResposta(dados = {}) {
  const story = dados.story || dados.data || dados;

  const candidatos = [
    story.parts,
    story.publishedParts,
    story.tableOfContents,
    story.toc,
    dados.parts,
    dados.publishedParts,
    dados.tableOfContents,
    dados.toc,
    dados.data?.parts,
    dados.data?.publishedParts
  ];

  for (const candidato of candidatos) {
    if (Array.isArray(candidato) && candidato.length > 0) {
      return removerDuplicadosPorId(candidato);
    }
  }

  return [];
}

async function buscarPartesPelaApi(storyId, storySlug = "") {
  const urls = [
    `https://www.wattpad.com/api/v3/stories/${storyId}?fields=id,title,cover,user(name,username),parts(id,title,url,wordCount,order,position),publishedParts(id,title,url,wordCount,order,position),tableOfContents(id,title,url,wordCount,order,position)`,
    `https://www.wattpad.com/api/v3/stories/${storyId}?fields=id,title,cover,user,parts,publishedParts,tableOfContents`,
    `https://www.wattpad.com/v4/stories/${storyId}`,
    `https://www.wattpad.com/api/v3/stories/${storyId}`
  ];

  const tentativas = [];

  for (const url of urls) {
    try {
      const dados = await buscarJson(url);
      const partesDiretas = extrairPartesDaResposta(dados);
      const partesProfundas = removerDuplicadosPorId(
        procurarPartesOficiaisEmObjeto(dados, storySlug)
      );

      const partes = removerDuplicadosPorId([
        ...partesDiretas.filter((parte) => {
          const slugParte = extrairSlugDoLinkCapitulo(montarLinkParte(parte));
          return pertenceAoSlugDaObra(slugParte, storySlug);
        }),
        ...partesProfundas
      ]);

      const obra = extrairObraDaResposta(dados);

      tentativas.push({
        url,
        sucesso: true,
        partes: partes.length
      });

      if (partes.length > 0) {
        return {
          partes,
          obra,
          tentativas
        };
      }
    } catch (error) {
      tentativas.push({
        url,
        sucesso: false,
        erro: error.message
      });
    }
  }

  return {
    partes: [],
    obra: {
      titulo: "",
      capaUrl: "",
      autor: "",
      userAutor: ""
    },
    tentativas
  };
}

async function buscarPartesPelaPagina(storyId, linkOriginal = "") {
  const html = await buscarTexto(`https://www.wattpad.com/story/${storyId}`);
  const storySlug = extrairSlugDaObra(html, storyId, linkOriginal);

  const obra = {
    titulo: extrairTituloDaPagina(html),
    capaUrl: extrairCapaDaPagina(html),
    autor: "",
    userAutor: ""
  };

  const nextData = extrairJsonNextData(html);

  if (nextData) {
    const partesNext = removerDuplicadosPorId(
      procurarPartesOficiaisEmObjeto(nextData, storySlug)
    );

    if (partesNext.length > 0) {
      return {
        partes: partesNext,
        obra,
        storySlug,
        metodo: "next-data-seguro"
      };
    }
  }

  const partesRegex = removerDuplicadosPorId(
    extrairPartesPorRegexBruto(html, storySlug)
  );

  return {
    partes: partesRegex,
    obra,
    storySlug,
    metodo: "regex-bruto-seguro-por-slug"
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
        erro:
          "O link precisa ser o link da OBRA no Wattpad, no formato https://www.wattpad.com/story/ID.",
        debug: {
          linkRecebido: link || "",
          storyId: ""
        }
      });
    }

    const pagina = await buscarPartesPelaPagina(storyId, link);
    const storySlug = pagina.storySlug || "";

    const resultadoApi = await buscarPartesPelaApi(storyId, storySlug);

    let partes = removerDuplicadosPorId(resultadoApi.partes || []);
    let origem = "api-segura";
    let obra = {
      ...pagina.obra,
      ...resultadoApi.obra
    };

    if (!partes.length) {
      partes = removerDuplicadosPorId(pagina.partes || []);
      origem = pagina.metodo || "pagina-segura";
      obra = pagina.obra;
    }

    if (!partes.length) {
      return res.status(404).json({
        sucesso: false,
        erro:
          "Nenhum capítulo seguro encontrado. A importação foi bloqueada para evitar puxar capítulos de outra obra.",
        debug: {
          linkRecebido: link || "",
          storyId,
          storySlug,
          origem,
          tentativasApi: resultadoApi.tentativas || [],
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
        storySlug,
        tentativasApi: resultadoApi.tentativas || [],
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
