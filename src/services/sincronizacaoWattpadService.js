import {
  criarCapitulo,
  listarCapitulos
} from "./capitulosService.js";

import { buscarDadosDaObraWattpad } from "./wattpadService.js";

function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function criarChavePorLink(link = "") {
  return String(link || "").trim().toLowerCase();
}

function criarChavePorTitulo(titulo = "") {
  return normalizar(titulo || "");
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

function capituloJaExiste(capituloNovo = {}, capitulosSalvos = []) {
  const linkNovo = criarChavePorLink(capituloNovo.linkWattpad);
  const tituloNovo = criarChavePorTitulo(capituloNovo.titulo);

  return capitulosSalvos.some((capituloSalvo) => {
    const linkSalvo = criarChavePorLink(capituloSalvo.linkWattpad);
    const tituloSalvo = criarChavePorTitulo(capituloSalvo.titulo);

    if (linkNovo && linkSalvo && linkNovo === linkSalvo) {
      return true;
    }

    if (!linkNovo && !linkSalvo && tituloNovo && tituloNovo === tituloSalvo) {
      return true;
    }

    return false;
  });
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
    detalhe: obra.nome || "Obra sem nome"
  });

  const dadosWattpad = await buscarDadosDaObraWattpad(obra.linkWattpad);
  const capitulosWattpad = dadosWattpad.capitulos || [];

  if (!capitulosWattpad.length) {
    return {
      sucesso: true,
      ignorado: false,
      criados: 0,
      atualizados: 0,
      totalWattpad: 0,
      mensagem: "Nenhum capítulo encontrado no Wattpad."
    };
  }

  const capitulosSalvos = await listarCapitulos(obra.id);

  let criados = 0;

  for (let index = 0; index < capitulosWattpad.length; index += 1) {
    const capituloTratado = tratarCapituloImportado(capitulosWattpad[index], index);

    if (capituloJaExiste(capituloTratado, capitulosSalvos)) {
      continue;
    }

    await criarCapitulo(obra.id, capituloTratado);
    capitulosSalvos.push(capituloTratado);
    criados += 1;
  }

  onStatus?.({
    tipo: "sucesso",
    titulo: "Obra sincronizada",
    detalhe: `${obra.nome}: ${criados} novo(s).`
  });

  return {
    sucesso: true,
    ignorado: false,
    criados,
    atualizados: 0,
    totalWattpad: capitulosWattpad.length,
    mensagem: `${criados} novo(s).`
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
    erros: 0,
    detalhesErros: []
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
    } catch (error) {
      console.error(error);

      resumo.erros += 1;
      resumo.detalhesErros.push({
        obra: obra.nome || "Obra sem nome",
        link: obra.linkWattpad || "",
        erro: error.message || "Erro desconhecido"
      });

      onStatus?.({
        tipo: "erro",
        titulo: "Erro ao sincronizar obra",
        detalhe: `${obra.nome || "Obra sem nome"}: ${error.message || "Erro desconhecido"}`
      });
    }
  }

  return resumo;
}
