function responder(res, status, dados) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(dados));
}

function limparHtml(texto = "") {
  return String(texto)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarTexto(texto = "") {
  return String(texto)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function montarLinkWattpad(valor = "") {
  const texto = String(valor || "").trim();

  if (!texto) {
    return "";
  }

  if (texto.startsWith("http://") || texto.startsWith("https://")) {
    return texto;
  }

  if (texto.startsWith("/")) {
    return `https://www.wattpad.com${texto}`;
  }

  return `https://www.wattpad.com/${texto}`;
}

function extrairIdDoLink(link = "") {
  const texto = String(link);

  const matchStory = texto.match(/wattpad\.com\/story\/(\d+)/i);

  if (matchStory) {
    return matchStory[1];
  }

  const matchNumero = texto.match(/wattpad\.com\/(\d+)/i);

  if (matchNumero) {
    return matchNumero[1];
  }

  const matchQualquerNumero = texto.match(/(\d{6,})/);

  if (matchQualquerNumero) {
    return matchQualquerNumero[1];
  }

  return "";
}

function detectarTipoCapitulo(titulo = "", ordem = 1) {
  const busca = normalizarTexto(titulo);

  if (busca.includes("prologo") || busca.includes("prólogo")) {
    return "prologo";
  }

  if (busca.includes("bonus") || busca.includes("bônus")) {
    return "bonus";
  }

  if (busca.includes("extra")) {
    return "extra";
  }

  if (ordem === 0) {
    return "prologo";
  }

  return "capitulo";
}

function numeroPorExtenso(texto = "") {
  const busca = normalizarTexto(texto);

  const mapa = {
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    três: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
    onze: 11,
    doze: 12,
    treze: 13,
    catorze: 14,
    quatorze: 14,
    quinze: 15,
    dezesseis: 16,
    dezassete: 17,
    dezessete: 17,
    dezoito: 18,
    dezenove: 19,
    vinte: 20
  };

  for (const [palavra, numero] of Object.entries(mapa)) {
    if (busca.includes(palavra)) {
      return numero;
    }
  }

  return null;
}

function extrairNumeroDoTitulo(titulo = "", ordem = 1) {
  const busca = normalizarTexto(titulo);

  if (busca.includes("prologo") || busca.includes("prólogo")) {
    return 0;
  }

  const match = busca.match(/(?:capitulo|capítulo|cap|chapter)\s*(\d+)/i);

  if (match) {
    return Number(match[1]);
  }

  const numeroExtenso = numeroPorExtenso(busca);

  if (numeroExtenso) {
    return numeroExtenso;
  }

  return ordem;
}

function extrairTotalPalavras(item = {}) {
  const wordCount =
    item.wordCount ||
    item.word_count ||
    item.words ||
    item.totalWords ||
    item.word_count_total;

  if (wordCount) {
    return Number(wordCount) || 0;
  }

  const tamanhoTexto =
    item.textLength ||
    item.characterCount ||
    item.charCount ||
    item.length ||
    0;

  if (!tamanhoTexto) {
    return 0;
  }

  return Math.round(Number(tamanhoTexto) / 5.5);
}

function contarPalavrasTexto(texto = "") {
  const limpo = limparHtml(texto);

  if (!limpo) {
    return 0;
  }

  const palavras = limpo.match(/\S+/g) || [];
  return palavras.length;
}

function contarParagrafosPorHtml(html = "") {
  const texto = String(html || "");

  const matchesP = texto.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
  const paragrafosP = matchesP
    .map((paragrafo) => limparHtml(paragrafo))
    .filter((paragrafo) => paragrafo.length > 0);

  if (paragrafosP.length > 0) {
    return paragrafosP.length;
  }

  const matchesDiv =
    texto.match(/<div\b[^>]*data-p-id[^>]*>[\s\S]*?<\/div>/gi) || [];

  const paragrafosDiv = matchesDiv
    .map((paragrafo) => limparHtml(paragrafo))
    .filter((paragrafo) => paragrafo.length > 0);

  if (paragrafosDiv.length > 0) {
    return paragrafosDiv.length;
  }

  const linhas = limparHtml(texto)
    .split(/\n+/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  return linhas.length;
}

function transformarEmCapitulo(item, index) {
  const titulo =
    item.title ||
    item.name ||
    item.titulo ||
    item.partTitle ||
    item.chapterTitle ||
    item.text ||
    `Capítulo ${index + 1}`;

  const id = item.id || item.partId || item.part_id || item.urlId || "";

  const link =
    item.url ||
    item.link ||
    item.href ||
    item.pageUrl ||
    item.webUrl ||
    item.readUrl ||
    item.urlPath ||
    "";

  const ordem = Number(item.order || item.position || item.index || index + 1);
  const tipo = detectarTipoCapitulo(titulo, ordem);
  const numero = tipo === "prologo" ? 0 : extrairNumeroDoTitulo(titulo, ordem);

  let linkWattpad = montarLinkWattpad(link);

  if (!linkWattpad && id) {
    linkWattpad = `https://www.wattpad.com/${id}`;
  }

  return {
    titulo: limparHtml(titulo),
    numero,
    tipo,
    linkWattpad,
    totalPalavras: extrairTotalPalavras(item),
    totalParagrafos: Number(
      item.paragraphCount ||
        item.paragraph_count ||
        item.paragraphs ||
        item.numParagraphs ||
        0
    ),
    ordem,
    observacoes: ""
  };
}

function ehCapituloPossivel(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  const temTitulo =
    typeof item.title === "string" ||
    typeof item.name === "string" ||
    typeof item.partTitle === "string" ||
    typeof item.chapterTitle === "string";

  const temLinkOuId =
    item.url ||
    item.link ||
    item.href ||
    item.pageUrl ||
    item.webUrl ||
    item.readUrl ||
    item.urlPath ||
    item.id ||
    item.partId ||
    item.part_id;

  return Boolean(temTitulo && temLinkOuId);
}

function coletarCapitulosDeJson(valor, encontrados = []) {
  if (!valor) {
    return encontrados;
  }

  if (Array.isArray(valor)) {
    const possiveis = valor.filter(ehCapituloPossivel);

    if (possiveis.length > 0) {
      possiveis.forEach((item) => encontrados.push(item));
    }

    valor.forEach((item) => coletarCapitulosDeJson(item, encontrados));
    return encontrados;
  }

  if (typeof valor === "object") {
    Object.entries(valor).forEach(([chave, conteudo]) => {
      const chaveBusca = normalizarTexto(chave);

      if (
        Array.isArray(conteudo) &&
        (chaveBusca.includes("parts") ||
          chaveBusca.includes("chapters") ||
          chaveBusca.includes("capitulos") ||
          chaveBusca.includes("tableofcontents"))
      ) {
        conteudo.forEach((item) => {
          if (ehCapituloPossivel(item)) {
            encontrados.push(item);
          }
        });
      }

      coletarCapitulosDeJson(conteudo, encontrados);
    });
  }

  return encontrados;
}

function extrairJsonNextData(html = "") {
  const match = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    return null;
  }
}

function extrairJsonDeScripts(html = "") {
  const encontrados = [];
  const regex = /<script[^>]*>([\s\S]*?)<\/script>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    const conteudo = match[1];

    if (!conteudo || !conteudo.includes("parts")) {
      continue;
    }

    const possiveisJsons = conteudo.match(/\{[\s\S]*\}/g) || [];

    possiveisJsons.forEach((textoJson) => {
      try {
        encontrados.push(JSON.parse(textoJson));
      } catch (error) {
        // ignora scripts que não são JSON puro
      }
    });
  }

  return encontrados;
}

function extrairCapitulosPorLinks(html = "") {
  const capitulos = [];

  const regex =
    /<a[^>]+href=["'](\/\d+[-/][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const conteudo = limparHtml(match[2]);

    if (!conteudo || conteudo.length > 180) {
      continue;
    }

    const busca = normalizarTexto(conteudo);

    if (
      busca.includes("comentario") ||
      busca.includes("comentário") ||
      busca.includes("voto") ||
      busca.includes("visualizacao") ||
      busca.includes("visualização") ||
      busca.includes("login") ||
      busca.includes("signup")
    ) {
      continue;
    }

    capitulos.push({
      title: conteudo,
      url: href
    });
  }

  return capitulos;
}

function ehCapituloReal(capitulo) {
  const tituloBusca = normalizarTexto(capitulo.titulo);
  const linkBusca = normalizarTexto(capitulo.linkWattpad);

  if (!capitulo.linkWattpad) {
    return false;
  }

  if (linkBusca.includes("/story/")) {
    return false;
  }

  const pareceCapituloPeloTitulo =
    tituloBusca.includes("capitulo") ||
    tituloBusca.includes("capítulo") ||
    tituloBusca.includes("chapter") ||
    tituloBusca.includes("prologo") ||
    tituloBusca.includes("prólogo");

  const temPalavras = Number(capitulo.totalPalavras) > 0;

  return temPalavras || pareceCapituloPeloTitulo;
}

function removerDuplicados(capitulos = []) {
  const mapa = new Map();

  capitulos.forEach((capitulo, index) => {
    const chave =
      capitulo.linkWattpad ||
      `${normalizarTexto(capitulo.titulo)}-${capitulo.ordem || index}`;

    if (!mapa.has(chave)) {
      mapa.set(chave, capitulo);
    }
  });

  return Array.from(mapa.values());
}

function filtrarEReordenarCapitulos(capitulos = []) {
  const capitulosLimpos = removerDuplicados(capitulos).filter(ehCapituloReal);

  const capitulosComPeso = capitulosLimpos.map((capitulo, index) => {
    let peso = Number(capitulo.numero);

    if (capitulo.tipo === "prologo") {
      peso = 0;
    }

    if (!Number.isFinite(peso)) {
      peso = index + 1;
    }

    return {
      ...capitulo,
      pesoOrdenacao: peso
    };
  });

  capitulosComPeso.sort((a, b) => {
    if (a.pesoOrdenacao !== b.pesoOrdenacao) {
      return a.pesoOrdenacao - b.pesoOrdenacao;
    }

    return Number(a.ordem || 0) - Number(b.ordem || 0);
  });

  return capitulosComPeso.map((capitulo, index) => {
    const tipo = capitulo.tipo === "prologo" ? "prologo" : "capitulo";
    const numero = tipo === "prologo" ? 0 : Number(capitulo.numero) || index + 1;

    return {
      titulo: capitulo.titulo,
      numero,
      tipo,
      linkWattpad: capitulo.linkWattpad,
      totalPalavras: Number(capitulo.totalPalavras) || 0,
      totalParagrafos: Number(capitulo.totalParagrafos) || 0,
      ordem: tipo === "prologo" ? 0 : numero,
      observacoes: capitulo.observacoes || ""
    };
  });
}

function montarUrlCapaPorId(storyId) {
  if (!storyId) {
    return "";
  }

  return `https://img.wattpad.com/cover/${storyId}-256-k.jpg`;
}

function tratarUrlCapa(valor, storyId) {
  if (!valor) {
    return "";
  }

  const texto = String(valor).trim();

  if (!texto) {
    return "";
  }

  if (texto.startsWith("http://") || texto.startsWith("https://")) {
    return texto;
  }

  if (texto.startsWith("//")) {
    return `https:${texto}`;
  }

  if (texto.startsWith("/")) {
    return `https://www.wattpad.com${texto}`;
  }

  if (/^\d+$/.test(texto)) {
    return montarUrlCapaPorId(texto);
  }

  if (storyId) {
    return montarUrlCapaPorId(storyId);
  }

  return "";
}

function extrairCapaDeJson(valor, storyId) {
  if (!valor || typeof valor !== "object") {
    return "";
  }

  const possiveisCampos = [
    "cover",
    "coverUrl",
    "cover_url",
    "thumbnail",
    "image",
    "imageUrl",
    "poster",
    "url"
  ];

  for (const campo of possiveisCampos) {
    const conteudo = valor[campo];

    if (
      typeof conteudo === "string" ||
      typeof conteudo === "number"
    ) {
      const capa = tratarUrlCapa(conteudo, storyId);

      if (capa) {
        return capa;
      }
    }
  }

  for (const conteudo of Object.values(valor)) {
    if (conteudo && typeof conteudo === "object") {
      const encontrado = extrairCapaDeJson(conteudo, storyId);

      if (encontrado) {
        return encontrado;
      }
    }
  }

  return "";
}

function extrairTituloDeJson(valor) {
  if (!valor || typeof valor !== "object") {
    return "";
  }

  if (typeof valor.title === "string" && valor.title.trim()) {
    return valor.title.trim();
  }

  if (typeof valor.name === "string" && valor.name.trim()) {
    return valor.name.trim();
  }

  return "";
}

function extrairAutorDeJson(valor) {
  if (!valor || typeof valor !== "object") {
    return {
      autor: "",
      userAutor: ""
    };
  }

  const user = valor.user || valor.author || valor.owner;

  if (user && typeof user === "object") {
    return {
      autor: user.name || user.fullname || "",
      userAutor: user.username || user.name || ""
    };
  }

  return {
    autor: "",
    userAutor: ""
  };
}

function extrairCapaDeHtml(html = "") {
  const ogImage = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  );

  if (ogImage) {
    return ogImage[1];
  }

  const twitterImage = html.match(
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
  );

  if (twitterImage) {
    return twitterImage[1];
  }

  return "";
}

