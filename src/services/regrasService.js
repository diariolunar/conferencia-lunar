import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { db } from "../firebase/config.js";

const regraPadraoRef = doc(db, "configuracoes", "regraPadrao");

const regraPadrao = {
  comentariosPadrao: 6,

  capituloCurtoAtivo: true,
  capituloCurtoLimitePalavras: 500,
  capituloCurtoComentarios: 1,

  capituloLongoAtivo: true,
  capituloLongoLimitePalavras: 4000,
  capituloLongoComentarios: 12,

  palavrasPorMinuto: 250,

  exigirDistribuicao: true,
  minimoInicio: 1,
  minimoMeio: 1,
  minimoFim: 1,

  exigirTempoMinimo: true,
  ignorarMinhaObra: true
};

export async function buscarRegraPadrao() {
  const snapshot = await getDoc(regraPadraoRef);

  if (!snapshot.exists()) {
    return regraPadrao;
  }

  return {
    ...regraPadrao,
    ...snapshot.data()
  };
}

export async function salvarRegraPadrao(dados = {}) {
  return setDoc(
    regraPadraoRef,
    {
      ...regraPadrao,
      ...dados,
      atualizadoEm: serverTimestamp()
    },
    {
      merge: true
    }
  );
}