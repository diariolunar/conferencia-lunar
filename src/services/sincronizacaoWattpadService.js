import {
  atualizarCapitulo,
  criarCapitulo,
  listarCapitulos
} from "./capitulosService.js";

function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function criarChaveCapitulo(capitulo = {}) {
  if (capitulo.linkWattpad) {
    return `link:${capitulo.linkWattpad}`;
  }

  return `titulo:${normalizar(capitulo.titulo || "")}`;
}

function tratarCapituloImportado(capitulo = {}, ordem = 0) {
  return {
    titulo: capitulo.titulo || `Capítulo ${ordem + 1}`,
    numero: capitulo.numero ?? null,
    tipo: capitulo.tipo || "capitulo",
    linkWattpad: capitulo.linkWattpad || "",
    totalPalavras: Number(capitulo.totalPalavras) || 0,
    totalParagrafos: Number(capitulo.totalParagrafos) || 0,
    ordem: Number(capitulo.ordem ?? ordem),
    observacoes: capitulo.observacoes || ""
  };
}

export async function buscarCapitulosDoWattpad(linkWattpad) {
  const resposta = await fetch("/api/wattpad/capitulos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      link: linkWattpad
    })
  });

  const dados = await resposta.json();

  if (!resposta.ok || !dados.sucesso) {
    throw new Error(dados?.erro || "Não consegui buscar capítulos no Wattpad.");
  }

  return dados.capitulos || [];
}

export async function sincronizarObraComWattpad(obra, opcoes = {}) {
  const { onStatus } = opcoes;

  if (!obra?.id || !obra?.linkWattpad) {
    return {
      sucesso: false,
      ignorado: true,
      criados: 0,
      atualizados: 0,
      totalWattpad: 0,
      mensagem: "Obra sem link do Wattpad."
    };
  }

  onStatus?.({
    tipo: "andamento",
    titulo: "Sincronizando Wattpad",
    detalhe: obra.nome
  });

  const capitulosWattpad = await buscarCapitulosDoWattpad(obra.linkWattpad);
  const capitulosSalvos = await listarCapitulos(obra.id);

  const mapaSalvos = new Map();

  capitulosSalvos.forEach((capitulo) => {
    mapaSalvos.set(criarChaveCapitulo(capitulo), capitulo);
  });

  let criados = 0;
  let atualizados = 0;

  for (let index = 0; index < capitulosWattpad.length; index += 1) {
    const capituloTratado = tratarCapituloImportado(capitulosWattpad[index], index);
    const chave = criarChaveCapitulo(capituloTratado);
    const existente = mapaSalvos.get(chave);

    if (!existente) {
      await criarCapitulo(obra.id, capituloTratado);
      criados += 1;
      continue;
    }

    const mudou =
      existente.titulo !== capituloTratado.titulo ||
      Number(existente.totalPalavras || 0) !== Number(capituloTratado.totalPalavras || 0) ||
      Number(existente.totalParagrafos || 0) !== Number(capituloTratado.totalParagrafos || 0) ||
      Number(existente.ordem || 0) !== Number(capituloTratado.ordem || 0);

    if (mudou) {
      await atualizarCapitulo(obra.id, existente.id, {
        ...existente,
        ...capituloTratado
      });

      atualizados += 1;
    }
  }

  onStatus?.({
    tipo: "sucesso",
    titulo: "Obra sincronizada",
    detalhe: `${obra.nome}: ${criados} novo(s), ${atualizados} atualizado(s).`
  });

  return {
    sucesso: true,
    ignorado: false,
    criados,
    atualizados,
    totalWattpad: capitulosWattpad.length
  };
}

export async function sincronizarTodasAsObrasComWattpad(obras = [], opcoes = {}) {
  const { onStatus } = opcoes;

  const resumo = {
    obras: obras.length,
    sincronizadas: 0,
    ignoradas: 0,
    criados: 0,
    atualizados: 0,
    erros: 0
  };

  for (const obra of obras) {
    try {
      const resultado = await sincronizarObraComWattpad(obra, { onStatus });

      if (resultado.ignorado) {
        resumo.ignoradas += 1;
      } else {
        resumo.sincronizadas += 1;
      }

      resumo.criados += resultado.criados || 0;
      resumo.atualizados += resultado.atualizados || 0;
    } catch (error) {
      console.error(error);
      resumo.erros += 1;

      onStatus?.({
        tipo: "erro",
        titulo: "Erro ao sincronizar obra",
        detalhe: `${obra.nome}: ${error.message}`
      });
    }
  }

  return resumo;
}
