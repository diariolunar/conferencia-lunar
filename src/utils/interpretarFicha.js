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

export function interpretarCapitulos(texto = "") {
  const busca = normalizarParaBusca(texto);

  if (!busca || busca.includes("minha obra")) {
    return [];
  }

  const capitulos = [];

  if (busca.includes("prologo")) {
    capitulos.push({
      tipo: "prologo",
      numero: null,
      texto: "Prólogo"
    });
  }

  const numeros = busca.match(/\d+/g) || [];

  numeros.forEach((numero) => {
    capitulos.push({
      tipo: "capitulo",
      numero: Number(numero),
      texto: `Capítulo ${Number(numero)}`
    });
  });

  return capitulos;
}