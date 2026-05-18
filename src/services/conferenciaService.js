import { listarObras } from "./obrasService.js";
import { listarCapitulos } from "./capitulosService.js";
import { buscarRegraPadrao } from "./regrasService.js";
import { buscarComentariosDoCapitulo } from "./comentariosService.js";
import { interpretarFicha } from "../utils/interpretarFicha.js";
import { normalizarParaBusca } from "../utils/normalizarTexto.js";
import { estimarTempoLeitura } from "../utils/estimarTempoLeitura.js";
import {
  calcularConferenciaCapitulo,
  obterComentariosMinimosPorCapitulo
} from "../utils/calcularConferencia.js";

function avisarStatus(onStatus, etapa) {
  if (typeof onStatus === "function") {
    onStatus({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      horario: new Date().toISOString(),
      ...etapa
    });
  }
}

function limparParaComparacao(texto = "") {
  return normalizarParaBusca(texto)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function calcularSemelhanca(textoA = "", textoB = "") {
  const a = limparParaComparacao(textoA);
  const b = limparParaComparacao(textoB);

  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 100;
  }

  if (a.includes(b) || b.includes(a)) {
    return 80;
  }

  const palavrasA = new Set(a.split(" ").filter(Boolean));
  const palavrasB = new Set(b.split(" ").filter(Boolean));

  let iguais = 0;

  palavrasA.forEach((palavra) => {
    if (palavrasB.has(palavra)) {
      iguais += 1;
    }
  });

  const total = Math.max(palavrasA.size, palavrasB.size);

  if (total === 0) {
    return 0;
  }

  return Math.round((iguais / total) * 100);
}

function encontrarObraPorNome(nomeInformado, obras = []) {
  let melhorObra = null;
  let melhorPontuacao = 0;

  obras.forEach((obra) => {
    const pontuacao = calcularSemelhanca(nomeInformado, obra.nome);

    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorObra = obra;
    }
  });

  if (melhorPontuacao >= 65) {
    return {
      obra: melhorObra,
      pontuacao: melhorPontuacao
    };
  }

  return {
    obra: null,
    pontuacao: melhorPontuacao
  };
}

function encontrarCapituloPedido(capituloPedido, capitulos = []) {
  if (!capituloPedido) {
    return null;
  }

  if (capituloPedido.tipo === "prologo") {
    return (
      capitulos.find((capitulo) => capitulo.tipo === "prologo") ||
      capitulos.find((capitulo) =>
        normalizarParaBusca(capitulo.titulo || "").includes("prologo")
      ) ||
      null
    );
  }

  const numeroPedido = Number(capituloPedido.numero);

  if (!Number.isFinite(numeroPedido)) {
    return null;
  }

  return (
    capitulos.find((capitulo) => Number(capitulo.numero) === numeroPedido) ||
    capitulos.find((capitulo) => Number(capitulo.ordem) === numeroPedido) ||
    null
  );
}

