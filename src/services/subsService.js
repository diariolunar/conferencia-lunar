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
import { normalizarParaBusca } from "../utils/normalizarTexto.js";

const subsRef = collection(db, "subs");

export async function listarSubs() {
  const q = query(subsRef, orderBy("codigo", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function criarSub(dados) {
  return addDoc(subsRef, {
    nome: dados.nome || "",
    codigo: dados.codigo || "",
    adm: dados.adm || "",
    status: dados.status || "ativo",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });
}

export async function atualizarSub(id, dados) {
  const ref = doc(db, "subs", id);

  return updateDoc(ref, {
    nome: dados.nome || "",
    codigo: dados.codigo || "",
    adm: dados.adm || "",
    status: dados.status || "ativo",
    atualizadoEm: serverTimestamp()
  });
}

export async function excluirSub(id) {
  const ref = doc(db, "subs", id);
  return deleteDoc(ref);
}

export function extrairCodigoSub(texto = "") {
  const normalizado = normalizarParaBusca(texto).toUpperCase();
  const match = normalizado.match(/A-\s*\d+/i);

  if (!match) {
    return "";
  }

  return match[0].replace(/\s+/g, "");
}

export function encontrarSubPorTexto(textoSub = "", subs = []) {
  const textoBusca = normalizarParaBusca(textoSub);
  const codigoBusca = extrairCodigoSub(textoSub);

  if (!textoBusca && !codigoBusca) {
    return null;
  }

  const porCodigo = subs.find((sub) => {
    const codigoSub = extrairCodigoSub(sub.codigo || sub.nome || "");
    return codigoBusca && codigoSub === codigoBusca;
  });

  if (porCodigo) {
    return porCodigo;
  }

  return (
    subs.find((sub) => {
      const nomeSub = normalizarParaBusca(sub.nome || "");
      return nomeSub && (textoBusca.includes(nomeSub) || nomeSub.includes(textoBusca));
    }) || null
  );
}

export async function encontrarOuCriarSubPorFicha(textoSub = "", adm = "") {
  const subs = await listarSubs();
  const encontrado = encontrarSubPorTexto(textoSub, subs);

  if (encontrado) {
    return encontrado;
  }

  const codigo = extrairCodigoSub(textoSub);

  const novoSub = {
    nome: textoSub || codigo || "Sub não identificado",
    codigo: codigo || textoSub || "Sem código",
    adm: adm || "",
    status: "ativo"
  };

  const criado = await criarSub(novoSub);

  return {
    id: criado.id,
    ...novoSub
  };
}