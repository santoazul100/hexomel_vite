# Skeleton Loaders / Placeholders de Carregamento

## O que é um Skeleton Loader?

Um **skeleton loader** (ou "placeholder de carregamento") é uma **versão simplificada** da interface que aparece enquanto os dados reais ainda estão a ser carregados. Em vez de mostrar uma roda a girar ou uma página em branco, mostramos "silhuetas" do conteúdo final — blocos cinzentos com uma animação suave que imitam o layout dos cards, textos, imagens, etc.

### Analogia simples

Imagina que estás num restaurante. Enquanto o prato não chega, o empregado coloca na mesa o prato vazio, os talheres e o copo — para saberes que a comida está a caminho. O skeleton loader é esse "lugar preparado": mostra ao utilizador a estrutura da página para ele saber que algo está a carregar.

---

## Porque é útil?

| Problema sem skeleton | Solução com skeleton |
|---|---|
| Página em branco durante 2-3 segundos | O utilizador vê a estrutura da página de imediato |
| O utilizador pensa que a página está avariada | O utilizador percebe que os dados estão a caminho |
| Experiência de utilização pobre | Sensação de rapidez e qualidade |
| Saltos de layout quando o conteúdo aparece | Transição suave do placeholder para o conteúdo real |

### Estudos UX reais

- Estudos demonstram que skeleton screens fazem com que os utilizadores percebam o tempo de carregamento como **mais curto** comparado com spinners tradicionais.
- Empresas como YouTube, Facebook, LinkedIn e Airbnb usam skeleton loaders nas suas aplicações.

---

## Como funciona no nosso projeto (Vite + Vanilla JS + Vanilla CSS)

### Arquitetura

```
frontend/src/
├── styles/
│   └── skeleton.css          ← CSS dos skeletons (animações + estilos)
├── skeleton.js               ← Módulo JS reutilizável com os componentes
```

### Fluxo de funcionamento

```
1. Página carrega
   ↓
2. JavaScript mostra os skeletons no container
   ↓
3. Faz o pedido à API (fetch)
   ↓
4. Enquanto espera → skeleton visível com animação shimmer
   ↓
5. Dados chegam com sucesso → substitui skeleton pelo conteúdo real
   OU
6. Erro na API → mostra estado de erro
   OU
7. API responde vazio → mostra estado "sem resultados"
```

### Os 3 estados

| Estado | O que acontece | O que o utilizador vê |
|---|---|---|
| `loading` | A API ainda não respondeu | Skeletons animados (shimmer) |
| `error` | A API devolveu um erro | Mensagem de erro com botão "Tentar de novo" |
| `empty` | A API respondeu, mas sem dados | Mensagem amigável "Sem resultados" |

---

## Componentes criados

### 1. `SkeletonProductCard`
Placeholder para um card de produto na loja. Simula a imagem, título, preço e botão.

### 2. `SkeletonCommunityPost`
Placeholder para um post da comunidade Q&A. Simula avatar, nome, texto e ações.

### 3. `SkeletonProductGrid`
Grelha de múltiplos `SkeletonProductCard` (por defeito 6 cards).

### 4. `SkeletonCommunityList`
Lista de múltiplos `SkeletonCommunityPost` (por defeito 4 posts).

### 5. `SkeletonGenericCard`
Um card genérico com imagem + linhas de texto, reutilizável para qualquer secção.

### 6. `StateError`
Mensagem visual para erros de carregamento, com botão para tentar novamente.

### 7. `StateEmpty`
Mensagem visual para quando não existem resultados.

---

## Como usar no código

### Exemplo básico (Loja de produtos):

```javascript
import { Skeleton } from './skeleton.js';

// 1. Mostrar skeleton enquanto carrega
const grid = document.getElementById('products-grid');
grid.innerHTML = Skeleton.productGrid(6);  // 6 cards placeholder

// 2. Fazer o pedido à API
try {
  const res = await fetch('/api/products');
  const data = await res.json();

  if (data.length === 0) {
    // 3a. Sem resultados
    grid.innerHTML = Skeleton.stateEmpty('Nenhum produto encontrado');
  } else {
    // 3b. Substituir pelo conteúdo real
    grid.innerHTML = renderRealProducts(data);
  }
} catch (error) {
  // 3c. Erro
  grid.innerHTML = Skeleton.stateError('Erro ao carregar produtos', () => {
    fetchProducts();  // callback para tentar de novo
  });
}
```

### Exemplo (Comunidade Q&A):

```javascript
import { Skeleton } from './skeleton.js';

const container = document.getElementById('qa-thread');
container.innerHTML = Skeleton.communityList(4);  // 4 posts placeholder

// ... depois de receber os dados, substituir pelo conteúdo real
```

---

## A animação Shimmer

A animação **shimmer** cria um efeito de brilho que percorre o skeleton da esquerda para a direita, dando a sensação de movimento e progresso. É implementada com:

1. Um `background` gradiente linear que vai de transparente → branco semi-transparente → transparente
2. Uma animação CSS `@keyframes` que move esse gradiente horizontalmente
3. O pseudo-elemento `::after` para sobrepor o efeito sem alterar o conteúdo

```css
@keyframes skeleton-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

---

## Tecnologias usadas

- **CSS puro** — sem TailwindCSS nem frameworks
- **JavaScript ES6+ puro** — sem React, Vue ou Angular
- **Módulos ES6** — `export/import` nativos do Vite
- **CSS Variables** — reutiliza as variáveis do design system (`modern.css`)
- **CSS Animations** — `@keyframes` para o efeito shimmer

---

## Onde colocar os ficheiros

| Ficheiro | Localização | Função |
|---|---|---|
| `skeleton.css` | `frontend/src/styles/skeleton.css` | Estilos e animações dos skeletons |
| `skeleton.js` | `frontend/src/skeleton.js` | Módulo JS com funções geradoras de HTML |

---

## Notas finais

- Os skeletons são **responsivos** — adaptam-se a mobile e desktop automaticamente.
- A animação shimmer é leve e **não consome muitos recursos** (usa `transform` que é acelerado por GPU).
- A solução é **modular** — podes adicionar novos tipos de skeleton facilmente criando novas funções no módulo.
- Mantém a identidade visual do Hexomel (cores, border-radius, sombras do `modern.css`).
