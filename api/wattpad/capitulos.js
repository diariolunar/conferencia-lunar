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

function montarHeaders(accept = "application/json,text/plain,*/*") {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    Accept: accept,
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: "https://www.wattpad.com/"
  };
}

async function buscarJson(url) {
  const resposta = await fetch(url, {
    headers: montarHeaders()
  });

  if (!resposta.ok) {
    throw new Error(`Status ${resposta.status}`);
  }

  return resposta.json();
}

async function buscarTexto(url) {
  const resposta = await fetch(url, {
    headers: montarHeaders(
      "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,text/plain,*/*;q=0.8"
    )
  });

  if (!resposta.ok) {
    throw new Error(`Status ${resposta.status}`);
  }

  return resposta.text();
}

function extrairTituloDaPagina(html = "") {
  const patterns = [
    /property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i
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
    /content=["']([^"']+)["'][^>]+property=["']og:image["']/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodificarHtml(match[1]);
    }
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

function extrairJsonsDeScripts(html = "") {
  const jsons = [];
  const regex = /<script[^>]*>([\s\S]*?)<\/script>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    const conteudo = match[1] || "";

    if (!conteudo.includes("parts") && !conteudo.includes("publishedParts")) {
      continue;
    }

    const possiveis = [
      conteudo.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});?\s*$/),
      conteudo.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});?\s*$/)
    ];

    possiveis.forEach((item) => {
      if (item?.[1]) {
        try {
          jsons.push(JSON.parse(item[1]));
        } catch {
          // ignora
        }
      }
    });
  }

  return jsons;
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

function extrairPartesDoStory(story = {}) {
  const candidatos = [
    story.parts,
    story.publishedParts,
    story.tableOfContents,
    story.toc,
    story.chapters
  ];

  for (const candidato of candidatos) {
    if (Array.isArray(candidato) && candidato.length > 0) {
      return removerDuplicadosPorId(candidato);
    }
  }

  return [];
}

function objetoPareceStoryCorreto(objeto = {}, storyId = "") {
  const idsPossiveis = [
    objeto.id,
    objeto.storyId,
    objeto.story_id,
    objeto.groupId,
    objeto.group_id
  ]
    .filter((item) => item !== undefined && item !== null)
    .map((item) => String(item));

  const temMesmoId = idsPossiveis.includes(String(storyId));

  const temCaraDeStory =
    objeto.title ||
    objeto.name ||
    objeto.cover ||
    objeto.coverUrl ||
    objeto.parts ||
    objeto.publishedParts ||
    objeto.tableOfContents;

  return Boolean(temMesmoId && temCaraDeStory);
}

