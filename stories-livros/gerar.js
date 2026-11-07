// Gera um story (1080x1920 PNG) a partir de um pedido em JSON.
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
//   lateral : margem livre de cada lado, em px (padrão do modelo: 150)
//   mapa    : true para desenhar o mapa de zonas por cima (só para referência)
//   saida   : arquivo PNG de saída, relativo a esta pasta (ex.: "saida/story.png")
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const MAX = 50, MIN = 24; // tamanho da letra do trecho: começa em 50 e diminui até caber (mínimo 24)

(async () => {
  const cfgPath = path.resolve(process.argv[2]);
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(__dirname, 'modelo.html'));
  await p.waitForLoadState('networkidle');
  await p.evaluate(() => document.fonts.ready);

  const r = await p.evaluate(async ([cfg, MAX, MIN]) => {
    const cls = [];
    if (cfg.cor && cfg.cor !== 'rosa') cls.push(cfg.cor);
    if (cfg.traco === 'preto') cls.push('preto');
    document.body.className = cls.join(' ');
    if (cfg.lateral) { const sf = document.querySelector('.safe').style; sf.left = sf.right = cfg.lateral + 'px'; }
    if (cfg.texto) document.getElementById('texto').innerHTML = cfg.texto;
    if (cfg.titulo) document.getElementById('titulo').textContent = cfg.titulo;
    if (cfg.autor) document.getElementById('autor').textContent = cfg.autor;
    if (cfg.capa) { const im = document.getElementById('capa'); im.src = cfg.capa; await im.decode().catch(() => {}); }
    const c = document.querySelector('.conteudo'), ps = [...document.querySelectorAll('#texto p')];
    let s = MAX; const set = v => ps.forEach(x => x.style.fontSize = v + 'px'); set(s);
    while (c.scrollHeight > c.clientHeight + 1 && s > MIN) { s--; set(s); }
    return { fonte: s, cabe: c.scrollHeight <= c.clientHeight + 1 };
  }, [cfg, MAX, MIN]);

  if (cfg.mapa) await p.evaluate(() => {
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
    add('left:0;right:0;top:0;height:250px', 'TOPO RESERVADO · 250 px<br><span style="font-weight:400;font-size:24px">nome do perfil · barra de progresso</span>', 'z');
    add('left:0;right:0;bottom:0;height:250px', 'BASE RESERVADA · 250 px<br><span style="font-weight:400;font-size:24px">caixa de resposta · curtir · enviar</span>', 'z');
    add(`left:0;width:${lat}px;top:250px;bottom:250px`, '', 'lat');
    add(`right:0;width:${lat}px;top:250px;bottom:250px`, '', 'lat');
    add('left:20px;top:1080px;transform:rotate(-90deg);transform-origin:left top', `margem lateral · ${lat} px`, 'cota');
    add('right:20px;top:840px;transform:rotate(90deg);transform-origin:right top', `margem lateral · ${lat} px`, 'cota');
    const box = (sel, cor, txt, dy = -40, dx = 0) => { const r = R(sel);
      add(`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-color:${cor}`, '', 'box');
      add(`left:${r.left + dx}px;top:${r.top + dy}px;background:${cor}`, txt, 'tag'); };
    box('.app', 'rgb(70,130,220)', `1 · CARD DO APP (claro, cantos retos) · ${Math.round(app.width)} px`, -42);
    box('.barra-app', 'rgb(120,90,200)', '2 · ícones do app', 30, 100);
    box('.citacao', 'rgb(50,160,90)', '3 · TRECHO + traço lateral (letra 24–50 px)', -38);
    const lv = R('.livro img'), ln = R('.livro');
    add(`left:${ln.left}px;top:${ln.top}px;width:${ln.width}px;height:${ln.height}px;border-color:rgb(220,140,30)`, '', 'box');
    add(`left:${ln.left}px;top:${ln.top - 40}px;background:rgb(220,140,30)`, `5 · CAPA (${Math.round(lv.width)} px) + TÍTULO (negrito) + AUTOR`, 'tag');
    const d = R('.divisor'); add(`left:${d.right + 14}px;top:${d.top - 16}px;background:rgb(140,120,100)`, `4 · linha (${Math.round(d.width)} px)`, 'tag');
    if (document.querySelector('.mt')) { const cb = R('.citacao');
      add(`left:${cb.left + 40}px;top:${cb.bottom + 40}px;background:rgb(225,110,150)`, '↑ fundo rosa = marca-texto (opcional)', 'tag'); }
  });

  const out = path.resolve(__dirname, cfg.saida);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await p.screenshot({ path: out });
  console.log(path.relative(__dirname, out), r);
  await b.close();
})();
