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

async function buscarMetadadosPagina(storyId) {
  try {
    const html = await buscarTexto(`https://www.wattpad.com/story/${storyId}`);

    return {
      titulo: extrairTituloDaPagina(html),
      capaUrl: extrairCapaDaPagina(html),
      autor: "",
      userAutor: ""
    };
  } catch {
    return {
      titulo: "",
      capaUrl: "",
      autor: "",
      userAutor: ""
    };
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

function partePertenceAObra(parte = {}, storyId = "") {
  const idsPossiveis = [
    parte.groupId,
    parte.group_id,
    parte.storyId,
    parte.story_id,
    parte.group?.id,
    parte.story?.id
  ]
    .filter((item) => item !== undefined && item !== null)
    .map((item) => String(item));

  if (!idsPossiveis.length) {
    return true;
  }

  return idsPossiveis.includes(String(storyId));
}

function extrairPartesDaResposta(dados = {}, storyId = "") {
  const story = dados.story || dados.data || dados;

  const listasPossiveis = [
    story.parts,
    story.publishedParts,
    story.tableOfContents,
    story.toc,
    story.chapters,
    dados.parts,
    dados.publishedParts,
    dados.tableOfContents,
    dados.toc,
    dados.data?.parts,
    dados.data?.publishedParts
  ];

  for (const lista of listasPossiveis) {
    if (Array.isArray(lista) && lista.length > 0) {
      const filtrada = lista.filter((parte) =>
        partePertenceAObra(parte, storyId)
      );

      return removerDuplicadosPorId(filtrada);
    }
  }

  return [];
}

function extrairObraDaResposta(dados = {}, fallback = {}) {
  const story = dados.story || dados.data || dados;

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

    return Number(a.id || a.partId || 0) - Number(b.id || b.partId || 0);
  });
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

async function buscarPelaApi(storyId, fallbackObra) {
  const fields = encodeURIComponent(
    "id,title,cover,user(name,username),parts(id,title,url,wordCount,order,position,groupId,group),publishedParts(id,title,url,wordCount,order,position,groupId,group),tableOfContents(id,title,url,wordCount,order,position,groupId,group)"
  );

  const urls = [
    `https://www.wattpad.com/api/v3/stories/${storyId}?fields=${fields}`,
    `https://www.wattpad.com/api/v3/stories/${storyId}?fields=id,title,cover,user,parts,publishedParts,tableOfContents`,
    `https://www.wattpad.com/api/v3/stories/${storyId}`,
    `https://www.wattpad.com/v4/stories/${storyId}`
  ];

  const tentativas = [];

  for (const url of urls) {
    try {
      const dados = await buscarJson(url);
      const partes = extrairPartesDaResposta(dados, storyId);
      const obra = extrairObraDaResposta(dados, fallbackObra);

      tentativas.push({
        url,
        sucesso: true,
        partes: partes.length
      });

      if (partes.length > 0) {
        return {
          sucesso: true,
          obra,
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
    obra: fallbackObra,
    partes: [],
    tentativas
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

    const metadadosPagina = await buscarMetadadosPagina(storyId);
    const resultado = await buscarPelaApi(storyId, metadadosPagina);

    if (!resultado.partes.length) {
      return res.status(404).json({
        sucesso: false,
        erro:
          "O Wattpad não devolveu a lista oficial de capítulos para essa obra. Para evitar bagunçar o cadastro, nada foi importado.",
        debug: {
          linkRecebido: link || "",
          storyId,
          tentativasApi: resultado.tentativas || [],
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
        origem: "api-oficial",
        linkRecebido: link || "",
        storyId,
        tentativasApi: resultado.tentativas || [],
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