async function montarResumoCapitulo({
  capituloPedido,
  capituloEncontrado,
  regra,
  usuario,
  leitura,
  onStatus
}) {
  if (!capituloEncontrado) {
    avisarStatus(onStatus, {
      tipo: "erro",
      titulo: "Capítulo não encontrado",
      detalhe: `${leitura?.obra || "Obra"} — ${capituloPedido?.texto || "Capítulo não identificado"}`
    });

    return {
      encontrado: false,
      pedido: capituloPedido,
      capitulo: null,
      status: "capitulo-nao-encontrado",
      statusTexto: "Capítulo não encontrado",
      comentariosMinimos: 0,
      totalComentarios: 0,
      distribuicao: {
        inicio: 0,
        meio: 0,
        fim: 0,
        semArea: 0
      },
      comentarios: [],
      tempoEstimado: {
        minutos: 0,
        segundos: 0,
        totalSegundos: 0,
        texto: "0 minuto"
      },
      tempoReal: {
        inicio: "",
        fim: "",
        totalSegundos: 0
      },
      motivos: ["Esse capítulo não foi encontrado na obra cadastrada."]
    };
  }

  avisarStatus(onStatus, {
    tipo: "andamento",
    titulo: "Calculando regras do capítulo",
    detalhe: `${capituloEncontrado.titulo} · ${capituloEncontrado.totalPalavras || 0} palavras`
  });

  const tempoEstimado = estimarTempoLeitura(
    Number(capituloEncontrado.totalPalavras) || 0,
    Number(regra.palavrasPorMinuto) || 250
  );

  const comentariosMinimos = obterComentariosMinimosPorCapitulo(
    capituloEncontrado,
    regra
  );

  let dadosComentarios = {
    totalDoUsuario: 0,
    distribuicao: {
      inicio: 0,
      meio: 0,
      fim: 0,
      semArea: 0
    },
    tempoReal: {
      inicio: "",
      fim: "",
      totalSegundos: 0
    },
    comentarios: []
  };

  try {
    avisarStatus(onStatus, {
      tipo: "andamento",
      titulo: "Buscando comentários no Wattpad",
      detalhe: `${usuario} em ${capituloEncontrado.titulo}`
    });

    dadosComentarios = await buscarComentariosDoCapitulo({
      linkCapitulo: capituloEncontrado.linkWattpad,
      usuario
    });

    avisarStatus(onStatus, {
      tipo: "sucesso",
      titulo: "Comentários encontrados",
      detalhe: `${capituloEncontrado.titulo}: ${dadosComentarios.totalDoUsuario || 0} comentário(s) de ${usuario}`
    });
  } catch (error) {
    avisarStatus(onStatus, {
      tipo: "erro",
      titulo: "Erro ao buscar comentários",
      detalhe: `${capituloEncontrado.titulo}: ${error.message || "erro desconhecido"}`
    });

    return {
      encontrado: true,
      pedido: capituloPedido,
      capitulo: capituloEncontrado,
      status: "erro-comentarios",
      statusTexto: "Erro ao buscar comentários",
      comentariosMinimos,
      totalComentarios: 0,
      distribuicao: {
        inicio: 0,
        meio: 0,
        fim: 0,
        semArea: 0
      },
      comentarios: [],
      tempoEstimado,
      tempoReal: {
        inicio: "",
        fim: "",
        totalSegundos: 0
      },
      motivos: [error.message || "Não consegui buscar os comentários desse capítulo."]
    };
  }

  avisarStatus(onStatus, {
    tipo: "andamento",
    titulo: "Aplicando regras",
    detalhe: `${capituloEncontrado.titulo}: mínimo ${comentariosMinimos} comentário(s)`
  });

  const resultado = calcularConferenciaCapitulo({
    comentarios: dadosComentarios.comentarios,
    capitulo: capituloEncontrado,
    regra,
    tempoRealSegundos: dadosComentarios.tempoReal.totalSegundos,
    tempoEstimadoSegundos: tempoEstimado.totalSegundos
  });

  avisarStatus(onStatus, {
    tipo: resultado.status === "aprovado" ? "sucesso" : "erro",
    titulo:
      resultado.status === "aprovado"
        ? "Capítulo aprovado"
        : "Capítulo reprovado",
    detalhe:
      resultado.status === "aprovado"
        ? `${capituloEncontrado.titulo} passou nas regras.`
        : `${capituloEncontrado.titulo}: ${resultado.motivos.join(" ")}`
  });

  return {
    encontrado: true,
    pedido: capituloPedido,
    capitulo: capituloEncontrado,
    status: resultado.status,
    statusTexto:
      resultado.status === "aprovado"
        ? "Leitura aprovada"
        : "Leitura reprovada",
    comentariosMinimos,
    totalComentarios: dadosComentarios.totalDoUsuario,
    distribuicao: dadosComentarios.distribuicao,
    comentarios: dadosComentarios.comentarios,
    tempoEstimado,
    tempoReal: dadosComentarios.tempoReal,
    motivos: resultado.motivos
  };
}

