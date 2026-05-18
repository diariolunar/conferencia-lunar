import { normalizarTexto, normalizarParaBusca } from "./normalizarTexto.js";

const PALAVRAS_OBRA = [
  "grimorio",
  "obra",
  "livro",
  "mundo",
  "tomo",
  "historia",
  "leitura",
  "volume",
  "conto",
  "reino",
  "arquivo",
  "registro"
];

const PALAVRAS_CAPITULOS = [
  "capitulos lidos",
  "capitulos",
  "capitulo",
  "caps",
  "cap",
  "lidos",
  "leitura feita",
  "leitura realizada"
];

export function interpretarFicha(textoOriginal = "") {
  const linhasOriginais = String(textoOriginal).split(/\r?\n/);
  const linhasNormalizadas = linhasOriginais.map((linha) =>
    normalizarTexto(linha)
  );

  const resultado = {
    sub: extrairSub(linhasNormalizadas),
    nome: extrairCampo(linhasNormalizadas, "NOME"),
    user: extrairCampo(linhasNormalizadas, "USER"),
    adm: extrairCampo(linhasNormalizadas, "ADM"),
    leituras: []
  };

  let leituraAtual = null;

  linhasNormalizadas.forEach((linha, index) => {
    const linhaBusca = normalizarParaBusca(linha);
    const linhaOriginal = linhasOriginais[index] || linha;

    if (ehLinhaDeObra(linhaBusca, linha)) {
      if (leituraAtual) {
        resultado.leituras.push(leituraAtual);
      }

      leituraAtual = {
        rotulo: extrairRotuloAntesDosDoisPontos(linhaOriginal),
        obra: limparValorDepoisDosDoisPontos(linhaOriginal),
        capitulosTexto: "",
        capitulos: [],
        minhaObra: false,
        feedbackOferecido: false
      };

      return;
    }

    if (leituraAtual && ehLinhaDeCapitulos(linhaBusca, linha)) {
      const valorOriginal = limparValorDepoisDosDoisPontos(linhaOriginal);

      leituraAtual.capitulosTexto = valorOriginal;
      leituraAtual.minhaObra = normalizarParaBusca(valorOriginal).includes(
        "minha obra"
      );
      leituraAtual.capitulos = interpretarCapitulos(valorOriginal);

      return;
    }

    if (leituraAtual && linhaBusca.includes("feedback")) {
      leituraAtual.feedbackOferecido = linhaOriginal.includes("✅");
    }
  });

  if (leituraAtual) {
    resultado.leituras.push(leituraAtual);
  }

  return resultado;
}

function ehLinhaDeObra(linhaBusca, linhaOriginalNormalizada) {
  if (!linhaOriginalNormalizada.includes(":")) {
    return false;
  }

  const antesDosDoisPontos = normalizarParaBusca(
    linhaOriginalNormalizada.split(":")[0] || ""
  );

  return PALAVRAS_OBRA.some((palavra) => antesDosDoisPontos.includes(palavra));
}

function ehLinhaDeCapitulos(linhaBusca, linhaOriginalNormalizada) {
  if (!linhaOriginalNormalizada.includes(":")) {
    return false;
  }

  const antesDosDoisPontos = normalizarParaBusca(
    linhaOriginalNormalizada.split(":")[0] || ""
  );

  return PALAVRAS_CAPITULOS.some((palavra) =>
    antesDosDoisPontos.includes(palavra)
  );
}

function extrairSub(linhas = []) {
  const primeiraLinhaComSub = linhas.find((linha) =>
    normalizarParaBusca(linha).includes("a-")
  );

  return primeiraLinhaComSub || "";
}

function extrairCampo(linhas = [], campo) {
  const campoBusca = normalizarParaBusca(campo);

  const linhaEncontrada = linhas.find((linha) => {
    const linhaBusca = normalizarParaBusca(linha);
    return linhaBusca.includes(campoBusca) && linha.includes(":");
  });

  if (!linhaEncontrada) {
    return "";
  }

  return limparValorDepoisDosDoisPontos(linhaEncontrada);
}

function limparValorDepoisDosDoisPontos(linha = "") {
  const partes = String(linha).split(":");

  if (partes.length <= 1) {
    return "";
  }

  return partes.slice(1).join(":").trim();
}

function extrairRotuloAntesDosDoisPontos(linha = "") {
  const partes = String(linha).split(":");

  if (partes.length === 0) {
    return "";
  }

  return partes[0].trim();
}

function limparTextoCapitulo(texto = "") {
  return String(texto)
    .replace(/[✅✔️]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removerPrefixoCapitulo(texto = "") {
  return limparTextoCapitulo(texto)
    .replace(/^\s*(cap[ií]tulo|cap|caps|chapter|parte|epis[oó]dio|ep)\s*/i, "")
    .replace(/^\s*[-–—:.,]+\s*/g, "")
    .trim();
}

function criarCapituloPorTexto(texto = "") {
  const textoLimpo = limparTextoCapitulo(texto);
  const textoSemPrefixo = removerPrefixoCapitulo(textoLimpo);
  const busca = normalizarParaBusca(textoLimpo);

  if (!textoLimpo) {
    return null;
  }

  if (busca.includes("prologo")) {
    return {
      tipo: "prologo",
      numero: null,
      texto: "Prólogo",
      titulo: "Prólogo"
    };
  }

  const numero = busca.match(/\d+/)?.[0];

  if (numero) {
    return {
      tipo: "capitulo",
      numero: Number(numero),
      texto: textoLimpo,
      titulo: textoSemPrefixo || textoLimpo
    };
  }

  return {
    tipo: "capitulo",
    numero: null,
    texto: textoLimpo,
    titulo: textoSemPrefixo || textoLimpo
  };
}

function dividirCapitulosTexto(texto = "") {
  const original = limparTextoCapitulo(texto);

  if (!original) {
    return [];
  }

  const busca = normalizarParaBusca(original);

  if (busca.includes("minha obra")) {
    return [];
  }

  if (busca.includes("prologo") && !/\d/.test(busca) && !busca.includes(",")) {
    return [original];
  }

  const temSeparadoresFortes = /[,;|/]/.test(original);

  if (temSeparadoresFortes) {
    return original
      .split(/[,;|/]+/g)
      .map((parte) => parte.trim())
      .filter(Boolean);
  }

  const padraoNumerosComE = /^\s*(?:cap[ií]tulos?\s*)?\d+\s*(?:e\s*\d+\s*)+$/i;

  if (padraoNumerosComE.test(original)) {
    return original
      .replace(/cap[ií]tulos?/gi, "")
      .split(/\s+e\s+/i)
      .map((parte) => parte.trim())
      .filter(Boolean);
  }

  const padraoPrologoENumeros = /prologo|pr[oó]logo/i;

  if (padraoPrologoENumeros.test(original) && /\d/.test(original)) {
    return original
      .replace(/pr[oó]logo/gi, "Prólogo")
      .split(/\s+e\s+|,\s*/i)
      .map((parte) => parte.trim())
      .filter(Boolean);
  }

  return [original];
}

export function interpretarCapitulos(texto = "") {
  const busca = normalizarParaBusca(texto);

  if (!busca || busca.includes("minha obra")) {
    return [];
  }

  const partes = dividirCapitulosTexto(texto);
  const capitulos = [];

  partes.forEach((parte) => {
    const capitulo = criarCapituloPorTexto(parte);

    if (capitulo) {
      capitulos.push(capitulo);
    }
  });

  return capitulos;
}
