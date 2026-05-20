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
    return 85;
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

function encontrarCapituloPorTitulo(textoPedido = "", capitulos = []) {
  const pedidoLimpo = limparTituloCapitulo(textoPedido);

  if (!pedidoLimpo) {
    return null;
  }

  let melhorCapitulo = null;
  let melhorPontuacao = 0;

  capitulos.forEach((capitulo) => {
    const tituloLimpo = limparTituloCapitulo(capitulo.titulo || "");
    const pontuacao = calcularSemelhanca(
      pedidoLimpo,
      tituloLimpo
    );

    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorCapitulo = capitulo;
    }
  });

 
