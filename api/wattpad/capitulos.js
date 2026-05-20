function extrairStoryId(link = "") {
  const texto = String(link);

  const porStory = texto.match(/story\/(\d+)/);
  if (porStory) return porStory[1];

  const porNumero = texto.match(/wattpad\.com\/(\d+)/);
  if (porNumero) return porNumero[1];

  return "";
}

function limparTexto(texto = "") {
  return String(texto)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function extrairNumeroReal(titulo = "") {
  const busca = normalizar(titulo);
  const match = busca.match(/\b(?:capitulo|cap|chapter)\s*(\d+)\b/);

  if (match) {
    return Number(match[1]);
  }

  return null;
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

function contarPalavras(texto = "") {
  const limpo = limparTexto(texto);

  if (!limpo) {
    return 0;
  }

  return limpo.split(/\s+/).filter(Boolean).length;
}

function contarParagrafos(texto = "") {
  const matches = String(texto).match(/<p[\s\S]*?<\/p>/gi);

  if (matches?.length) {
    return matches.length;
  }

  return String(texto)
    .split(/\n+/)
    .map((linha) => linha.trim())
    .filter(Boolean).length;
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

async function buscarTexto(url) {
  const resposta = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "text/html,*/*"
    }
  });

  if (!resposta.ok) {
    throw new Error(`Status ${resposta.status}`);
  }

  return resposta.text();
}

async function buscarPartesPorApi(storyId) {
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
        [];

      if (Array.isArray(partes) && partes.length > 0) {
        return partes;
      }
    } catch {
      // tenta o próximo
    }
  }

  return [];
}

async function buscarTextoParte(partId) {
  const urls = [
    `https://www.wattpad.com/apiv2/storytext?id=${partId}`,
    `https://www.wattpad.com/api/v3/parts/${partId}`
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

function converterParteEmCapitulo(parte, index) {
  const id = parte.id || parte.partId || parte.url?.match(/\/(\d+)/)?.[1] || "";
  const titulo = parte.title || parte.titulo || parte.name || `Capítulo ${index + 1}`;
  const linkWattpad =
    parte.url ||
    parte.link ||
    (id ? `https://www.wattpad.com/${id}` : "");

  const tipo = detectarTipo(titulo);
  const numeroReal = tipo === "prologo" ? 0 : extrairNumeroReal(titulo);

  return {
    idWattpad: String(id),
    titulo,
    numero: numeroReal,
    tipo,
    linkWattpad,
    totalPalavras: Number(parte.wordCount || parte.word_count || parte.words || 0),
    totalParagrafos: 0,
    ordem: index,
    observacoes: ""
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

    const partes = await buscarPartesPorApi(storyId);

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
          const texto = await buscarTextoParte(capitulo.idWattpad);

          if (texto) {
            capitulo.totalPalavras =
              capitulo.totalPalavras || contarPalavras(texto);
            capitulo.totalParagrafos = contarParagrafos(texto);
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
      capitulos
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      sucesso: false,
      erro: error.message || "Erro ao buscar capítulos do Wattpad."
    });
  }
}
