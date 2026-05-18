function responder(res, status, dados) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(dados));
}

function normalizarTexto(texto = "") {
  return String(texto)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function extrairIdDoLink(link = "") {
  const texto = String(link);

  const matchWattpad = texto.match(/wattpad\.com\/(\d+)/i);

  if (matchWattpad) {
    return matchWattpad[1];
  }

  const matchNumero = texto.match(/(\d{6,})/);

  if (matchNumero) {
    return matchNumero[1];
  }

  return "";
}

function montarLinkCapitulo(valor = "") {
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
    throw new Error(`Status ${resposta.status}`);
  }

  return resposta.json();
}

async function buscarTexto(url) {
  const resposta = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      Accept: "text/html,application/json,text/plain,*/*",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
    }
  });

  if (!resposta.ok) {
    throw new Error(`Status ${resposta.status}`);
  }

  return resposta.text();
}

function pareceComentario(item) {
  if (!item || typeof item !== "object") {
    return false;
  }

  const temTexto =
    typeof item.body === "string" ||
    typeof item.comment === "string" ||
    typeof item.text === "string" ||
    typeof item.message === "string" ||
    typeof item.content === "string";

  const temUsuario =
    item.user ||
    item.username ||
    item.author ||
    item.creator ||
    item.owner ||
    item.commenter;

  return Boolean(temTexto && temUsuario);
}

function procurarArraysDeComentarios(valor, encontrados = []) {
  if (!valor) {
    return encontrados;
  }

  if (Array.isArray(valor)) {
    const pareceListaDeComentarios = valor.filter(pareceComentario);

    if (pareceListaDeComentarios.length > 0) {
      pareceListaDeComentarios.forEach((item) => encontrados.push(item));
    }

    valor.forEach((item) => procurarArraysDeComentarios(item, encontrados));
    return encontrados;
  }

  if (typeof valor === "object") {
    Object.values(valor).forEach((conteudo) => {
      procurarArraysDeComentarios(conteudo, encontrados);
    });
  }

  return encontrados;
}

function extrairUsuario(item = {}) {
  const user = item.user || item.author || item.creator || item.owner || item.commenter;

  if (typeof user === "string") {
    return user;
  }

  if (user && typeof user === "object") {
    return user.username || user.name || user.fullname || user.login || "";
  }

  return item.username || item.userName || item.user_name || "";
}

function extrairTextoComentario(item = {}) {
  return limparHtml(
    item.body ||
      item.comment ||
      item.text ||
      item.message ||
      item.content ||
      ""
  );
}

function extrairDataComentario(item = {}) {
  return (
    item.createDate ||
    item.createdAt ||
    item.created_at ||
    item.date ||
    item.timestamp ||
    item.time ||
    ""
  );
}

function extrairParagrafoComentario(item = {}) {
  const direto =
    item.paragraphId ||
    item.paragraph_id ||
    item.paragraph ||
    item.position ||
    item.anchor ||
    "";

  if (direto) {
    return direto;
  }

  const possiveis =
    item.annotation ||
    item.highlight ||
    item.target ||
    item.thread ||
    item.location ||
    null;

  if (typeof possiveis === "number" || typeof possiveis === "string") {
    return possiveis;
  }

  if (possiveis && typeof possiveis === "object") {
    return (
      possiveis.paragraphId ||
      possiveis.paragraph_id ||
      possiveis.paragraph ||
      possiveis.position ||
      possiveis.id ||
      ""
    );
  }

  return "";
}

function extrairParagrafosDoTextoCapitulo(html = "") {
  const texto = String(html || "");
  const paragrafos = [];

  const regexDataPid =
    /<(p|div)[^>]+data-p-id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/\1>/gi;

  let match;

  while ((match = regexDataPid.exec(texto)) !== null) {
    const id = match[2];
    const conteudo = limparHtml(match[3]);

    if (id && conteudo) {
      paragrafos.push({
        id,
        texto: conteudo
      });
    }
  }

  if (paragrafos.length > 0) {
    return paragrafos;
  }

  const regexP = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;

  while ((match = regexP.exec(texto)) !== null) {
    const conteudo = limparHtml(match[1]);

    if (conteudo) {
      paragrafos.push({
        id: `paragrafo-${paragrafos.length + 1}`,
        texto: conteudo
      });
    }
  }

  return paragrafos;
}

function classificarAreaPorIndice(indice, total) {
  if (!Number.isFinite(indice) || indice < 0 || !total) {
    return "semArea";
  }

  const percentual = indice / total;

  if (percentual < 1 / 3) {
    return "inicio";
  }

  if (percentual < 2 / 3) {
    return "meio";
  }

  return "fim";
}

function montarMapaParagrafos(paragrafos = []) {
  const mapa = new Map();

  paragrafos.forEach((paragrafo, index) => {
    mapa.set(String(paragrafo.id), {
      index,
      total: paragrafos.length,
      area: classificarAreaPorIndice(index, paragrafos.length)
    });
  });

  return mapa;
}

function formatarComentario(item = {}, index = 0, mapaParagrafos = new Map()) {
  const paragrafo = String(extrairParagrafoComentario(item) || "");
  const infoParagrafo = mapaParagrafos.get(paragrafo);

  return {
    id: item.id || item.commentId || item.comment_id || `comentario-${index}`,
    usuario: extrairUsuario(item),
    texto: extrairTextoComentario(item),
    data: extrairDataComentario(item),
    paragrafo,
    indiceParagrafo: infoParagrafo ? infoParagrafo.index : null,
    area: infoParagrafo ? infoParagrafo.area : "semArea",
    deeplink: item.deeplink || item.link || "",
    bruto: item
  };
}

