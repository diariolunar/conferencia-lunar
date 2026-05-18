import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

import { db } from "../firebase/config.js";

const REGRA_PADRAO_ID = "regra-padrao-projeto-lunar";

export const regraInicial = {
  nome: "Regra padrão do Projeto Lunar",

  comentariosPadrao: 6,

  capituloCurtoAtivo: true,
  capituloCurtoLimitePalavras: 500,
  capituloCurtoComentarios: 1,

  capituloLongoAtivo: true,
  capituloLongoLimitePalavras: 4000,
  capituloLongoComentarios: 12,

  exigirDistribuicao: true,
  minimoInicio: 1,
  minimoMeio: 1,
  minimoFim: 1,

  exigirTempoMinimo: true,
  palavrasPorMinuto: 250,

  ignorarMinhaObra: true,

  prologoSegueRegraNormal: true,

  atualizadoEm: null
};

export async function buscarRegraPadrao() {
  const ref = doc(db, "regras", REGRA_PADRAO_ID);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return regraInicial;
  }

  return {
    ...regraInicial,
    ...snapshot.data()
  };
}

export async function salvarRegraPadrao(dados) {
  const ref = doc(db, "regras", REGRA_PADRAO_ID);

  return setDoc(
    ref,
    {
      ...dados,
      comentariosPadrao: Number(dados.comentariosPadrao) || 6,

      capituloCurtoAtivo: Boolean(dados.capituloCurtoAtivo),
      capituloCurtoLimitePalavras:
        Number(dados.capituloCurtoLimitePalavras) || 500,
      capituloCurtoComentarios: Number(dados.capituloCurtoComentarios) || 1,

      capituloLongoAtivo: Boolean(dados.capituloLongoAtivo),
      capituloLongoLimitePalavras:
        Number(dados.capituloLongoLimitePalavras) || 4000,
      capituloLongoComentarios: Number(dados.capituloLongoComentarios) || 12,

      exigirDistribuicao: Boolean(dados.exigirDistribuicao),
      minimoInicio: Number(dados.minimoInicio) || 1,
      minimoMeio: Number(dados.minimoMeio) || 1,
      minimoFim: Number(dados.minimoFim) || 1,

      exigirTempoMinimo: Boolean(dados.exigirTempoMinimo),
      palavrasPorMinuto: Number(dados.palavrasPorMinuto) || 250,

      ignorarMinhaObra: Boolean(dados.ignorarMinhaObra),
      prologoSegueRegraNormal: Boolean(dados.prologoSegueRegraNormal),

      atualizadoEm: serverTimestamp()
    },
    {
      merge: true
    }
  );
}