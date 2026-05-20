function extrairStoryId(link = "") {
  const texto = String(link || "");

  const porStory = texto.match(/story\/(\d+)/i);
  if (porStory) {
    return porStory[1];
  }

  const porNumero = texto.match(/wattpad\.com\/(\d+)/i);
  if (porNumero) {
    return porNumero[1];
  }

  return "";
}

function normalizar(texto = "") {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
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

function extrairNumeroCapitulo(titulo = "", index = 0, tipo = "capitulo") {
  if (tipo === "prologo") {
    return 0;
  }

  const busca = normalizar(titulo);
  const match = busca.match(/\b(?:capitulo|cap|chapter)\s*\.?\s*(\d+)\b/i);

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
    `https://www.wattpad.com/v4/parts/${partId}/text`
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
    const pareceListaDePartes =
      valor.length > 0 &&
      valor.some((item) => {
        return (
          item &&
          typeof item === "object" &&
          (item.id || item.partId) &&
          (item.title || item.name)
        );
      });

    if (pareceListaDePartes) {
      valor.forEach((item) => {
        if (
          item &&
          typeof item === "object" &&
          (item.id || item.partId) &&
          (item.title || item.name)
        ) {
          encontrados.push(item);
        }
      });
    }

    valor.forEach((item) => procurarPartesEmObjeto(item, encontrados));
    return encontrados;
  }

  Object.entries(valor).forEach(([chave, conteudo]) => {
    const chaveNormalizada = normalizar(chave);

    if (
      Array.isArray(conteudo) &&
      (chaveNormalizada === "parts" ||
        chaveNormalizada === "publishedparts" ||
        chaveNormalizada === "tableofcontents")
    ) {
      conteudo.forEach((item) => {
        if (
          item &&
          typeof item === "object" &&
          (item.id || item.partId) &&
          (item.title || item.name)
        ) {
          encontrados.push(item);
        }
      });
    }

    procurarPartesEmObjeto(conteudo, encontrados);
  });

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
    return `https://www.wattpad.com${parte.url}`;
  }

  const id = parte.id || parte.partId;

  return id ? `https://www.wattpad.com/${id}` : "";
}

function converterParteEmCapitulo(parte = {}, index = 0) {
  const id = String(parte.id || parte.partId || "");
  const titulo = parte.title || parte.name || `Capítulo ${index + 1}`;
  const tipo = detectarTipo(titulo);

  return {
    idWattpad: id,
    titulo,
    numero: extrairNumeroCapitulo(titulo, index, tipo),
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

function extrairObraDoJson(dados = {}) {
  const encontrados = [];

  function caminhar(valor) {
    if (!valor || typeof valor !== "object") {
      return;
    }

    if (Array.isArray(valor)) {
      valor.forEach(caminhar);
      return;
    }

    if (
      (valor.title || valor.name) &&
      (valor.cover || valor.coverUrl || valor.cover_url || valor.url)
    ) {
      encontrados.push(valor);
    }

    Object.values(valor).forEach(caminhar);
  }

  caminhar(dados);

  const item = encontrados[0] || {};

  return {
    titulo: item.title || item.name || "",
    capaUrl: item.cover || item.coverUrl || item.cover_url || "",
    autor: item.user?.name || item.user?.username || item.author?.name || "",
    userAutor: item.user?.username || item.author?.username || ""
  };
}

function extrairCapaDoHtml(html = "") {
  const patterns = [
    /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /"cover"\s*:\s*"([^"]+)"/i,
    /"coverUrl"\s*:\s*"([^"]+)"/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return match[1].replace(/\\u002F/g, "/").replace(/\\/g, "");
    }
  }

  return "";
}

async function buscarPartesPelaPagina(storyId) {
  const html = await buscarTexto(`https://www.wattpad.com/story/${storyId}`);
  const nextData = extrairJsonNextData(html);

  if (nextData) {
    const partes = removerDuplicadosPorId(procurarPartesEmObjeto(nextData));

    if (partes.length > 0) {
      return {
        partes,
        obra: extrairObraDoJson(nextData)
      };
    }
  }

  return {
    partes: [],
    obra: {
      titulo: "",
      capaUrl: extrairCapaDoHtml(html),
      autor: "",
      userAutor: ""
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
        erro: "Não consegui identificar o ID da obra no Wattpad."
      });
    }

    let obra = {
      titulo: "",
      capaUrl: "",
      autor: "",
      userAutor: ""
    };

    let partes = await buscarPartesPelaApi(storyId);

    if (!partes.length) {
      const resultadoPagina = await buscarPartesPelaPagina(storyId);
      partes = resultadoPagina.partes;
      obra = resultadoPagina.obra || obra;
    } else {
      try {
        const resultadoPagina = await buscarPartesPelaPagina(storyId);
        obra = resultadoPagina.obra || obra;
      } catch {
        // não trava se a página falhar
      }
    }

    partes = removerDuplicadosPorId(partes);

    if (!partes.length) {
      return res.status(404).json({
        sucesso: false,
        erro: "Nenhum capítulo encontrado no Wattpad."
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
          // mantém sem travar
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
        origem: "api-wattpad-capitulos",
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
