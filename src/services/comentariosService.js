export async function buscarComentariosDoCapitulo({ linkCapitulo, usuario }) {
  const resposta = await fetch("/api/wattpad/comentarios", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      link: linkCapitulo,
      usuario
    })
  });

  let dados = null;

  try {
    dados = await resposta.json();
  } catch (error) {
    throw new Error(
      "A API de comentários não respondeu em JSON. Use npx vercel dev para testar."
    );
  }

  if (!resposta.ok || !dados.sucesso) {
    throw new Error(dados?.erro || "Não consegui buscar comentários.");
  }

  return {
    partId: dados.partId,
    totalParagrafos: dados.totalParagrafos || 0,
    totalEncontrado: dados.totalEncontrado || 0,
    totalDoUsuario: dados.totalDoUsuario || 0,
    distribuicao: dados.distribuicao || {
      inicio: 0,
      meio: 0,
      fim: 0,
      semArea: 0
    },
    tempoReal: dados.tempoReal || {
      inicio: "",
      fim: "",
      totalSegundos: 0
    },
    comentarios: dados.comentarios || []
  };
}