function procurarStoryCorreto(valor, storyId = "") {
  if (!valor || typeof valor !== "object") {
    return null;
  }

  if (Array.isArray(valor)) {
    for (const item of valor) {
      const encontrado = procurarStoryCorreto(item, storyId);

      if (encontrado) {
        return encontrado;
      }
    }

    return null;
  }

  if (objetoPareceStoryCorreto(valor, storyId)) {
    return valor;
  }

  for (const conteudo of Object.values(valor)) {
    const encontrado = procurarStoryCorreto(conteudo, storyId);

    if (encontrado) {
      return encontrado;
    }
  }

  return null;
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

function ordenarPartes(partes = []) {
  return [...partes].sort((a, b) => {
    const ordemA = Number(
      a.order ??
        a.position ??
        a.rank ??
        a.partOrder ??
        a.displayOrder ??
        999999
    );

    const ordemB = Number(
      b.order ??
        b.position ??
        b.rank ??
        b.partOrder ??
        b.displayOrder ??
        999999
    );

    if (ordemA !== ordemB) {
      return ordemA - ordemB;
    }

    return String(a.id || a.partId || "").localeCompare(
      String(b.id || b.partId || "")
    );
  });
}

function converterParteEmCapitulo(parte = {}, index = 0) {
  const id = String(parte.id || parte.partId || "");
  const titulo = limparHtml(
    decodificarHtml(parte.title || parte.name || `Capítulo ${index + 1}`)
  );
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

function extrairObraDoStory(story = {}, fallback = {}) {
  return {
    titulo: story.title || story.name || fallback.titulo || "",
    capaUrl:
      story.cover ||
      story.coverUrl ||
      story.cover_url ||
      story.image ||
      fallback.capaUrl ||
      "",
    autor:
      story.user?.name ||
      story.user?.username ||
      story.author?.name ||
      fallback.autor ||
      "",
    userAutor:
      story.user?.username ||
      story.author?.username ||
      fallback.userAutor ||
      ""
  };
}

async function buscarPelaApiOficial(storyId) {
  const fields = encodeURIComponent(
    "id,title,cover,user(name,username),parts(id,title,url,wordCount,order,position),publishedParts(id,title,url,wordCount,order,position),tableOfContents(id,title,url,wordCount,order,position)"
  );

  const urls = [
    `https://www.wattpad.com/api/v3/stories/${storyId}?fields=${fields}`,
    `https://www.wattpad.com/api/v3/stories/${storyId}?fields=id,title,cover,user,parts,publishedParts,tableOfContents`,
    `https://www.wattpad.com/v4/stories/${storyId}`,
    `https://www.wattpad.com/api/v3/stories/${storyId}`
  ];

  const tentativas = [];

  for (const url of urls) {
    try {
      const dados = await buscarJson(url);
      const story = dados.story || dados.data || dados;
      const partes = extrairPartesDoStory(story);

      tentativas.push({
        url,
        sucesso: true,
        partes: partes.length
      });

      if (partes.length > 0) {
        return {
          sucesso: true,
          origem: "api-oficial",
          obra: extrairObraDoStory(story),
          partes: ordenarPartes(partes),
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
    sucesso: false,
    origem: "api-oficial",
    obra: {},
    partes: [],
    tentativas
  };
}

async function buscarPeloHtmlDaObra(storyId) {
  const html = await buscarTexto(`https://www.wattpad.com/story/${storyId}`);

  const fallbackObra = {
    titulo: extrairTituloDaPagina(html),
    capaUrl: extrairCapaDaPagina(html),
    autor: "",
    userAutor: ""
  };

  const jsons = [];

  const nextData = extrairJsonNextData(html);

  if (nextData) {
    jsons.push(nextData);
  }

  jsons.push(...extrairJsonsDeScripts(html));

  for (const json of jsons) {
    const story = procurarStoryCorreto(json, storyId);

    if (!story) {
      continue;
    }

    const partes = extrairPartesDoStory(story);

    if (partes.length > 0) {
      return {
        sucesso: true,
        origem: "html-story-id",
        obra: extrairObraDoStory(story, fallbackObra),
        partes: ordenarPartes(partes)
      };
    }
  }

  return {
    sucesso: false,
    origem: "html-story-id",
    obra: fallbackObra,
    partes: []
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

    const api = await buscarPelaApiOficial(storyId);

    let resultado = api;

    if (!resultado.sucesso) {
      resultado = await buscarPeloHtmlDaObra(storyId);
      resultado.tentativasApi = api.tentativas || [];
    }

    if (!resultado.partes.length) {
      return res.status(404).json({
        sucesso: false,
        erro:
          "Não consegui encontrar a lista oficial de capítulos dessa obra no Wattpad sem risco de puxar dados de outro livro.",
        debug: {
          linkRecebido: link || "",
          storyId,
          origem: resultado.origem,
          tentativasApi: api.tentativas || [],
          partesEncontradas: 0
        }
      });
    }

    const capitulos = resultado.partes.map((parte, index) =>
      converterParteEmCapitulo(parte, index)
    );

    return res.status(200).json({
      sucesso: true,
      storyId,
      total: capitulos.length,
      obra: resultado.obra || {},
      capitulos,
      debug: {
        origem: resultado.origem,
        linkRecebido: link || "",
        storyId,
        tentativasApi: api.tentativas || [],
        brutosEncontrados: resultado.partes.length,
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
