// Gera um story (1080x1920 PNG) ou pin do Pinterest (1000x1500 PNG) a partir de um pedido em JSON.
//
// Uso:  node gerar.js pedidos/exemplo.json
//
// Campos do pedido (todos opcionais, exceto "texto" e "saida"):
//   texto   : HTML do trecho. Parágrafos em <p>...</p>.
//             Marca-texto: <span class="mt">...</span>   Negrito: <b>...</b>
//   cor     : rosa (padrão) | azul | verde | lilas | amarelo  -> cor do marca-texto e do traço lateral
//   traco   : "preto" para deixar o traço lateral preto
//   capa    : caminho da capa, relativo a esta pasta (ex.: "capas/livro.jpg")
//   titulo  : título do livro
//   autor   : autor do livro
//   plataforma: "instagram" (padrão) | "tiktok" | "pinterest" (feed 1000x1500) | "pinterest-vertical" (1080x1920)  -> tamanho e áreas livres de cada rede
//   minFonte: tamanho mínimo da letra (padrão: 24 no Instagram; 20 no TikTok e no Pinterest)
//   lateral : margem livre de cada lado, em px (padrão do modelo: 150)
//   mapa    : true para desenhar o mapa de zonas por cima (só para referência)
//   saida   : arquivo PNG de saída, relativo a esta pasta (ex.: "saida/story.png")
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
// Tamanho da letra do trecho: começa em 50 e diminui até caber.
// Instagram: mínimo 24; se não couber, divida em 2 stories.
// TikTok e Pinterest: sempre 1 imagem; mínimo recomendado 20. Se não couber nem com 20,
// a letra continua diminuindo até 16 e o script avisa (o ideal é encurtar o trecho).
const MAX = 50;
const MIN_PLATAFORMA = { instagram: 24, tiktok: 20, pinterest: 20, 'pinterest-vertical': 20 };
const LIMITE_ABSOLUTO = 16;