async function buscarHtml(link) {
  const resposta = await fetch(link, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
    }
  });

  if (!resposta.ok) {
    throw new Error(`Wattpad respondeu com status ${resposta.status}`);
  }

  return resposta.text();
}

async function buscarJson(url) {
  const resposta = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
    }
  });

  if (!resposta.ok) {
    throw new Error(`Endpoint respondeu com status ${resposta.status}`);
  }

  return resposta.json();
}

async function buscarTextoCapituloPorId(partId) {
  if (!partId) {
    return "";
  }

  const endpoints = [
    `https://www.wattpad.com/apiv2/storytext?id=${partId}`,
    `https://www.wattpad.com/apiv2/storytext?id=${partId}&output=json`
  ];

  for (const endpoint of endpoints) {
    try {
      const resposta = await fetch(endpoint, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Accept: "text/html,application/json,text/plain,*/*",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
        }
      });

      if (!resposta.ok) {
        continue;
      }

      const texto = await resposta.text();

      if (texto && texto.trim()) {
        return texto;
      }
    } catch (error) {
      // tenta o próximo endpoint
    }
  }

  return "";
}

async function enriquecerCapituloComTexto(capitulo) {
  const partId = extrairIdDoLink(capitulo.linkWattpad);

  if (!partId) {
    return capitulo;
  }

  const htmlTexto = await buscarTextoCapituloPorId(partId);

  if (!htmlTexto) {
    return capitulo;
  }

  const totalParagrafos = contarParagrafosPorHtml(htmlTexto);
  const palavrasCalculadas = contarPalavrasTexto(htmlTexto);

  return {
    ...capitulo,
    totalParagrafos: totalParagrafos || capitulo.totalParagrafos || 0,
    totalPalavras:
      palavrasCalculadas > 0 ? palavrasCalculadas : capitulo.totalPalavras || 0
  };
}

