function extrairIdDaHistoria(url = "") {
  const match = String(url).match(/wattpad\.com\/story\/(\d+)/i);

  if (!match) {
    return null;
  }

  return match[1];
}

function limparTexto(texto = "") {
  return String(texto)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function calcularPalavras(texto = "") {
  return limparTexto(texto)
    .split(/\s+/)
    .filter(Boolean).length;
}

function calcularParagrafos(texto = "") {
  return String(texto)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function detectarTipoCapitulo(titulo = "") {
  const texto = String(titulo).toLowerCase();

  if (texto.includes("prólogo") || texto.includes("prologo")) {
    return "prologo";
  }

  if (texto.includes("extra")) {
    return "extra";
  }

  if (texto.includes("bônus") || texto.includes("bonus")) {
    return "bonus";
  }

  if (texto.includes("especial")) {
    return "especial";
  }

  if (texto.includes("poesia")) {
    return "poesia";
  }

  return "capitulo";
}

function extrairNumeroCapitulo(titulo = "") {
  const numeros = String(titulo).match(/\d+/g);

  if (!numeros || numeros.length === 0) {
    return null;
  }

  return Number(numeros[0]);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      sucesso: false,
      erro: "Método não permitido."
    });
  }

  try {
    const { link } = req.body || {};

    if (!link) {
      return res.status(400).json({
        sucesso: false,
        erro: "Informe o link da obra."
      });
    }

    const storyId = extrairIdDaHistoria(link);

    if (!storyId) {
      return res.status(400).json({
        sucesso: false,
        erro: "Não consegui identificar o ID da obra."
      });
    }

    const resposta = await fetch(
      `https://www.wattpad.com/api/v3/stories/${storyId}`
    );

    if (!resposta.ok) {
      return res.status(400).json({
        sucesso: false,
        erro: "Não consegui acessar a obra."
      });
    }

    const dados = await resposta.json();

    const partes = dados.parts || [];

    const capitulos = partes.map((parte, index) => {
      const texto = parte.text || "";

      return {
        id: parte.id || "",
        titulo: parte.title || `Capítulo ${index + 1}`,
        numero: extrairNumeroCapitulo(parte.title || ""),
        tipo: detectarTipoCapitulo(parte.title || ""),
        link: `https://www.wattpad.com/${parte.id}`,
        totalPalavras: calcularPalavras(texto),
        totalParagrafos: calcularParagrafos(texto),
        ordem: index + 1
      };
    });

    return res.status(200).json({
      sucesso: true,
      storyId,
      titulo: dados.title || "",
      capa: dados.cover || "",
      capitulos
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      sucesso: false,
      erro: "Erro interno ao buscar capítulos."
    });
  }
}