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
      id: `${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
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
    return 85;
  }

  const palavrasA = new Set(
    a.split(" ").filter(Boolean)
  );

  const palavrasB = new Set(
    b.split(" ").filter(Boolean)
  );

  let iguais = 0;

  palavrasA.forEach((palavra) => {
    if (palavrasB.has(palavra)) {
      iguais += 1;
    }
  });

  const total = Math.max(
    palavrasA.size,
    palavrasB.size
  );

  if (total === 0) {
    return 0;
  }

  return Math.round((iguais / total) * 100);
}

function encontrarObraPorNome(
  nomeInformado,
  obras = []
) {
  let melhorObra = null;
  let melhorPontuacao = 0;

  obras.forEach((obra) => {
    const pontuacao = calcularSemelhanca(
      nomeInformado,
      obra.nome
    );

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

function limparTituloCapitulo(titulo = "") {
  return limparParaComparacao(titulo)
    .replace(/\bcapitulo\b/g, "")
    .replace(/\bcap\b/g, "")
    .replace(/\bchapter\b/g, "")
    .replace(/\bprologo\b/g, "")
    .replace(/\bparte\b/g, "")
    .replace(/\bepisodio\b/g, "")
    .replace(/\bep\b/g, "")
    .replace(/\b\d+\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function encontrarCapituloPorTitulo(
  textoPedido = "",
  capitulos = []
) {
  const pedidoLimpo =
    limparTituloCapitulo(textoPedido);

  if (!pedidoLimpo) {
    return null;
  }

  let melhorCapitulo = null;
  let melhorPontuacao = 0;

  capitulos.forEach((capitulo) => {
    const tituloLimpo = limparTituloCapitulo(
      capitulo.titulo || ""
    );

    const pontuacao = calcularSemelhanca(
      pedidoLimpo,
      tituloLimpo
    );

    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorCapitulo = capitulo;
    }
  });

  if (melhorPontuacao >= 70) {
    return melhorCapitulo;
  }

  return null;
}

function encontrarCapituloPedido(
  capituloPedido,
  capitulos = []
) {
  if (!capituloPedido) {
    return null;
  }

  const textoPedido =
    capituloPedido.texto ||
    capituloPedido.titulo ||
    capituloPedido.nome ||
    "";

  if (capituloPedido.tipo === "prologo") {
    return (
      capitulos.find(
        (capitulo) =>
          capitulo.tipo === "prologo"
      ) ||
      capitulos.find((capitulo) =>
        normalizarParaBusca(
          capitulo.titulo || ""
        ).includes("prologo")
      ) ||
      encontrarCapituloPorTitulo(
        textoPedido,
        capitulos
      ) ||
      null
    );
  }

  const numeroPedido = Number(
    capituloPedido.numero
  );

  if (
    Number.isFinite(numeroPedido) &&
    numeroPedido > 0
  ) {
    const porNumero =
      capitulos.find(
        (capitulo) =>
          Number(capitulo.numero) ===
          numeroPedido
      ) ||
      capitulos.find(
        (capitulo) =>
          Number(capitulo.ordem) ===
          numeroPedido
      ) ||
      null;

    if (porNumero) {
      return porNumero;
    }
  }

  return encontrarCapituloPorTitulo(
    textoPedido,
    capitulos
  );
}

export async function prepararPlanoConferencia(
  textoFicha,
  opcoes = {}
) {
  const { onStatus } = opcoes;

  avisarStatus(onStatus, {
    tipo: "andamento",
    titulo: "Interpretando ficha",
    detalhe:
      "Lendo obras e capítulos."
  });

  const ficha = interpretarFicha(
    textoFicha
  );

  const regra =
    await buscarRegraPadrao();

  const obras = await listarObras();

  const leituras = [];

  for (const leitura of ficha.leituras) {
    if (
      leitura.minhaObra &&
      regra.ignorarMinhaObra !== false
    ) {
      leituras.push({
        id: crypto.randomUUID(),
        leitura,
        minhaObra: true,
        obraEncontrada: null,
        capitulosDisponiveis: [],
        capitulos: [],
        statusPreparacao: "ignorado",
        mensagens: [
          "Minha Obra ignorada."
        ]
      });

      continue;
    }

    const buscaObra =
      encontrarObraPorNome(
        leitura.obra,
        obras
      );

    if (!buscaObra.obra) {
      leituras.push({
        id: crypto.randomUUID(),
        leitura,
        minhaObra: false,
        obraEncontrada: null,
        capitulosDisponiveis: [],
        capitulos: [],
        statusPreparacao:
          "obra-nao-encontrada",
        mensagens: [
          "Obra não encontrada."
        ]
      });

      continue;
    }

    const capitulosDisponiveis =
      await listarCapitulos(
        buscaObra.obra.id
      );

    const capitulos =
      leitura.capitulos.map(
        (capituloPedido) => {
          const encontrado =
            encontrarCapituloPedido(
              capituloPedido,
              capitulosDisponiveis
            );

          return {
            id: crypto.randomUUID(),
            pedido: capituloPedido,
            capituloSelecionadoId:
              encontrado?.id || "",
            capituloSelecionado:
              encontrado || null,
            modoRegra: "normal",
            encontrado:
              Boolean(encontrado)
          };
        }
      );

    leituras.push({
      id: crypto.randomUUID(),
      leitura,
      minhaObra: false,
      obraEncontrada:
        buscaObra.obra,
      capitulosDisponiveis,
      capitulos,
      statusPreparacao: "pronto",
      mensagens: [
        "Plano preparado."
      ]
    });
  }

  return {
    ficha,
    regra,
    leituras
  };
}
async function verificarCapituloDoPlano({
  itemCapitulo,
  regra,
  usuario,
  onStatus
}) {
  const capitulo =
    itemCapitulo.capituloSelecionado;

  if (!capitulo) {
    return {
      encontrado: false,
      pedido: itemCapitulo.pedido,
      capitulo: null,
      status:
        "capitulo-nao-encontrado",
      statusTexto:
        "Capítulo não encontrado",
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
      motivos: [
        "Nenhum capítulo selecionado."
      ]
    };
  }

  avisarStatus(onStatus, {
    tipo: "andamento",
    titulo: "Buscando comentários",
    detalhe: `${usuario} em ${capitulo.titulo}`
  });

  const tempoEstimado =
    estimarTempoLeitura(
      Number(
        capitulo.totalPalavras
      ) || 0,
      Number(
        regra.palavrasPorMinuto
      ) || 250
    );

  const comentariosMinimos =
    obterComentariosMinimosPorCapitulo(
      capitulo,
      regra
    );

  let dadosComentarios;

  try {
    dadosComentarios =
      await buscarComentariosDoCapitulo(
        {
          linkCapitulo:
            capitulo.linkWattpad,
          usuario
        }
      );
  } catch (error) {
    return {
      encontrado: true,
      pedido: itemCapitulo.pedido,
      capitulo,
      status:
        "erro-comentarios",
      statusTexto:
        "Erro ao buscar comentários",
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
      motivos: [
        error.message ||
          "Erro ao buscar comentários."
      ]
    };
  }

  let resultado =
    calcularConferenciaCapitulo({
      comentarios:
        dadosComentarios.comentarios,
      capitulo,
      regra,
      tempoRealSegundos:
        dadosComentarios.tempoReal
          .totalSegundos,
      tempoEstimadoSegundos:
        tempoEstimado.totalSegundos
    });

  if (
    capitulo.modoRegra ===
    "especial"
  ) {
    resultado = {
      ...resultado,
      status:
        dadosComentarios.totalDoUsuario >=
        1
          ? "aprovado"
          : "reprovado",
      motivos:
        dadosComentarios.totalDoUsuario >=
        1
          ? []
          : [
              "Especial precisa ter pelo menos 1 comentário."
            ]
    };
  }

  if (
    capitulo.modoRegra ===
    "poesia"
  ) {
    resultado = {
      ...resultado,
      status:
        dadosComentarios.totalDoUsuario >=
        3
          ? "aprovado"
          : "reprovado",
      motivos:
        dadosComentarios.totalDoUsuario >=
        3
          ? []
          : [
              "Poesia precisa ter pelo menos 3 comentários."
            ]
    };
  }

  return {
    encontrado: true,
    pedido: itemCapitulo.pedido,
    capitulo,
    status: resultado.status,
    statusTexto:
      resultado.status ===
      "aprovado"
        ? "Leitura aprovada"
        : "Leitura reprovada",
    comentariosMinimos,
    totalComentarios:
      dadosComentarios.totalDoUsuario,
    distribuicao:
      dadosComentarios.distribuicao,
    comentarios:
      dadosComentarios.comentarios,
    tempoEstimado,
    tempoReal:
      dadosComentarios.tempoReal,
    motivos: resultado.motivos
  };
}

export async function verificarPlanoConferencia(
  plano,
  opcoes = {}
) {
  const { onStatus } = opcoes;

  avisarStatus(onStatus, {
    tipo: "andamento",
    titulo:
      "Iniciando verificação",
    detalhe:
      "Buscando comentários."
  });

  const resultados = [];

  for (const itemLeitura of plano.leituras) {
    const leitura =
      itemLeitura.leitura;

    if (itemLeitura.minhaObra) {
      resultados.push({
        leitura,
        tipo: "minha-obra",
        status: "ignorado",
        statusTexto:
          "Minha Obra ignorada",
        obraEncontrada: null,
        capitulos: [],
        motivos: [
          "Minha Obra."
        ]
      });

      continue;
    }

    if (!itemLeitura.obraEncontrada) {
      resultados.push({
        leitura,
        tipo:
          "obra-nao-encontrada",
        status: "erro",
        statusTexto:
          "Obra não encontrada",
        obraEncontrada: null,
        capitulos: [],
        motivos: [
          "Obra não encontrada."
        ]
      });

      continue;
    }

    const capitulosResultado = [];

    for (const itemCapitulo of itemLeitura.capitulos) {
      const resumo =
        await verificarCapituloDoPlano(
          {
            itemCapitulo,
            regra: plano.regra,
            usuario:
              plano.ficha.user,
            onStatus
          }
        );

      capitulosResultado.push(
        resumo
      );
    }

    const temErro =
      capitulosResultado.some(
        (item) =>
          !item.encontrado
      );

    const temReprovado =
      capitulosResultado.some(
        (item) =>
          item.status ===
            "reprovado" ||
          item.status ===
            "erro-comentarios" ||
          item.status ===
            "capitulo-nao-encontrado"
      );

    resultados.push({
      leitura,
      tipo:
        "obra-encontrada",
      status: temErro
        ? "parcial"
        : temReprovado
          ? "reprovado"
          : "aprovado",
      statusTexto: temErro
        ? "Há capítulos pendentes"
        : temReprovado
          ? "Leitura reprovada"
          : "Leitura aprovada",
      obraEncontrada:
        itemLeitura.obraEncontrada,
      capitulos:
        capitulosResultado,
      motivos: temErro
        ? [
            "Há capítulos pendentes."
          ]
        : []
    });
  }

  avisarStatus(onStatus, {
    tipo: "sucesso",
    titulo:
      "Verificação concluída",
    detalhe:
      "Revise antes de salvar."
  });

  return {
    ficha: plano.ficha,
    regra: plano.regra,
    resultados
  };
}
