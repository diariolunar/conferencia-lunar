import { atualizarCapaObra } from "./obrasService.js";

import {
  listarCapitulos,
  salvarCapitulosImportados
} from "./capitulosService.js";

import { buscarDadosDaObraWattpad } from "./wattpadService.js";

function normalizar(texto = "") {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function capitulosParecidos(a = {}, b = {}) {
  const tituloA = normalizar(a.titulo);
  const tituloB = normalizar(b.titulo);

  if (!tituloA || !tituloB) {
    return false;
  }

  if (tituloA === tituloB) {
    return true;
  }

  if (
    a.numero !== null &&
    a.numero !== undefined &&
    b.numero !== null &&
    b.numero !== undefined
  ) {
    return Number(a.numero) === Number(b.numero);
  }

  return false;
}

export async function sincronizarObraComWattpad(
  obra,
  opcoes = {}
) {
  const { onStatus } = opcoes;

  if (!obra?.linkWattpad) {
    throw new Error("A obra não possui link do Wattpad.");
  }

  if (typeof onStatus === "function") {
    onStatus({
      tipo: "andamento",
      titulo: "Sincronizando obra",
      detalhe: obra.nome
    });
  }

  const dados = await buscarDadosDaObraWattpad(
    obra.linkWattpad
  );

  const capitulosImportados = dados.capitulos || [];

  if (!capitulosImportados.length) {
    throw new Error(
      "Nenhum capítulo encontrado pela API segura do Wattpad."
    );
  }

  const capitulosAtuais = await listarCapitulos(obra.id);

  const novosCapitulos = [];

  capitulosImportados.forEach((capituloImportado) => {
    const jaExiste = capitulosAtuais.some((capituloAtual) =>
      capitulosParecidos(capituloAtual, capituloImportado)
    );

    if (!jaExiste) {
      novosCapitulos.push(capituloImportado);
    }
  });

  if (dados.obra?.capaUrl) {
    try {
      await atualizarCapaObra(
        obra.id,
        dados.obra.capaUrl
      );
    } catch (error) {
      console.error(error);
    }
  }

  if (novosCapitulos.length > 0) {
    await salvarCapitulosImportados(
      obra.id,
      novosCapitulos
    );
  }

  if (typeof onStatus === "function") {
    onStatus({
      tipo: "sucesso",
      titulo: "Obra sincronizada",
      detalhe: `${obra.nome}: ${novosCapitulos.length} novo(s) capítulo(s).`
    });
  }

  return {
    obra,
    adicionados: novosCapitulos.length,
    totalImportado: capitulosImportados.length,
    totalAtual: capitulosAtuais.length
  };
}

export async function sincronizarTodasAsObrasComWattpad(
  obras = [],
  opcoes = {}
) {
  const { onStatus } = opcoes;

  const resumo = {
    criados: 0,
    atualizados: 0,
    ignoradas: 0,
    erros: 0,
    detalhesErros: []
  };

  for (const obra of obras) {
    try {
      const resultado =
        await sincronizarObraComWattpad(
          obra,
          opcoes
        );

      resumo.criados += resultado.adicionados;
      resumo.atualizados += 1;
    } catch (error) {
      console.error(error);

      resumo.erros += 1;

      resumo.detalhesErros.push({
        obra: obra.nome || "Sem nome",
        link: obra.linkWattpad || "",
        erro:
          error.message ||
          "Erro desconhecido ao sincronizar."
      });

      if (typeof onStatus === "function") {
        onStatus({
          tipo: "erro",
          titulo: "Erro ao sincronizar",
          detalhe: `${obra.nome}: ${error.message}`
        });
      }
    }
  }

  return resumo;
}