function filtrarPorUsuario(comentarios = [], usuario = "") {
  const usuarioBusca = normalizarTexto(usuario);

  if (!usuarioBusca) {
    return comentarios;
  }

  return comentarios.filter((comentario) => {
    const atual = normalizarTexto(comentario.usuario);
    return atual === usuarioBusca;
  });
}

function calcularTempoReal(comentarios = []) {
  const datas = comentarios
    .map((comentario) => {
      const data = new Date(comentario.data).getTime();
      return Number.isFinite(data) ? data : null;
    })
    .filter(Boolean)
    .sort((a, b) => a - b);

  if (datas.length < 2) {
    return {
      inicio: datas[0] ? new Date(datas[0]).toISOString() : "",
      fim: datas[0] ? new Date(datas[0]).toISOString() : "",
      totalSegundos: 0
    };
  }

  const inicio = datas[0];
  const fim = datas[datas.length - 1];

  return {
    inicio: new Date(inicio).toISOString(),
    fim: new Date(fim).toISOString(),
    totalSegundos: Math.max(0, Math.round((fim - inicio) / 1000))
  };
}

function calcularDistribuicao(comentarios = []) {
  return comentarios.reduce(
    (acc, comentario) => {
      const area = comentario.area || "semArea";

      if (!acc[area]) {
        acc[area] = 0;
      }

      acc[area] += 1;

      return acc;
    },
    {
      inicio: 0,
      meio: 0,
      fim: 0,
      semArea: 0
    }
  );
}

async function buscarTextoCapituloPorId(partId) {
  const endpoints = [
    `https://www.wattpad.com/apiv2/storytext?id=${partId}`,
    `https://www.wattpad.com/apiv2/storytext?id=${partId}&output=json`
  ];

  for (const endpoint of endpoints) {
    try {
      const texto = await buscarTexto(endpoint);

      if (texto && texto.trim()) {
        return texto;
      }
    } catch (error) {
      // tenta o próximo endpoint
    }
  }

  return "";
}

async function tentarEndpoint(endpoint) {
  try {
    const json = await buscarJson(endpoint);
    const encontrados = procurarArraysDeComentarios(json, []);

    return {
      endpoint,
      sucesso: true,
      quantidade: encontrados.length,
      comentarios: encontrados,
      erro: ""
    };
  } catch (error) {
    return {
      endpoint,
      sucesso: false,
      quantidade: 0,
      comentarios: [],
      erro: error.message
    };
  }
}

async function buscarComentariosPorEndpoints(partId) {
  const endpoints = [
    `https://www.wattpad.com/v4/parts/${partId}/comments?limit=100`,
    `https://www.wattpad.com/v5/parts/${partId}/comments?limit=100`,
    `https://www.wattpad.com/api/v3/parts/${partId}/comments?limit=100`,
    `https://www.wattpad.com/apiv2/comments?group_id=${partId}&limit=100`,
    `https://www.wattpad.com/apiv2/comments?part_id=${partId}&limit=100`
  ];

  const tentativas = [];

  for (const endpoint of endpoints) {
    const tentativa = await tentarEndpoint(endpoint);
    tentativas.push(tentativa);

    if (tentativa.quantidade > 0) {
      return {
        encontrados: tentativa.comentarios,
        tentativas
      };
    }
  }

  return {
    encontrados: [],
    tentativas
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
    const entrada =
      req.method === "GET"
        ? req.query || {}
        : typeof req.body === "string"
          ? JSON.parse(req.body)
          : req.body || {};

    const link = entrada.link || entrada.linkCapitulo || "";
    const usuario = entrada.usuario || entrada.user || "";

    if (!link) {
      return responder(res, 400, {
        sucesso: false,
        erro: "Informe o link do capítulo."
      });
    }

    const linkCapitulo = montarLinkCapitulo(link);
    const partId = extrairIdDoLink(linkCapitulo);

    if (!partId) {
      return responder(res, 400, {
        sucesso: false,
        erro: "Não consegui identificar o ID do capítulo pelo link."
      });
    }

    const htmlCapitulo = await buscarTextoCapituloPorId(partId);
    const paragrafos = extrairParagrafosDoTextoCapitulo(htmlCapitulo);
    const mapaParagrafos = montarMapaParagrafos(paragrafos);

    const resultadoEndpoints = await buscarComentariosPorEndpoints(partId);

    const comentariosFormatados = resultadoEndpoints.encontrados.map((item, index) =>
      formatarComentario(item, index, mapaParagrafos)
    );

    const comentariosUsuario = filtrarPorUsuario(comentariosFormatados, usuario);
    const distribuicao = calcularDistribuicao(comentariosUsuario);
    const tempoReal = calcularTempoReal(comentariosUsuario);

    return responder(res, 200, {
      sucesso: true,
      partId,
      usuarioInformado: usuario,
      totalParagrafos: paragrafos.length,
      totalEncontrado: comentariosFormatados.length,
      totalDoUsuario: comentariosUsuario.length,
      distribuicao,
      tempoReal,
      comentarios: comentariosUsuario,
      amostraTodos: comentariosFormatados.slice(0, 5),
      debug: {
        linkRecebido: link,
        linkCapitulo,
        paragrafosMapeados: paragrafos.length,
        tentativas: resultadoEndpoints.tentativas.map((tentativa) => ({
          endpoint: tentativa.endpoint,
          sucesso: tentativa.sucesso,
          quantidade: tentativa.quantidade,
          erro: tentativa.erro
        }))
      }
    });
  } catch (error) {
    return responder(res, 500, {
      sucesso: false,
      erro: error?.message || "Não consegui buscar os comentários."
    });
  }
}