export async function conferirFichaComBanco(textoFicha, opcoes = {}) {
  const { onStatus } = opcoes;

  avisarStatus(onStatus, {
    tipo: "andamento",
    titulo: "Interpretando ficha",
    detalhe: "Lendo user, sub, obras e capítulos informados."
  });

  const ficha = interpretarFicha(textoFicha);

  avisarStatus(onStatus, {
    tipo: "sucesso",
    titulo: "Ficha interpretada",
    detalhe: `${ficha.user || "User não encontrado"} · ${ficha.leituras.length} leitura(s) encontrada(s).`
  });

  avisarStatus(onStatus, {
    tipo: "andamento",
    titulo: "Carregando regras",
    detalhe: "Buscando regras cadastradas no Firebase."
  });

  const regra = await buscarRegraPadrao();

  avisarStatus(onStatus, {
    tipo: "sucesso",
    titulo: "Regras carregadas",
    detalhe: `Padrão: ${regra.comentariosPadrao || 6} comentário(s).`
  });

  avisarStatus(onStatus, {
    tipo: "andamento",
    titulo: "Carregando obras",
    detalhe: "Buscando obras cadastradas."
  });

  const obras = await listarObras();

  avisarStatus(onStatus, {
    tipo: "sucesso",
    titulo: "Obras carregadas",
    detalhe: `${obras.length} obra(s) cadastrada(s).`
  });

  const resultados = [];

  for (const leitura of ficha.leituras) {
    avisarStatus(onStatus, {
      tipo: "andamento",
      titulo: "Analisando leitura",
      detalhe: leitura.obra || "Obra não informada"
    });

    if (leitura.minhaObra && regra.ignorarMinhaObra !== false) {
      avisarStatus(onStatus, {
        tipo: "sucesso",
        titulo: "Minha Obra ignorada",
        detalhe: leitura.obra || "Obra marcada como Minha Obra."
      });

      resultados.push({
        leitura,
        tipo: "minha-obra",
        status: "ignorado",
        statusTexto: "Minha Obra — ignorada",
        obraEncontrada: null,
        pontuacaoObra: 0,
        capitulos: [],
        motivos: ["A ficha marcou essa leitura como Minha Obra."]
      });

      continue;
    }

    const buscaObra = encontrarObraPorNome(leitura.obra, obras);

    if (!buscaObra.obra) {
      avisarStatus(onStatus, {
        tipo: "erro",
        titulo: "Obra não encontrada",
        detalhe: leitura.obra || "Nome não identificado."
      });

      resultados.push({
        leitura,
        tipo: "obra-nao-encontrada",
        status: "erro",
        statusTexto: "Obra não encontrada",
        obraEncontrada: null,
        pontuacaoObra: buscaObra.pontuacao,
        capitulos: [],
        motivos: [
          "Não encontrei uma obra cadastrada com nome parecido com o informado na ficha."
        ]
      });

      continue;
    }

    avisarStatus(onStatus, {
      tipo: "sucesso",
      titulo: "Obra encontrada",
      detalhe: `${buscaObra.obra.nome} · compatibilidade ${buscaObra.pontuacao}%`
    });

    avisarStatus(onStatus, {
      tipo: "andamento",
      titulo: "Carregando capítulos",
      detalhe: buscaObra.obra.nome
    });

    const capitulosDaObra = await listarCapitulos(buscaObra.obra.id);

    avisarStatus(onStatus, {
      tipo: "sucesso",
      titulo: "Capítulos carregados",
      detalhe: `${capitulosDaObra.length} capítulo(s) em ${buscaObra.obra.nome}.`
    });

    if (!leitura.capitulos.length) {
      avisarStatus(onStatus, {
        tipo: "erro",
        titulo: "Capítulos não identificados",
        detalhe: leitura.obra || "Obra sem capítulos informados."
      });

      resultados.push({
        leitura,
        tipo: "sem-capitulos",
        status: "erro",
        statusTexto: "Capítulos não identificados",
        obraEncontrada: buscaObra.obra,
        pontuacaoObra: buscaObra.pontuacao,
        capitulos: [],
        motivos: [
          "A obra foi encontrada, mas não consegui identificar quais capítulos foram lidos na ficha."
        ]
      });

      continue;
    }

    const capitulosResultado = [];

    for (const capituloPedido of leitura.capitulos) {
      avisarStatus(onStatus, {
        tipo: "andamento",
        titulo: "Procurando capítulo",
        detalhe: `${leitura.obra}: ${capituloPedido.texto || capituloPedido.numero || "capítulo"}`
      });

      const capituloEncontrado = encontrarCapituloPedido(
        capituloPedido,
        capitulosDaObra
      );

      if (capituloEncontrado) {
        avisarStatus(onStatus, {
          tipo: "sucesso",
          titulo: "Capítulo encontrado",
          detalhe: capituloEncontrado.titulo
        });
      }

      const resumo = await montarResumoCapitulo({
        capituloPedido,
        capituloEncontrado,
        regra,
        usuario: ficha.user,
        leitura,
        onStatus
      });

      capitulosResultado.push(resumo);
    }

    const temErro = capitulosResultado.some((item) => !item.encontrado);

    const temReprovado = capitulosResultado.some(
      (item) => item.status === "reprovado" || item.status === "erro-comentarios"
    );

    const statusLeitura = temErro ? "parcial" : temReprovado ? "reprovado" : "aprovado";

    avisarStatus(onStatus, {
      tipo: statusLeitura === "aprovado" ? "sucesso" : "erro",
      titulo:
        statusLeitura === "aprovado"
          ? "Leitura aprovada"
          : "Leitura com pendência",
      detalhe: leitura.obra || "Leitura analisada."
    });

    resultados.push({
      leitura,
      tipo: "obra-encontrada",
      status: statusLeitura,
      statusTexto: temErro
        ? "Obra encontrada, mas há capítulo pendente"
        : temReprovado
          ? "Leitura reprovada"
          : "Leitura aprovada",
      obraEncontrada: buscaObra.obra,
      pontuacaoObra: buscaObra.pontuacao,
      capitulos: capitulosResultado,
      motivos: temErro
        ? ["Alguns capítulos da ficha não foram encontrados na obra cadastrada."]
        : []
    });
  }

  avisarStatus(onStatus, {
    tipo: "sucesso",
    titulo: "Conferência finalizada",
    detalhe: `${resultados.length} leitura(s) processada(s).`
  });

  return {
    ficha,
    regra,
    resultados
  };
}