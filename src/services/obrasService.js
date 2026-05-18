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

export async function criarObra(dados) {
  return addDoc(obrasRef, {
    nome: dados.nome || "",
    autor: dados.autor || "",
    userAutor: dados.userAutor || "",
    linkWattpad: dados.linkWattpad || "",
    capaUrl: dados.capaUrl || "",
    status: dados.status || "ativa",
    observacoes: dados.observacoes || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });
}

export async function listarObras() {
  const q = query(obrasRef, orderBy("criadoEm", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function buscarObraPorId(obraId) {
  const ref = doc(db, "obras", obraId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function atualizarObra(obraId, dados) {
  const ref = doc(db, "obras", obraId);

  return updateDoc(ref, {
    nome: dados.nome || "",
    autor: dados.autor || "",
    userAutor: dados.userAutor || "",
    linkWattpad: dados.linkWattpad || "",
    capaUrl: dados.capaUrl || "",
    status: dados.status || "ativa",
    observacoes: dados.observacoes || "",
    atualizadoEm: serverTimestamp()
  });
}

export async function atualizarCapaObra(obraId, capaUrl) {
  const ref = doc(db, "obras", obraId);

  return updateDoc(ref, {
    capaUrl: capaUrl || "",
    atualizadoEm: serverTimestamp()
  });
}

export async function excluirObra(obraId) {
  const ref = doc(db, "obras", obraId);
  return deleteDoc(ref);
}