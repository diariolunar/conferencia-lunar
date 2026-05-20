import {
  atualizarCapitulo,
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

function criarChaveCapitulo(capitulo = {}) {
  if (capitulo.linkWattpad) {
    return `link:${String(capitulo.linkWattpad).trim()}`;
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

function dadosMudaram(capituloSalvo = {}, capituloNovo = {}) {
  return (
    String(capituloSalvo.titulo || "") !== String(capituloNovo.titulo || "") ||
    String(capituloSalvo.linkWattpad || "") !== String(capituloNovo.linkWattpad || "") ||
    String(capituloSalvo.tipo || "") !== String(capituloNovo.tipo || "") ||
    Number(capituloSalvo.numero ?? -999) !== Number(capituloNovo.numero ?? -999) ||
    Number(capituloSalvo.totalPalavras || 0) !== Number(capituloNovo.totalPalavras || 0) ||
    Number(capituloSalvo.totalParagrafos || 0) !== Number(capituloNovo.totalParagrafos || 0) ||
    Number(capituloSalvo.ordem || 0) !== Number(capituloNovo.ordem || 0)
  );
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

    if (dadosMudaram(existente, capituloTratado)) {
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
    totalWattpad: capitulosWattpad.length,
    mensagem: `${criados} novo(s), ${atualizados} atualizado(s).`
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
      resumo.atualizados += resultado.atualizados || 0;
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
