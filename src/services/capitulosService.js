import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "firebase/firestore";

import { db } from "../firebase/config.js";

export function capitulosRef(obraId) {
  return collection(db, "obras", obraId, "capitulos");
}

function normalizarId(texto = "") {
  return String(texto)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function valorNumericoOuPadrao(valor, padrao) {
  if (valor === 0 || valor === "0") {
    return 0;
  }

  const numero = Number(valor);

  if (Number.isFinite(numero)) {
    return numero;
  }

  return padrao;
}

function montarIdCapitulo(capitulo, index) {
  const base =
    capitulo.tipo === "prologo"
      ? "prologo"
      : `capitulo-${valorNumericoOuPadrao(capitulo.numero, index + 1)}`;

  const titulo = normalizarId(capitulo.titulo || "");

  return titulo ? `${base}-${titulo}` : base;
}

export async function criarCapitulo(obraId, dados) {
  const numero = valorNumericoOuPadrao(dados.numero, null);
  const ordem = valorNumericoOuPadrao(dados.ordem, numero || 999);

  return addDoc(capitulosRef(obraId), {
    titulo: dados.titulo || "",
    numero,
    tipo: dados.tipo || "capitulo",
    linkWattpad: dados.linkWattpad || "",
    totalPalavras: Number(dados.totalPalavras) || 0,
    totalParagrafos: Number(dados.totalParagrafos) || 0,
    ordem,
    origem: dados.origem || "manual",
    observacoes: dados.observacoes || "",
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  });
}

export async function salvarCapitulosImportados(obraId, capitulos = []) {
  if (!obraId || capitulos.length === 0) {
    return;
  }

  const batch = writeBatch(db);

  capitulos.forEach((capitulo, index) => {
    const idCapitulo = montarIdCapitulo(capitulo, index);
    const ref = doc(db, "obras", obraId, "capitulos", idCapitulo);

    const numero =
      capitulo.tipo === "prologo"
        ? 0
        : valorNumericoOuPadrao(capitulo.numero, index + 1);

    const ordem =
      capitulo.tipo === "prologo"
        ? 0
        : valorNumericoOuPadrao(capitulo.ordem, numero || index + 1);

    batch.set(
      ref,
      {
        titulo: capitulo.titulo || `Capítulo ${index + 1}`,
        numero,
        tipo: capitulo.tipo || "capitulo",
        linkWattpad: capitulo.linkWattpad || "",
        totalPalavras: Number(capitulo.totalPalavras) || 0,
        totalParagrafos: Number(capitulo.totalParagrafos) || 0,
        ordem,
        origem: "wattpad",
        observacoes: capitulo.observacoes || "",
        importadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      },
      {
        merge: true
      }
    );
  });

  return batch.commit();
}

export async function listarCapitulos(obraId) {
  const q = query(capitulosRef(obraId), orderBy("ordem", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));
}

export async function atualizarCapitulo(obraId, capituloId, dados) {
  const ref = doc(db, "obras", obraId, "capitulos", capituloId);

  const numero =
    dados.tipo === "prologo" ? 0 : valorNumericoOuPadrao(dados.numero, null);

  const ordem =
    dados.tipo === "prologo"
      ? 0
      : valorNumericoOuPadrao(dados.ordem, numero || 999);

  return updateDoc(ref, {
    titulo: dados.titulo || "",
    numero,
    tipo: dados.tipo || "capitulo",
    linkWattpad: dados.linkWattpad || "",
    totalPalavras: Number(dados.totalPalavras) || 0,
    totalParagrafos: Number(dados.totalParagrafos) || 0,
    ordem,
    origem: dados.origem || "manual",
    observacoes: dados.observacoes || "",
    atualizadoEm: serverTimestamp()
  });
}

export async function excluirCapitulo(obraId, capituloId) {
  const ref = doc(db, "obras", obraId, "capitulos", capituloId);
  return deleteDoc(ref);
}