async function enriquecerCapitulosComTexto(capitulos = []) {
  const capitulosEnriquecidos = [];

  for (const capitulo of capitulos) {
    const enriquecido = await enriquecerCapituloComTexto(capitulo);
    capitulosEnriquecidos.push(enriquecido);
  }

  return capitulosEnriquecidos;
}

async function buscarMetadadosObra(storyId, linkPreparado) {
  const endpoints = [
    `https://www.wattpad.com/api/v3/stories/${storyId}?fields=${encodeURIComponent(
      "id,title,cover,url,user(name,username)"
    )}`,
    `https://www.wattpad.com/api/v3/stories/${storyId}`,
    `https://www.wattpad.com/apiv2/story/${storyId}`
  ];

  for (const endpoint of endpoints) {
    try {
      const json = await buscarJson(endpoint);

      if (json && typeof json === "object") {
        return json;
      }
    } catch (error) {
      // tenta o próximo endpoint
    }
  }

  try {
    const html = await buscarHtml(linkPreparado);
    const nextData = extrairJsonNextData(html);

    if (nextData) {
      return nextData;
    }
  } catch (error) {
    // ignora
  }

  return null;
}

async function tentarBuscarPorApiInterna(storyId) {
  if (!storyId) {
    return {
      jsonBase: null,
      capitulos: []
    };
  }

  const fieldsStory =
    "id,title,description,url,cover,user(name,username),parts(id,title,url,wordCount,commentCount,voteCount,readCount,published,deleted,draft)";

  const fieldsParts =
    "id,title,url,wordCount,commentCount,voteCount,readCount,published,deleted,draft";

  const endpoints = [
    `https://www.wattpad.com/api/v3/stories/${storyId}?fields=${encodeURIComponent(fieldsStory)}`,
    `https://www.wattpad.com/api/v3/stories/${storyId}/parts?fields=${encodeURIComponent(fieldsParts)}`,
    `https://www.wattpad.com/api/v3/stories/${storyId}/parts`,
    `https://www.wattpad.com/api/v3/stories/${storyId}`,
    `https://www.wattpad.com/apiv2/story/${storyId}`
  ];

  let jsonBase = null;

  for (const endpoint of endpoints) {
    try {
      const json = await buscarJson(endpoint);

      if (!jsonBase) {
        jsonBase = json;
      }

      const encontrados = coletarCapitulosDeJson(json, []);

      if (encontrados.length > 0) {
        return {
          jsonBase,
          capitulos: encontrados
        };
      }

      if (Array.isArray(json?.parts)) {
        return {
          jsonBase,
          capitulos: json.parts
        };
      }

      if (Array.isArray(json?.data)) {
        return {
          jsonBase,
          capitulos: json.data
        };
      }
    } catch (error) {
      // tenta o próximo endpoint
    }
  }

  return {
    jsonBase,
    capitulos: []
  };
}

