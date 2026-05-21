import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where
} from "firebase/firestore";

import { db } from "../firebase/config.js";

const subsRef = collection(db, "subs");

function limparCodigoSub(texto = "") {
  const match = String(texto).match(/a-\d+/i);

  if (!match) {
    return "";
  }

  return match[0].toUpperCase();
}

function limparNomeSub(texto = "") {
  return String(texto)
    .replace(/🌑|🌒|🌓|🌔|🌕|🌖|🌗|🌘|🌙|🌜|🌛|⭐|✨/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function listarSubs() {
  const q = query(subsRef, orderBy("nome", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function criarSub(dados = {}) {
  const registro = {
    codigo: dados.codigo || limparCodigoSub(dados.nome || ""),
    nome: dados.nome || "",
    adm: dados.adm || "",
    descricao: dados.descricao || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  };

  return addDoc(subsRef, registro);
}

export async function excluirSub(id) {
  const ref = doc(db, "subs", id);
  return deleteDoc(ref);
}

export async function encontrarOuCriarSubPorFicha(subTexto = "", adm = "") {
  const codigo = limparCodigoSub(subTexto);
  const nomeLimpo = limparNomeSub(subTexto);

  if (codigo) {
    const qCodigo = query(subsRef, where("codigo", "==", codigo));
    const snapshotCodigo = await getDocs(qCodigo);

    if (!snapshotCodigo.empty) {
      const documento = snapshotCodigo.docs[0];

      return {
        id: documento.id,
        ...documento.data()
      };
    }
  }

  if (nomeLimpo) {
    const qNome = query(subsRef, where("nome", "==", nomeLimpo));
    const snapshotNome = await getDocs(qNome);

    if (!snapshotNome.empty) {
      const documento = snapshotNome.docs[0];

      return {
        id: documento.id,
        ...documento.data()
      };
    }
  }

  const novo = await addDoc(subsRef, {
    codigo,
    nome: nomeLimpo || subTexto || "Sub não identificado",
    adm: adm || "",
    descricao: "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });

  return {
    id: novo.id,
    codigo,
    nome: nomeLimpo || subTexto || "Sub não identificado",
    adm: adm || "",
    descricao: ""
  };
}