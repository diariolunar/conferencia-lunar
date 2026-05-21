function extrairPartId(url = "") {
  const match = String(url).match(/wattpad\.com\/(\d+)/i);

  if (!match) {
    return null;
  }

  return match[1];
}

function dividirParagrafos(texto = "") {
  return String(texto)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function detectarArea(indice, total) {
  if (total <= 0) {
    return "semArea";
  }

  const inicioLimite = Math.floor(total / 3);
  const meioLimite = Math.floor((total / 3) * 2);

  if (indice <= inicioLimite) {
    return "inicio";
  }

  if (indice <= meioLimite) {
    return "meio";
  }

  return "fim";
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
    const { link, usuario } = req.body || {};

    if (!link || !usuario) {
      return res.status(400).json({
        sucesso: false,
        erro: "Informe o link e o usuário."
      });
    }

    const partId = extrairPartId(link);

    if (!partId) {
      return res.status(400).json({
        sucesso: false,
        erro: "Não consegui identificar o capítulo."
      });
    }

    const endpoint =
      `https://www.wattpad.com/v4/parts/${partId}/comments?limit=200`;

    const resposta = await fetch(endpoint);

    if (!resposta.ok) {
      return res.status(400).json({
        sucesso: false,
        erro: "Não consegui buscar os comentários."
      });
    }

    const dados = await resposta.json();

    const comentariosOriginais = dados.comments || [];
    const comentariosUsuario = comentariosOriginais.filter((comentario) => {
      const nome = comentario?.author?.name || "";
      return nome.toLowerCase() === usuario.toLowerCase();
    });

    const distribuicao = {
      inicio: 0,
      meio: 0,
      fim: 0,
      semArea: 0
    };

    const comentarios = comentariosUsuario.map((comentario) => {
      const paragrafos = dividirParagrafos(comentario.body || "");
      const totalParagrafos = paragrafos.length || 1;

      const indiceParagrafo = 0;
      const area = detectarArea(indiceParagrafo, totalParagrafos);

      distribuicao[area] += 1;

      return {
        id: comentario.id || "",
        usuario: comentario?.author?.name || "",
        texto: comentario.body || "",
        data: comentario.createDate || "",
        paragrafo: comentario.paragraphId || "",
        indiceParagrafo,
        area,
        deeplink: comentario.deeplink || ""
      };
    });

    const datas = comentarios
      .map((item) => new Date(item.data).getTime())
      .filter((item) => !Number.isNaN(item))
      .sort((a, b) => a - b);

    const inicio = datas[0] || null;
    const fim = datas[datas.length - 1] || null;

    return res.status(200).json({
      sucesso: true,
      partId,
      totalEncontrado: comentariosOriginais.length,
      totalDoUsuario: comentarios.length,
      totalParagrafos: comentarios.length,
      distribuicao,
      tempoReal: {
        inicio: inicio ? new Date(inicio).toISOString() : "",
        fim: fim ? new Date(fim).toISOString() : "",
        totalSegundos:
          inicio && fim ? Math.floor((fim - inicio) / 1000) : 0
      },
      comentarios
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      sucesso: false,
      erro: "Erro interno ao buscar comentários."
    });
  }
}