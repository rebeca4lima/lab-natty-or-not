// Gera um story de trecho bíblico (1080x1920 PNG) a partir de um pedido em JSON.
// Mesmas regras do modelo de trechos de livros (stories-livros): mesmas áreas livres por rede,
// letra automática de 50 até o mínimo da rede e as mesmas regras de divisão.
//
// Uso:  node gerar.js pedidos/exemplo.json
//
// Campos do pedido (só "texto" e "saida" são obrigatórios):
//   texto      : HTML do trecho. Parágrafos em <p>...</p>, número do versículo em <sup>4</sup>.
//                Grifo: <span class="mt">...</span>  (pode haver mais de um)
//                "SENHOR" e "DEUS" em maiúsculas viram versalete, como nas Bíblias.
//   antes      : versículos que vêm antes do trecho, na mesma coluna (ficam desfocados)
//   depois     : versículos que vêm depois do trecho
//   outraColuna: texto da coluna da esquerda (desfocada)
//   titulo     : título de seção logo antes do trecho (opcional)
//   cabecalho  : cabeçalho da página, ex.: "Salmos 22, 23"     pagina: número da página
//   referencia, versao: só para registro (não aparecem na imagem)
//   cor        : vinho (padrão) | cereja | castanho | vermelho   -> cor do grifo
//   superficie : veludo (padrão) | couro | madeira
//   tom        : vinho (padrão) | quente | pb
//   plataforma : "instagram" (padrão) | "tiktok" | "pinterest-vertical" (1080x1920) | "pinterest" (feed 1000x1500)
//   minFonte   : tamanho mínimo da letra (padrão: 24 no Instagram; 20 no TikTok e no Pinterest)
//   giro, inclinacao, lado, focoX, focoY, desfoque, escuro: ajustes finos de câmera, foco e luz
//   mapa       : true para desenhar o mapa de zonas por cima (só para referência)
//   saida      : arquivo PNG de saída, relativo a esta pasta (ex.: "saida/story.png")
//   estilo     : "grifado" (padrão) | "fundo" (rascunho do modelo "Bíblia de fundo + frase por cima")
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
// Tamanho da letra do trecho: começa em 50 e diminui até o grifo caber na área livre.
// Instagram: mínimo 24; se não couber, divida em 2 stories.
// TikTok e Pinterest: sempre 1 imagem; mínimo recomendado 20. Se não couber nem com 20,
// a letra continua diminuindo até 16 e o script avisa (o ideal é encurtar o trecho).
const MAX = 50;
const MIN_PLATAFORMA = { instagram: 24, tiktok: 20, pinterest: 20, 'pinterest-vertical': 20 };
const LIMITE_ABSOLUTO = 16;

(async () => {
  const cfg = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8'));
  const plataforma = cfg.plataforma || 'instagram';
  const MIN = cfg.minFonte || MIN_PLATAFORMA[plataforma] || 24;
  const umaSo = plataforma !== 'instagram';
  const estilo = cfg.estilo || 'grifado';

  const b = await chromium.launch();
  const pin = plataforma === 'pinterest';
  const p = await b.newPage({ viewport: pin ? { width: 1000, height: 1500 } : { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(__dirname, `modelo-${estilo}.html`));
  await p.waitForLoadState('networkidle');

  // 1) monta a cena nítida  2) "fotografa"  3) aplica foco progressivo, tom e granulado
  const r = await p.evaluate(([c, MAX, MIN, PISO]) => window.montar(c, MAX, MIN, PISO), [cfg, MAX, MIN, umaSo ? LIMITE_ABSOLUTO : MIN]);
  if (!r.cabe) r.aviso = umaSo ? 'não coube nem com letra 16: encurte o trecho' : 'não coube com letra 24: divida em 2 stories';
  else if (r.fonte < MIN) r.aviso = `letra ${r.fonte} abaixo do recomendado (${MIN}): considere encurtar o trecho`;
  const cru = await p.screenshot();
  await p.evaluate(s => window.finalizar(s), 'data:image/png;base64,' + cru.toString('base64'));
  if (cfg.mapa) await p.evaluate(MIN => window.mapa && window.mapa(MIN), MIN);

  const out = path.resolve(__dirname, cfg.saida);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await p.screenshot({ path: out });
  console.log(path.relative(__dirname, out), r);
  await b.close();
})();
