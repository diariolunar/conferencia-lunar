import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import { db } from "../firebase/config.js";
import { encontrarOuCriarSubPorFicha } from "./subsService.js";

const historicoRef = collection(db, "historicoConferencias");

function limparIndefinidos(valor) {
  if (Array.isArray(valor)) {
    return valor.map((item) => limparIndefinidos(item));
  }

  if (valor && typeof valor === "object") {
    const novoObjeto = {};

    Object.entries(valor).forEach(([chave, conteudo]) => {
      if (conteudo !== undefined) {
        novoObjeto[chave] = limparIndefinidos(conteudo);
      }
    });

    return novoObjeto;
  }

  return valor;
}

function contarStatus(resultados = []) {
  return resultados.reduce(
    (acc, item) => {
      const status = item.status || "desconhecido";

      if (!acc[status]) {
        acc[status] = 0;
      }

      acc[status] += 1;
      return acc;
    },
    {
      aprovado: 0,
      reprovado: 0,
      ignorado: 0,
      erro: 0,
      parcial: 0,
      "aprovado-manual": 0
    }
  );
}

function definirStatusGeral(resultados = []) {
  if (resultados.length === 0) {
    return "sem-resultados";
  }

  const validas = resultados.filter((item) => item.status !== "ignorado");

  if (validas.length === 0) {
    return "ignorado";
  }

  const temErro = validas.some(
    (item) =>
      item.status === "erro" ||
      item.status === "parcial" ||
      item.status === "reprovado"
  );

  return temErro ? "reprovado" : "aprovado";
}

function definirStatusGeralPorLeituras(leituras = []) {
  if (!leituras.length) {
    return "sem-resultados";
  }

  const validas = leituras.filter((item) => item.status !== "ignorado");

  if (!validas.length) {
    return "ignorado";
  }

  const temReprovada = validas.some(
    (item) =>
      item.status === "reprovado" ||
      item.status === "erro" ||
      item.status === "parcial"
  );

  return temReprovada ? "reprovado" : "aprovado";
}

function resumirCapitulo(capituloResultado = {}) {
  const capitulo = capituloResultado.capitulo || {};

  return {
    pedido: capituloResultado.pedido || null,
    encontrado: Boolean(capituloResultado.encontrado),
    status: capituloResultado.status || "",
    statusTexto: capituloResultado.statusTexto || "",
    titulo: capitulo.titulo || "",
    numero: capitulo.numero ?? null,
    tipo: capitulo.tipo || "",
    linkWattpad: capitulo.linkWattpad || "",
    totalPalavras: Number(capitulo.totalPalavras) || 0,
    totalParagrafos: Number(capitulo.totalParagrafos) || 0,
    comentariosMinimos: Number(capituloResultado.comentariosMinimos) || 0,
    totalComentarios: Number(capituloResultado.totalComentarios) || 0,
    distribuicao: capituloResultado.distribuicao || {
      inicio: 0,
      meio: 0,
      fim: 0,
      semArea: 0
    },
    tempoEstimado: capituloResultado.tempoEstimado || {
      texto: "0 minuto",
      totalSegundos: 0
    },
    tempoReal: capituloResultado.tempoReal || {
      inicio: "",
      fim: "",
      totalSegundos: 0
    },
    motivos: capituloResultado.motivos || [],
    aprovacaoManual: capituloResultado.aprovacaoManual || null,
    comentarios: (capituloResultado.comentarios || []).map((comentario) => ({
      id: comentario.id || "",
      usuario: comentario.usuario || "",
      texto: comentario.texto || "",
      data: comentario.data || "",
      paragrafo: comentario.paragrafo || "",
      indiceParagrafo: comentario.indiceParagrafo ?? null,
      area: comentario.area || "semArea",
      deeplink: comentario.deeplink || ""
    }))
  };
}

