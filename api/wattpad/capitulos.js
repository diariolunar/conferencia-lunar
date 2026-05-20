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

function montarHeaders(accept = "application/json,text/plain,*/*") {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    Accept: accept,
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: "https://www.wattpad.com/",
    Origin: "https://www.wattpad.com"
  };
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

async function buscarTextoParte(partId) {
  const urls = [
    `https://www.wattpad.com/apiv2/storytext?id=${partId}`,
    `https://www.wattpad.com/v4/parts/${partId}/text`,
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

  const encontradas = removerDuplicadosPorId(procurarPartesEmObjeto(dados));

  return encontradas;
}

async function buscarPartesPelaApi(storyId) {
  const fields = encodeURIComponent(
    "id,title,cover,user(name,username),parts(id,title,url,wordCount,order,position),publishedParts(id,title,url,wordCount,order,position),tableOfContents(id,title,url,wordCount,order,position)"
  );

  const urls = [
    `https://www.wattpad.com/api/v3/stories/${storyId}?fields=${fields}`,
    `https://www.wattpad.com/api/v3/stories/${storyId}?fields=id,title,cover,user,parts,publishedParts,tableOfContents`,
    `https://www.wattpad.com/v4/stories/${storyId}?fields=${fields}`,
    `https://www.wattpad.com/api/v3/stories/${storyId}`,
    `https://www.wattpad.com/v4/stories/${storyId}`
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

function extrairLinksDeCapitulos(html = "") {
  const encontrados = [];
  const vistos = new Set();
  const regex = /href=["']([^"']*\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    const hrefOriginal = decodificarHtml(match[1] || "");
    const texto = limparHtml(decodificarHtml(match[2] || ""));

    const idMatch = hrefOriginal.match(/\/(\d+)(?:-|\/|$|\?)/);

    if (!idMatch?.[1]) {
      continue;
    }

    const id = idMatch[1];

    if (vistos.has(id)) {
      continue;
    }

    vistos.add(id);

    const href = hrefOriginal.startsWith("http")
      ? hrefOriginal
      : `https://www.wattpad.com${hrefOriginal.startsWith("/") ? "" : "/"}${hrefOriginal}`;

    encontrados.push({
      id,
      title: texto || `Capítulo ${encontrados.length + 1}`,
      url: href
    });
  }

  return encontrados;
}

async function buscarPartesPelaPagina(storyId) {
  const html = await buscarTexto(`https://www.wattpad.com/story/${storyId}`);
  const nextData = extrairJsonNextData(html);

  const obra = {
    titulo: extrairTituloDaPagina(html),
    capaUrl: extrairCapaDaPagina(html),
    autor: "",
    userAutor: ""
  };

  if (nextData) {
    const partesJson = removerDuplicadosPorId(procurarPartesEmObjeto(nextData));

    if (partesJson.length > 0) {
      return {
        partes: partesJson,
        obra,
        debug: {
          metodo: "next-data"
        }
      };
    }
  }

  const partesHtml = extrairLinksDeCapitulos(html);

  return {
    partes: removerDuplicadosPorId(partesHtml),
    obra,
    debug: {
      metodo: "html-links"
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

    let origem = "api";
    let debugPagina = {};
    let resultadoApi = await buscarPartesPelaApi(storyId);
    let partes = resultadoApi.partes || [];
    let obra = resultadoApi.obra || {
      titulo: "",
      capaUrl: "",
      autor: "",
      userAutor: ""
    };

    if (!partes.length) {
      origem = "pagina";

      const resultadoPagina = await buscarPartesPelaPagina(storyId);
      partes = resultadoPagina.partes || [];
      obra = {
        ...obra,
        ...resultadoPagina.obra
      };
      debugPagina = resultadoPagina.debug || {};
    } else {
      try {
        const resultadoPagina = await buscarPartesPelaPagina(storyId);

        obra = {
          ...obra,
          ...resultadoPagina.obra
        };

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
        ...debugPagina,
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