async function tentarBuscarPorHtml(linkPreparado) {
  const html = await buscarHtml(linkPreparado);

  let capitulosBrutos = [];

  const nextData = extrairJsonNextData(html);

  if (nextData) {
    capitulosBrutos = coletarCapitulosDeJson(nextData, []);
  }

  if (capitulosBrutos.length === 0) {
    const jsons = extrairJsonDeScripts(html);

    jsons.forEach((json) => {
      coletarCapitulosDeJson(json, capitulosBrutos);
    });
  }

  if (capitulosBrutos.length === 0) {
    capitulosBrutos = extrairCapitulosPorLinks(html);
  }

  return {
    html,
    jsonBase: nextData,
    capitulos: capitulosBrutos
  };
}

function montarMetadadosObra({ jsonBase, html, linkPreparado, storyId }) {
  const autorInfo = extrairAutorDeJson(jsonBase);
  const capaEncontrada =
    extrairCapaDeJson(jsonBase, storyId) ||
    extrairCapaDeHtml(html) ||
    montarUrlCapaPorId(storyId);

  return {
    tituloOriginal: extrairTituloDeJson(jsonBase),
    autorOriginal: autorInfo.autor,
    userAutorOriginal: autorInfo.userAutor,
    capaUrl: capaEncontrada,
    linkWattpad: linkPreparado
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return responder(res, 405, {
      sucesso: false,
      erro: "Método não permitido."
    });
  }

  try {
    const link =
      req.method === "GET"
        ? req.query?.link
        : typeof req.body === "string"
          ? JSON.parse(req.body).link
          : req.body?.link;

    if (!link) {
      return responder(res, 400, {
        sucesso: false,
        erro: "Informe o link da obra do Wattpad."
      });
    }

    const linkPreparado = montarLinkWattpad(link);
    const storyId = extrairIdDoLink(linkPreparado);

    let capitulosBrutos = [];
    let jsonBase = null;
    let htmlBase = "";

    const metadados = await buscarMetadadosObra(storyId, linkPreparado);

    if (metadados) {
      jsonBase = metadados;
    }

    const resultadoApi = await tentarBuscarPorApiInterna(storyId);

    jsonBase = jsonBase || resultadoApi.jsonBase;
    capitulosBrutos = resultadoApi.capitulos;

    if (capitulosBrutos.length === 0 || !jsonBase) {
      const resultadoHtml = await tentarBuscarPorHtml(linkPreparado);

      htmlBase = resultadoHtml.html;
      jsonBase = jsonBase || resultadoHtml.jsonBase;
      capitulosBrutos = capitulosBrutos.length
        ? capitulosBrutos
        : resultadoHtml.capitulos;
    }

    if (!htmlBase) {
      try {
        htmlBase = await buscarHtml(linkPreparado);
      } catch (error) {
        htmlBase = "";
      }
    }

    const capitulosTransformados = capitulosBrutos.map((item, index) =>
      transformarEmCapitulo(item, index)
    );

    const capitulosFiltrados = filtrarEReordenarCapitulos(capitulosTransformados);
    const capitulos = await enriquecerCapitulosComTexto(capitulosFiltrados);

    const obra = montarMetadadosObra({
      jsonBase,
      html: htmlBase,
      linkPreparado,
      storyId
    });

    return responder(res, 200, {
      sucesso: true,
      storyId,
      obra,
      total: capitulos.length,
      capitulos,
      debug: {
        linkRecebido: link,
        linkPreparado,
        storyId,
        brutosEncontrados: capitulosBrutos.length,
        depoisDoFiltro: capitulos.length,
        capaEncontrada: Boolean(obra.capaUrl),
        capaUrl: obra.capaUrl
      }
    });
  } catch (error) {
    return responder(res, 500, {
      sucesso: false,
      erro:
        error?.message ||
        "Não consegui buscar os capítulos da obra no Wattpad."
    });
  }
}