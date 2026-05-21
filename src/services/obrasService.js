import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

import { db } from "../firebase/config.js";

const obrasRef = collection(db, "obras");

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

export async function listarObras() {
  const q = query(obrasRef, orderBy("nome", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function buscarObraPorId(id) {
  if (!id) {
    return null;
  }

  const ref = doc(db, "obras", id);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export function buscarObraPorNome(obras = [], nome = "") {
  const termo = String(nome).toLowerCase().trim();

  if (!termo) {
    return null;
  }

  return (
    obras.find((obra) => {
      const nomeObra = String(obra.nome || "").toLowerCase().trim();

      return nomeObra === termo || nomeObra.includes(termo) || termo.includes(nomeObra);
    }) || null
  );
}

export async function criarObra(dados = {}) {
  const registro = limparIndefinidos({
    nome: dados.nome || "",
    autor: dados.autor || "",
    userAutor: dados.userAutor || "",
    sub: dados.sub || "",
    linkWattpad: dados.linkWattpad || "",
    capaUrl: dados.capaUrl || "",
    status: dados.status || "ativa",
    observacoes: dados.observacoes || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  return addDoc(obrasRef, registro);
}

export async function atualizarObra(id, dados = {}) {
  const ref = doc(db, "obras", id);

  const registro = limparIndefinidos({
    nome: dados.nome || "",
    autor: dados.autor || "",
    userAutor: dados.userAutor || "",
    sub: dados.sub || "",
    linkWattpad: dados.linkWattpad || "",
    capaUrl: dados.capaUrl || "",
    status: dados.status || "ativa",
    observacoes: dados.observacoes || "",
    atualizadoEm: serverTimestamp()
  });

  return updateDoc(ref, registro);
}

export async function excluirObra(id) {
  const ref = doc(db, "obras", id);
  return deleteDoc(ref);
}