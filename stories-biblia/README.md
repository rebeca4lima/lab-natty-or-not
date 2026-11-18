# Stories de trechos da Bíblia

Modelo para transformar trechos da Bíblia em stories do **Instagram**, do **TikTok** e em pins do **Pinterest vertical**, com cara de foto espontânea: a Bíblia aberta em close, com o trecho grifado, foco raso e luz baixa em tons de vinho.

- **Regras, mapa e opções:** veja [GUIA.md](GUIA.md)
- **Exemplos:** pasta [`referencia/`](referencia/)

![Exemplo Instagram](referencia/exemplo-instagram.png)

Usa as **mesmas regras do modelo de trechos de livros** (`stories-livros`): mesmas áreas livres por rede, letra automática de 50 até o mínimo da rede e as mesmas regras de divisão. Só a arte é diferente.

## Estrutura

| Arquivo / pasta | Para que serve |
|---|---|
| `modelo-grifado.html` | A arte: página da Bíblia, grifo, foco, cores e luz |
| `gerar.js` | Gera o PNG a partir de um pedido em JSON |
| `pedidos/` | Pedidos em JSON (um por imagem) |
| `referencia/` | Mapa das zonas, exemplos e rascunhos da criação |
| `saida/` | Imagens geradas (não vão para o Git) |
| `modelo-fundo.html` | Rascunho de outro estilo (Bíblia de fundo + frase por cima), para depois |

## Como gerar

Precisa de Node.js com Playwright e acesso à internet (para as fontes do Google Fonts).

```bash
node gerar.js pedidos/exemplo-salmos-23-4-1-instagram.json
```

Exemplo de pedido:

```json
{
  "texto": "<p><sup>4</sup><span class=\"mt\">Ainda que eu ande pelo vale da sombra da morte, não temerei mal nenhum, porque tu estás comigo;</span> o teu bordão e o teu cajado me consolam.</p>",
  "antes": "<p>…versículos anteriores…</p>",
  "depois": "<p>…versículos seguintes…</p>",
  "outraColuna": "<p>…texto da coluna ao lado…</p>",
  "cabecalho": "Salmos 22, 23",
  "pagina": "612",
  "referencia": "Salmos 23:4",
  "versao": "ARA",
  "plataforma": "instagram",
  "saida": "saida/2026-11-18-salmos-23-4-1-instagram.png"
}
```

- `texto`: o trecho, na NVI. Parágrafos em `<p>`, número do versículo em `<sup>`, grifo em `<span class="mt">` (pode haver mais de um). "SENHOR" e "DEUS" em maiúsculas viram versalete, como nas Bíblias.
- Trecho longo com grifo só numa frase: envolva o trecho todo em `<span class="foco">…</span>` (fica nítido e define o enquadramento) e a frase em `<span class="mt">`. Com `foco`, um traço de caneta na margem marca o trecho (desligue com `"traco": false`; ligue sem `foco` com `"traco": true`).
- `antes`, `depois` e `outraColuna`: os versículos vizinhos que completam a página. Ficam desfocados, só para a página parecer real.
- `cabecalho` e `pagina`: o cabeçalho da página da Bíblia.
- `referencia` e `versao`: só para registro; não aparecem na imagem.

Campos opcionais: `plataforma` (`instagram` padrão, `tiktok`, `pinterest-vertical`), `cor` do grifo (`vinho` padrão, `cereja`, `castanho`, `vermelho`), `superficie` (`veludo` padrão, `couro`, `madeira`), `tom` (`vinho` padrão, `quente`, `pb`), `minFonte` e `mapa` (`true` desenha o mapa de zonas). Ajustes finos: `giro`, `inclinacao`, `lado`, `focoX`, `focoY`, `desfoque`, `escuro`.

O script informa o tamanho de letra usado e se o grifo coube (`{ fonte: 49, cabe: true }`). No Instagram, se `cabe` for `false`, divida o trecho em dois pedidos. No TikTok e no Pinterest a imagem é sempre única: o script avisa (`aviso`) quando a letra fica abaixo de 20 ou o trecho não cabe, e aí o ideal é encurtar.

Os pedidos seguem o mesmo padrão de nome do modelo de livros: `AAAA-MM-DD-<trecho>-1-instagram.json`, `-2-pinterest-vertical.json` e `-3-tiktok.json`.