function resumirLeitura(item = {}) {
  const leitura = item.leitura || {};
  const obraEncontrada = item.obraEncontrada || null;

  return {
    obraInformada: leitura.obra || "",
    capitulosTexto: leitura.capitulosTexto || "",
    minhaObra: Boolean(leitura.minhaObra),
    feedbackOferecido: Boolean(leitura.feedbackOferecido),
    status: item.status || "",
    statusTexto: item.statusTexto || "",
    tipo: item.tipo || "",
    pontuacaoObra: Number(item.pontuacaoObra) || 0,
    motivos: item.motivos || [],
    obraEncontrada: obraEncontrada
      ? {
          id: obraEncontrada.id || "",
          nome: obraEncontrada.nome || "",
          autor: obraEncontrada.autor || "",
          userAutor: obraEncontrada.userAutor || "",
          linkWattpad: obraEncontrada.linkWattpad || "",
          capaUrl: obraEncontrada.capaUrl || ""
        }
      : null,
    capitulos: (item.capitulos || []).map((capitulo) =>
      resumirCapitulo(capitulo)
    )
  };
}

function montarChaveCapitulo({ obraNome = "", capitulo = {} }) {
  const numero = capitulo.numero ?? "";
  const tipo = capitulo.tipo || "";
  const titulo = capitulo.titulo || "";
  const link = capitulo.linkWattpad || "";

  return `${obraNome}::${tipo}::${numero}::${titulo}::${link}`
    .toLowerCase()
    .trim();
}

function extrairChavesCapitulos(leituras = []) {
  const chaves = [];

  leituras.forEach((leitura) => {
    if (leitura.minhaObra) {
      return;
    }

    const obraNome =
      leitura.obraEncontrada?.nome ||
      leitura.obraInformada ||
      "";

    (leitura.capitulos || []).forEach((capitulo) => {
      if (!capitulo.encontrado) {
        return;
      }

      chaves.push(
        montarChaveCapitulo({
          obraNome,
          capitulo
        })
      );
    });
  });

  return chaves.filter(Boolean);
}

function gerarChaveDuplicidade({ subId = "", user = "", diaSemana = "", leituras = [] }) {
  const capitulos = extrairChavesCapitulos(leituras).join("||");

  return `${subId}::${user}::${diaSemana}::${capitulos}`.toLowerCase();
}

async function buscarConflitosCapitulos({
  subId = "",
  user = "",
  diaSemana = "",
  novasLeituras = []
}) {
  if (!subId || !user || !diaSemana) {
    return [];
  }

  const novasChaves = extrairChavesCapitulos(novasLeituras);

  if (!novasChaves.length) {
    return [];
  }

  const novasChavesSet = new Set(novasChaves);

  const q = query(
    historicoRef,
    where("user", "==", user),
    limit(200)
  );

  const snapshot = await getDocs(q);

  const conflitos = [];

  snapshot.docs.forEach((documento) => {
    const registro = {
      id: documento.id,
      ...documento.data()
    };

    if (registro.subId !== subId || registro.diaSemana !== diaSemana) {
      return;
    }

    const chavesAntigas = extrairChavesCapitulos(registro.leituras || []);

    const capitulosRepetidos = chavesAntigas.filter((chave) =>
      novasChavesSet.has(chave)
    );

    if (capitulosRepetidos.length > 0) {
      conflitos.push({
        registro,
        capitulosRepetidos
      });
    }
  });

  return conflitos;
}

