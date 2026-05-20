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

function montarHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    Accept: "application/json,text/plain,*/*",
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
  const id = parte.id || parte.partId;

  if (parte.url && String(parte.url).startsWith("http")) {
    return parte.url;
  }

  if (parte.url) {
    return `https://www.wattpad.com${String(parte.url).startsWith("/") ? "" : "/"}${parte.url}`;
  }

  return id ? `https://www.wattpad.com/${id}` : "";
}

function converterParteEmCapitulo(parte = {}, index = 0) {
  const id = String(parte.id || parte.partId || "");
  const titulo = limparHtml(parte.title || parte.name || `Capítulo ${index + 1}`);
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

async function buscarPartesPelaApi(storyId) {
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
      const partes = extrairPartesDaResposta(dados);
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
        erro: "O link precisa ser o link da OBRA no Wattpad, no formato https://www.wattpad.com/story/ID.",
        debug: {
          linkRecebido: link || "",
          storyId: ""
        }
      });
    }

    const resultadoApi = await buscarPartesPelaApi(storyId);
    const partes = removerDuplicadosPorId(resultadoApi.partes || []);
    const obra = resultadoApi.obra || {
      titulo: "",
      capaUrl: "",
      autor: "",
      userAutor: ""
    };

    if (!partes.length) {
      return res.status(404).json({
        sucesso: false,
        erro:
          "Nenhum capítulo encontrado pela API segura do Wattpad. A sincronização foi bloqueada para evitar importar capítulos de outra obra.",
        debug: {
          linkRecebido: link || "",
          storyId,
          tentativasApi: resultadoApi.tentativas || [],
          partesEncontradas: 0
        }
      });
    }

    const capitulos = partes.map((parte, index) =>
      converterParteEmCapitulo(parte, index)
    );

    return res.status(200).json({
      sucesso: true,
      storyId,
      total: capitulos.length,
      obra,
      capitulos,
      debug: {
        origem: "api-segura",
        linkRecebido: link || "",
        storyId,
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
