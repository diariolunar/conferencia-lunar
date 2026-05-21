import {
  normalizarTexto,
  normalizarParaBusca
} from "./normalizarTexto.js";

const PALAVRAS_OBRA = [
  "obra",
  "livro",
  "grimorio",
  "historia",
  "conto",
  "fic",
  "fanfic",
  "manga",
  "manhwa",
  "novel"
];

const PALAVRAS_CAPITULOS = [
  "capitulos",
  "capitulo",
  "caps",
  "cap",
  "lidos",
  "leitura"
];

export function interpretarFicha(textoOriginal = "") {
  const linhasOriginais =
    String(textoOriginal).split(/\r?\n/);

  const linhasNormalizadas =
    linhasOriginais.map((linha) =>
      normalizarTexto(linha)
    );

  const resultado = {
    sub: extrairSub(linhasNormalizadas),

    nome: extrairCampo(
      linhasNormalizadas,
      "nome"
    ),

    user: extrairCampo(
      linhasNormalizadas,
      "user"
    ),

    adm: extrairCampo(
      linhasNormalizadas,
      "adm"
    ),

    leituras: []
  };

  let leituraAtual = null;

  linhasNormalizadas.forEach(
    (linha, index) => {
      const linhaBusca =
        normalizarParaBusca(linha);

      const linhaOriginal =
        linhasOriginais[index] || linha;

      if (
        ehLinhaDeObra(
          linhaBusca,
          linha
        )
      ) {
        if (leituraAtual) {
          resultado.leituras.push(
            leituraAtual
          );
        }

        leituraAtual = {
          obra:
            limparValorDepoisDosDoisPontos(
              linhaOriginal
            ),

          rotulo:
            extrairRotuloAntesDosDoisPontos(
              linhaOriginal
            ),

          capitulosTexto: "",
          capitulos: [],

          minhaObra: false,

          feedbackOferecido: false
        };

        return;
      }

      if (
        leituraAtual &&
        ehLinhaDeCapitulos(
          linhaBusca,
          linha
        )
      ) {
        const valorOriginal =
          limparValorDepoisDosDoisPontos(
            linhaOriginal
          );

        leituraAtual.capitulosTexto =
          valorOriginal;

        leituraAtual.minhaObra =
          normalizarParaBusca(
            valorOriginal
          ).includes("minha obra");

        leituraAtual.capitulos =
          interpretarCapitulos(
            valorOriginal
          );

        return;
      }

      if (
        leituraAtual &&
        linhaBusca.includes("feedback")
      ) {
        leituraAtual.feedbackOferecido =
          linhaOriginal.includes("✅");
      }
    }
  );

  if (leituraAtual) {
    resultado.leituras.push(
      leituraAtual
    );
  }

  return resultado;
}

function ehLinhaDeObra(
  linhaBusca,
  linhaOriginal
) {
  if (!linhaOriginal.includes(":")) {
    return false;
  }

  const antesDosDoisPontos =
    normalizarParaBusca(
      linhaOriginal.split(":")[0] || ""
    );

  return PALAVRAS_OBRA.some(
    (palavra) =>
      antesDosDoisPontos.includes(
        palavra
      )
  );
}

function ehLinhaDeCapitulos(
  linhaBusca,
  linhaOriginal
) {
  if (!linhaOriginal.includes(":")) {
    return false;
  }

  const antesDosDoisPontos =
    normalizarParaBusca(
      linhaOriginal.split(":")[0] || ""
    );

  return PALAVRAS_CAPITULOS.some(
    (palavra) =>
      antesDosDoisPontos.includes(
        palavra
      )
  );
}

function extrairSub(
  linhas = []
) {
  const linhaSub = linhas.find(
    (linha) =>
      normalizarParaBusca(
        linha
      ).includes("a-")
  );

  return linhaSub || "";
}

function extrairCampo(
  linhas = [],
  campo = ""
) {
  const busca =
    normalizarParaBusca(campo);

  const linha =
    linhas.find((item) => {
      const texto =
        normalizarParaBusca(item);

      return (
        texto.includes(busca) &&
        item.includes(":")
      );
    });

  if (!linha) {
    return "";
  }

  return limparValorDepoisDosDoisPontos(
    linha
  );
}

function limparValorDepoisDosDoisPontos(
  linha = ""
) {
  const partes =
    String(linha).split(":");

  if (partes.length <= 1) {
    return "";
  }

  return partes
    .slice(1)
    .join(":")
    .trim();
}

function extrairRotuloAntesDosDoisPontos(
  linha = ""
) {
  const partes =
    String(linha).split(":");

  return partes[0]?.trim() || "";
}

export function interpretarCapitulos(
  texto = ""
) {
  const busca =
    normalizarParaBusca(texto);

  if (
    !busca ||
    busca.includes("minha obra")
  ) {
    return [];
  }

  const capitulos = [];

  if (
    busca.includes("prologo")
  ) {
    capitulos.push({
      tipo: "prologo",
      numero: null,
      texto: "Prólogo"
    });
  }

  const numeros =
    busca.match(/\d+/g) || [];

  numeros.forEach((numero) => {
    capitulos.push({
      tipo: "capitulo",
      numero: Number(numero),
      texto: `Capítulo ${numero}`
    });
  });

  const textoSemNumeros =
    busca
      .replace(/\d+/g, "")
      .replace(
        /capitulos|capitulo|caps|cap|e|,/g,
        ""
      )
      .trim();

  if (
    capitulos.length === 0 &&
    textoSemNumeros
  ) {
    capitulos.push({
      tipo: "titulo",
      numero: null,
      texto
    });
  }

  return capitulos;
}
