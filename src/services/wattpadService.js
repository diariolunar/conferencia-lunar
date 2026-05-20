export async function buscarDadosDaObraWattpad(linkWattpad) {
  const resposta = await fetch("/api/wattpad/capitulos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      link: linkWattpad
    })
  });

  let dados = null;

  try {
    dados = await resposta.json();
  } catch (error) {
    throw new Error(
      "A API do Wattpad não respondeu em JSON. Se estiver testando localmente, use npx vercel dev."
    );
  }

  if (!resposta.ok || !dados.sucesso) {
    throw new Error(dados?.erro || "Não consegui buscar dados no Wattpad.");
  }

  return {
    obra: dados.obra || {},
    capitulos: dados.capitulos || []
  };
}

export async function buscarCapitulosDaObraWattpad(linkWattpad) {
  const dados = await buscarDadosDaObraWattpad(linkWattpad);
  return dados.capitulos;
}
