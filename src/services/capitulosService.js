import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

import { db } from "../firebase/config.js";

function capitulosRef(obraId) {
  return collection(db, "obras", obraId, "capitulos");
}

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

function prepararCapitulo(dados = {}) {
  return limparIndefinidos({
    titulo: dados.titulo || "",
    numero:
      dados.numero === null || dados.numero === ""
        ? null
        : Number(dados.numero),
    tipo: dados.tipo || "capitulo",
    linkWattpad: dados.linkWattpad || dados.link || "",
    totalPalavras: Number(dados.totalPalavras) || 0,
    totalParagrafos: Number(dados.totalParagrafos) || 0,
    ordem:
      dados.ordem === null || dados.ordem === ""
        ? 0
        : Number(dados.ordem),
    observacoes: dados.observacoes || "",
    atualizadoEm: serverTimestamp()
  });
}

export async function listarCapitulos(obraId) {
  if (!obraId) {
    return [];
  }

  const q = query(capitulosRef(obraId), orderBy("ordem", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function criarCapitulo(obraId, dados = {}) {
  const registro = {
    ...prepararCapitulo(dados),
    criadoEm: serverTimestamp()
  };

  return addDoc(capitulosRef(obraId), registro);
}

export async function atualizarCapitulo(obraId, capituloId, dados = {}) {
  const ref = doc(db, "obras", obraId, "capitulos", capituloId);
  return updateDoc(ref, prepararCapitulo(dados));
}

export async function excluirCapitulo(obraId, capituloId) {
  const ref = doc(db, "obras", obraId, "capitulos", capituloId);
  return deleteDoc(ref);
}

export async function substituirCapitulosDaObra(obraId, capitulos = []) {
  const antigos = await listarCapitulos(obraId);

  await Promise.all(
    antigos.map((capitulo) => excluirCapitulo(obraId, capitulo.id))
  );

  await Promise.all(
    capitulos.map((capitulo, index) =>
      criarCapitulo(obraId, {
        titulo: capitulo.titulo || "",
        numero: capitulo.numero ?? null,
        tipo: capitulo.tipo || "capitulo",
        linkWattpad: capitulo.linkWattpad || capitulo.link || "",
        totalPalavras: capitulo.totalPalavras || 0,
        totalParagrafos: capitulo.totalParagrafos || 0,
        ordem: capitulo.ordem || index + 1,
        observacoes: capitulo.observacoes || ""
      })
    )
  );
}