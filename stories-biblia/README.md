# Stories de trechos da Bíblia

Modelo para transformar trechos da Bíblia (prints, fotos ou texto) em stories do **Instagram**, do **TikTok** e em pins do **Pinterest vertical**.

Usa o **mesmo motor e os mesmos parâmetros** do modelo de trechos de livros (`stories-livros`, branch `claude/eager-feynman-8h30h5`). Só a arte muda.

> **Arte: em definição.** O `modelo.html` atual é um rascunho (v0) que reaproveita o visual do modelo de livros, trocando o bloco "capa + título + autor" por "referência + versão". Ele vai ser substituído pela arte escolhida a partir das referências.

## O que foi copiado do modelo de livros

| Parâmetro | Instagram | TikTok | Pinterest vertical |
|---|---|---|---|
| Tamanho | 1080 × 1920 | 1080 × 1920 | 1080 × 1920 |
| Topo livre | 250 px | 150 px | 270 px |
| Base livre | 250 px | 450 px | 440 px |
| Laterais livres | 150 px | 150 px | 195 px |
| Letra do trecho | automática, de 50 até 24 px | de 50 até 20 px | de 50 até 20 px |
| Se não couber | divide em **2 stories** | sempre **1 imagem** (avisa abaixo de 20) | sempre **1 pin** (avisa abaixo de 20) |

Também continuam iguais: marca-texto e traço lateral nas cores `rosa` (padrão), `azul`, `verde`, `lilas`, `amarelo`; `traco: "preto"`; negrito; `lateral`; `minFonte`; e `mapa: true` para desenhar as zonas. O Pinterest feed (1000 × 1500) segue disponível com `plataforma: "pinterest"`.

## O que mudou

| Livros | Bíblia |
|---|---|
| `capa`, `titulo`, `autor` | `referencia` (ex.: "João 3:16") e `versao` (ex.: "NVI", "ARA", "NAA") |
| | Número do versículo com `<sup>16</sup>` dentro do texto |

## Como gerar

Precisa de Node.js com Playwright e acesso à internet (para a fonte do Google Fonts).

```bash
node gerar.js pedidos/teste-v0-1-instagram.json
```

Exemplo de pedido:

```json
{
  "texto": "<p><sup>16</sup>Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, <span class=\"mt\">para que todo aquele que nele crê não pereça, mas tenha a vida eterna.</span></p>",
  "referencia": "João 3:16",
  "versao": "ARA",
  "plataforma": "instagram",
  "saida": "saida/2026-11-18-joao-3-16-1-instagram.png"
}
```

Os pedidos seguem o mesmo padrão de nome do modelo de livros: `AAAA-MM-DD-<trecho>-1-instagram.json`, `-2-pinterest-vertical.json` e `-3-tiktok.json`.