export async function buscarHistoricoDuplicado({ chaveDuplicidade }) {
  if (!chaveDuplicidade) {
    return null;
  }

  const q = query(
    historicoRef,
    where("chaveDuplicidade", "==", chaveDuplicidade),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const documento = snapshot.docs[0];

  return {
    id: documento.id,
    ...documento.data()
  };
}

export async function salvarHistoricoConferencia({
  textoFicha = "",
  resultado = {},
  diaSemana = "",
  permitirDuplicado = false
}) {
  const ficha = resultado.ficha || {};
  const resultados = resultado.resultados || [];
  const resumoStatus = contarStatus(resultados);
  const statusGeral = definirStatusGeral(resultados);

  const sub = await encontrarOuCriarSubPorFicha(ficha.sub || "", ficha.adm || "");
  const leituras = resultados.map((item) => resumirLeitura(item));

  const chaveDuplicidade = gerarChaveDuplicidade({
    subId: sub.id || "",
    user: ficha.user || "",
    diaSemana,
    leituras
  });

  if (!permitirDuplicado) {
    const duplicadoExato = await buscarHistoricoDuplicado({
      chaveDuplicidade
    });

    if (duplicadoExato) {
      const erro = new Error("Essa conferência já foi salva no histórico.");
      erro.codigo = "duplicado-exato";
      erro.registroDuplicado = duplicadoExato;
      throw erro;
    }

    const conflitos = await buscarConflitosCapitulos({
      subId: sub.id || "",
      user: ficha.user || "",
      diaSemana,
      novasLeituras: leituras
    });

    if (conflitos.length > 0) {
      const erro = new Error(
        "Já existe conferência salva para um ou mais capítulos desse membro no mesmo dia."
      );

      erro.codigo = "capitulo-duplicado";
      erro.conflitos = conflitos;
      throw erro;
    }
  }

  const registro = limparIndefinidos({
    subId: sub.id || "",
    subNome: sub.nome || ficha.sub || "",
    subCodigo: sub.codigo || "",
    diaSemana,
    nome: ficha.nome || "",
    user: ficha.user || "",
    adm: ficha.adm || "",
    textoFicha,
    statusGeral,
    resumoStatus,
    totalLeituras: resultados.length,
    leituras,
    chaveDuplicidade,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  return addDoc(historicoRef, registro);
}

export async function listarHistoricoConferencias(quantidade = 300) {
  const q = query(
    historicoRef,
    orderBy("criadoEm", "desc"),
    limit(Number(quantidade) || 300)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function excluirHistoricoConferencia(id) {
  const ref = doc(db, "historicoConferencias", id);
  return deleteDoc(ref);
}

export async function aprovarCapituloManual({
  registro,
  leituraIndex,
  capituloIndex,
  motivo
}) {
  if (!registro?.id) {
    throw new Error("Registro inválido.");
  }

  if (!motivo?.trim()) {
    throw new Error("Informe o motivo da aprovação manual.");
  }

  const leituras = structuredClone(registro.leituras || []);
  const leitura = leituras[leituraIndex];

  if (!leitura) {
    throw new Error("Leitura não encontrada.");
  }

  const capitulo = leitura.capitulos?.[capituloIndex];

  if (!capitulo) {
    throw new Error("Capítulo não encontrado.");
  }

  capitulo.status = "aprovado-manual";
  capitulo.statusTexto = "Aprovado manualmente";
  capitulo.aprovacaoManual = {
    aprovado: true,
    motivo: motivo.trim(),
    data: new Date().toISOString()
  };

  leitura.capitulos[capituloIndex] = capitulo;

  const aindaTemReprovado = leitura.capitulos.some(
    (item) =>
      item.status === "reprovado" ||
      item.status === "erro" ||
      item.status === "erro-comentarios"
  );

  if (!aindaTemReprovado) {
    leitura.status = "aprovado";
    leitura.statusTexto = "Leitura aprovada";
  }

  leituras[leituraIndex] = leitura;

  const statusGeral = definirStatusGeralPorLeituras(leituras);

  const resumoStatus = leituras.reduce(
    (acc, item) => {
      const status = item.status || "desconhecido";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {
      aprovado: 0,
      reprovado: 0,
      ignorado: 0,
      erro: 0,
      parcial: 0,
      "aprovado-manual": 0
    }
  );

  const ref = doc(db, "historicoConferencias", registro.id);

  await updateDoc(ref, {
    leituras: limparIndefinidos(leituras),
    statusGeral,
    resumoStatus,
    atualizadoEm: serverTimestamp()
  });
}