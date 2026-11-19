// Gera um story de trecho bíblico (1080x1920 PNG) a partir de um pedido em JSON.
// Mesmas regras do modelo de trechos de livros (stories-livros): mesmas áreas livres por rede,
// letra automática de 50 até o mínimo da rede e as mesmas regras de divisão.
//
// Uso:  node gerar.js pedidos/exemplo.json
//
// Campos do pedido (só "texto" e "saida" são obrigatórios):
//   texto      : HTML do trecho (NVI). Parágrafos em <p>...</p>, número do versículo em <sup>4</sup>.
//                "SENHOR" e "DEUS" em maiúsculas viram versalete, como nas Bíblias.
//   grifo      : frase (ou lista de frases) do trecho que recebe marca-texto
//   jeito      : "traco" -> trecho nítido + traço na margem + grifo nas frases   (padrão em trecho longo: jeito B)
//                "grifo" -> trecho nítido + grifo nas frases, sem traço         (padrão em trecho curto)
//                "tudo"  -> trecho todo grifado                                 (carta na manga A)
//                Trecho longo = 4 versículos ou mais, ou mais de 300 letras.
//                (Avançado: o texto também pode vir com <span class="mt"> e <span class="foco"> prontos.)
//   dividir    : true -> 2 stories, cortando no fim de um versículo perto da metade (carta na manga C; só Instagram)
//                No Instagram isso também acontece sozinho quando a letra precisaria ficar abaixo de 24.
//                Cada parte sai com o trecho todo grifado (jeito "tudo"), a não ser que "jeito" seja informado.
//   citacao    : como mostrar de onde vem o versículo (usa "referencia" e "versao"):
//                "cabecalho" -> nome do livro · versão + número do capítulo grande no alto da página (o trecho começa logo abaixo)
//                "caixinha"  -> etiqueta creme com a referência e uma seta até o começo do trecho
//                "mao"       -> referência em letra à mão com seta (fica pouco legível sobre o papel claro)
//                sem citacao -> nada (só o que já aparece na página)
//   etiqueta   : "caixinha" ou "mao" -> referência por extenso ("Salmos 139:7-14 · NVI") com seta, por cima da foto.
//                Combina com "citacao": "cabecalho" (a seta aponta para o cabeçalho do capítulo).
//   etiquetaLugar: "veludo" (padrão: ao lado da Bíblia, no lugar livre mais perto do cabeçalho; pode avançar pelas laterais,
//                nunca pelo topo nem pela base reservados) | "trecho" (logo acima do começo do trecho, por cima da página)
//   setaSaida  : de onde sai a seta da etiqueta: "auto" (padrão: canto mais perto do trecho) | "esquerda" | "meio" | "direita"
//                (com esquerda/meio/direita a seta desce da base da caixinha e faz a curva até o trecho, mais longa)
//   etiquetaAcima: quantos px a caixinha fica acima da ponta da seta (ex.: 80 = mais baixa); aceita letra menor para caber
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

// Divide o trecho em 2 partes no fim de um versículo, o mais perto possível da metade (em letras)
function dividirTexto(texto) {
  const plano = texto.replace(/<\/p>\s*<p[^>]*>/g, ' ').replace(/^\s*<p[^>]*>|<\/p>\s*$/g, '');
  const cortes = [...plano.matchAll(/<sup>/g)].map(m => m.index).filter(i => i > 0);
  if (!cortes.length) throw new Error('não há como dividir: o trecho tem um versículo só');
  const letras = h => h.replace(/<[^>]+>/g, '').length, total = letras(plano);
  const i = cortes.reduce((m, c) => Math.abs(letras(plano.slice(0, c)) - total / 2) < Math.abs(letras(plano.slice(0, m)) - total / 2) ? c : m);
  return [`<p>${plano.slice(0, i).trim()}</p>`, `<p>${plano.slice(i).trim()}</p>`];
}
const parte = (saida, n) => saida.replace(/\.png$/, `-parte${n}.png`);

(async () => {
  const cfg = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8'));
  const b = await chromium.launch();

  const gerarUm = async (cfg) => {
    const plataforma = cfg.plataforma || 'instagram';
    const MIN = cfg.minFonte || MIN_PLATAFORMA[plataforma] || 24;
    const umaSo = plataforma !== 'instagram';
    const pin = plataforma === 'pinterest';
    const p = await b.newPage({ viewport: pin ? { width: 1000, height: 1500 } : { width: 1080, height: 1920 } });
    await p.goto('file://' + path.join(__dirname, `modelo-${cfg.estilo || 'grifado'}.html`));
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
    await p.close();
    console.log(path.relative(__dirname, out), r);
    return r;
  };

  const gerarDividido = async (cfg) => {
    const [t1, t2] = dividirTexto(cfg.texto);
    const jeito = cfg.jeitoDividido || cfg.jeito || 'tudo';
    const base = { ...cfg, dividir: false, jeito };
    await gerarUm({ ...base, texto: t1, depois: t2 + (cfg.depois || ''), saida: parte(cfg.saida, 1) });
    await gerarUm({ ...base, texto: t2, antes: (cfg.antes || '') + t1, saida: parte(cfg.saida, 2) });
  };

  const instagram = (cfg.plataforma || 'instagram') === 'instagram';
  if (cfg.dividir && instagram) await gerarDividido(cfg);
  else {
    const r = await gerarUm(cfg);
    if (instagram && !r.cabe && cfg.dividir !== false) {
      console.log('→ não coube em 1 story com letra 24: dividindo em 2');
      fs.rmSync(path.resolve(__dirname, cfg.saida), { force: true });
      await gerarDividido(cfg);
    }
  }
  await b.close();
})();