(async () => {
  const cfgPath = path.resolve(process.argv[2]);
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const b = await chromium.launch();
  const pin = cfg.plataforma === 'pinterest';
  const p = await b.newPage({ viewport: pin ? { width: 1000, height: 1500 } : { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(__dirname, 'modelo.html'));
  await p.waitForLoadState('networkidle');
  await p.evaluate(() => document.fonts.ready);

  const plataforma = cfg.plataforma || 'instagram';
  const MIN = cfg.minFonte || MIN_PLATAFORMA[plataforma] || 24;
  const umaSo = plataforma !== 'instagram';
  const r = await p.evaluate(async ([cfg, MAX, MIN, PISO]) => {
    const cls = [];
    if (cfg.cor && cfg.cor !== 'rosa') cls.push(cfg.cor);
    if (cfg.traco === 'preto') cls.push('preto');
    if (cfg.plataforma === 'tiktok') cls.push('tiktok');
    if (cfg.plataforma === 'pinterest') cls.push('pinterest');
    if (cfg.plataforma === 'pinterest-vertical') cls.push('pinterest-vertical');
    document.body.className = cls.join(' ');
    if (cfg.lateral) { const sf = document.querySelector('.safe').style; sf.left = sf.right = cfg.lateral + 'px'; }
    if (cfg.texto) document.getElementById('texto').innerHTML = cfg.texto;
    if (cfg.titulo) document.getElementById('titulo').textContent = cfg.titulo;
    if (cfg.autor) document.getElementById('autor').textContent = cfg.autor;
    if (cfg.capa) { const im = document.getElementById('capa'); im.src = cfg.capa; await im.decode().catch(() => {}); }
    const c = document.querySelector('.conteudo'), ps = [...document.querySelectorAll('#texto p')];
    let s = MAX; const set = v => ps.forEach(x => x.style.fontSize = v + 'px'); set(s);
    const transborda = () => c.scrollHeight > c.clientHeight + 1;
    while (transborda() && s > MIN) { s--; set(s); }
    while (transborda() && s > PISO) { s--; set(s); }   // só para plataformas de imagem única
    return { fonte: s, cabe: !transborda() };
  }, [cfg, MAX, MIN, umaSo ? LIMITE_ABSOLUTO : MIN]);
  if (!r.cabe) r.aviso = umaSo ? 'não coube nem com letra 16: encurte o trecho' : 'não coube com letra 24: divida em 2 stories';
  else if (r.fonte < MIN) r.aviso = `letra ${r.fonte} abaixo do recomendado (${MIN}): considere encurtar o trecho`;

  if (cfg.mapa) await p.evaluate((MIN) => {
    const R = s => document.querySelector(s).getBoundingClientRect();
    const add = (css, html, cls = '') => { const d = document.createElement('div'); d.className = 'm ' + cls; d.style.cssText = css; d.innerHTML = html || ''; document.body.appendChild(d); };
    const st = document.createElement('style');
    st.textContent = `.m{position:absolute;font-family:'Open Sans';font-weight:700;box-sizing:border-box}
      .z{background:rgba(230,80,80,.13);border:3px dashed rgba(200,60,60,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#B03A3A;font-size:28px;line-height:1.35}
      .lat{background:rgba(70,130,220,.10);border-left:3px dashed rgba(70,130,220,.7);border-right:3px dashed rgba(70,130,220,.7)}
      .box{border:3px dashed}
      .tag{color:#fff;font-size:22px;padding:4px 12px;border-radius:6px;white-space:nowrap}
      .cota{color:#2F6FD0;font-size:22px;white-space:nowrap}`;
    document.head.appendChild(st);
    const safe = R('.safe'), lat = Math.round(safe.left), app = R('.app');
    const tt = document.body.classList.contains('tiktok');
    const pin = document.body.classList.contains('pinterest'), pv = document.body.classList.contains('pinterest-vertical'), H = window.innerHeight;
    const T = Math.round(safe.top), B = Math.round(H - safe.bottom);
    const sub = t => `<br><span style="font-weight:400;font-size:24px">${t}</span>`;
    if (pin) add(`left:0;right:0;top:0;height:${T}px;display:block;padding-top:12px;font-size:24px`, `TOPO RESERVADO · ${T} px <span style="font-weight:400">· botões Salvar e menu · cantos arredondados</span>`, 'z');
    else add(`left:0;right:0;top:0;height:${T}px`, `TOPO RESERVADO · ${T} px` + sub(tt ? 'abas Seguindo / Para você · busca' : pv ? 'fechar · perfil · botões do topo' : 'nome do perfil · barra de progresso'), 'z');
    add(`left:0;right:0;bottom:0;height:${B}px`, `BASE RESERVADA · ${B} px` + sub(tt ? 'nome · legenda · música · barra de navegação' : pv ? 'título · descrição · Salvar · comentários' : pin ? 'ícone de busca visual · cantos arredondados' : 'caixa de resposta · curtir · enviar'), 'z');
    add(`left:0;width:${lat}px;top:${T}px;bottom:${B}px`, '', 'lat');
    add(`right:0;width:${lat}px;top:${T}px;bottom:${B}px`, '', 'lat');
    if (tt || pv) add(`right:12px;width:${lat - 24}px;top:${T + 560}px;height:${H - B - T - 560}px;background:rgba(230,80,80,.13);border:3px dashed rgba(200,60,60,.7);border-radius:12px;color:#B03A3A;font-size:17px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.3`, pv ? 'botões<br>reagir<br>comentar<br>compartilhar' : 'botões<br>curtir<br>comentar<br>salvar<br>compartilhar');
    add(`left:20px;top:${tt ? 900 : pv ? 1000 : pin ? 860 : 1080}px;transform:rotate(-90deg);transform-origin:left top`, `margem lateral · ${lat} px`, 'cota');
    add(`right:20px;top:${tt ? 400 : pv ? 480 : pin ? 420 : 840}px;transform:rotate(90deg);transform-origin:right top`, `margem lateral · ${lat} px`, 'cota');
    const box = (sel, cor, txt, dy = -40, dx = 0) => { const r = R(sel);
      add(`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-color:${cor}`, '', 'box');
      add(`left:${r.left + dx}px;top:${r.top + dy}px;background:${cor}`, txt, 'tag'); };
    box('.app', 'rgb(70,130,220)', `1 · CARD DO APP (claro, cantos retos) · ${Math.round(app.width)} px`, -42);
    box('.barra-app', 'rgb(120,90,200)', '2 · ícones do app', 30, 100);
    box('.citacao', 'rgb(50,160,90)', `3 · TRECHO + traço lateral (letra ${MIN}–50 px)`, -38);
    const lv = R('.livro img'), ln = R('.livro');
    add(`left:${ln.left}px;top:${ln.top}px;width:${ln.width}px;height:${ln.height}px;border-color:rgb(220,140,30)`, '', 'box');
    add(`left:${ln.left}px;top:${ln.top - 40}px;background:rgb(220,140,30)`, `5 · CAPA (${Math.round(lv.width)} px) + TÍTULO (negrito) + AUTOR`, 'tag');
    const d = R('.divisor'); add(`left:${d.right + 14}px;top:${d.top - 16}px;background:rgb(140,120,100)`, `4 · linha (${Math.round(d.width)} px)`, 'tag');
    if (document.querySelector('.mt')) { const cb = R('.citacao');
      add(`left:${cb.left + 40}px;top:${cb.bottom + 40}px;background:rgb(225,110,150)`, '↑ fundo rosa = marca-texto (opcional)', 'tag'); }
  }, MIN);

  const out = path.resolve(__dirname, cfg.saida);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await p.screenshot({ path: out });
  console.log(path.relative(__dirname, out), r);
  await b.close();
})();
