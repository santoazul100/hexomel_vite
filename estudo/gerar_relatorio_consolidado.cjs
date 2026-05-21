const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
} = require("docx");

const outputPath = path.join(
  __dirname,
  "relatorio",
  "Relatorio_Consolidado_Validado_Hexomel.docx",
);
const logoPath = path.join(__dirname, "logo_hexomel.png");

const bodyStyle = {
  spacing: { after: 140, line: 320 },
};

function title(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 180 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 34,
      }),
    ],
  });
}

function subtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 220 },
    children: [
      new TextRun({
        text,
        italics: true,
        size: 22,
      }),
    ],
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 220, after: 120 },
  });
}

function body(text) {
  return new Paragraph({
    ...bodyStyle,
    children: [
      new TextRun({
        text,
        size: 24,
      }),
    ],
  });
}

function bullet(text) {
  return new Paragraph({
    ...bodyStyle,
    bullet: { level: 0 },
    children: [
      new TextRun({
        text,
        size: 24,
      }),
    ],
  });
}

function monoLine(text) {
  return new Paragraph({
    spacing: { after: 0, line: 260 },
    children: [
      new TextRun({
        text,
        font: "Consolas",
        size: 21,
      }),
    ],
  });
}

function blankLine() {
  return new Paragraph({
    children: [new TextRun({ text: "" })],
  });
}

const validationNotes = [
  'O documento "Resumo Executivo" estava globalmente alinhado com o projeto, mas misturava alguns pontos corretos com outros que já não correspondem ao estado real do código.',
  'O documento "Secao Tecnologias Pap Vite Javascript" explicava corretamente a base Vite + JavaScript + HTML + CSS, mas estava demasiado genérico e não refletia o backend, a base de dados, os pagamentos, a autenticação, os dashboards e o módulo 3D do site.',
  "A consolidação final abaixo foi validada diretamente contra os ficheiros do projeto e contra os apontamentos existentes na pasta estudo.",
];

const correctionNotes = [
  "Tailwind CSS não foi encontrado nas dependências nem no frontend. O styling real combina CSS próprio, Bootstrap via CDN, Bootstrap Icons, Font Awesome e um design system centralizado.",
  "O projeto não é uma SPA pura. O Vite está configurado em modo multi-page, com várias entradas HTML independentes e módulos JavaScript separados por página.",
  "A sensação de aplicação fluida existe, mas vem da combinação entre Vite, módulos ES, pre-load do estado de autenticação/carrinho e View Transitions API.",
  "Chart.js é usado nos dashboards, mas é carregado por CDN nas páginas administrativas em vez de surgir como dependência npm do frontend.",
  'O backend já suporta Stripe com preparação para "card" e "mb_way", mas o checkout atual do frontend envia sempre paymentType = "card". Por isso, o MB Way deve ser descrito como suporte preparado no servidor, não como opção já totalmente exposta na interface atual.',
  "MySQL Workbench pode ser utilizado na gestão da base de dados, mas não faz parte do runtime do site; é uma ferramenta externa de administração.",
];

const frontendTechnologies = [
  "HTML5 multipágina para a estrutura das páginas públicas, perfil, checkout, dashboards e administração.",
  "CSS3 com ficheiros dedicados como index.css, modern.css, checkout.css, skeleton.css e i18n.css.",
  "JavaScript ES Modules para a lógica de autenticação, loja, perfil, analytics, workshops, comunidade e checkout.",
  "Vite 5.0.8 como servidor de desenvolvimento, proxy para /api e build otimizado multi-entry.",
  "Bootstrap 5.3 via CDN para grelhas, modais, utilitários e estrutura responsiva.",
  "Bootstrap Icons 1.11.3 e Font Awesome 6.x via CDN para iconografia da interface.",
  "SweetAlert2 11.26.17 para confirmações, alertas e feedback de UX.",
  "Chart.js via CDN para os gráficos dos dashboards de administração e apicultor.",
  "Three.js 0.184.0 para o frasco 3D interativo e a simulação visual dos diferentes tipos de mel.",
  "Google Identity Services no frontend para login com conta Google.",
  "View Transitions API e preload de estado para reduzir flicker e melhorar a transição entre páginas.",
  "Sistema i18n PT/EN com persistência local do idioma.",
  "Skeleton loaders, IntersectionObserver e microanimações CSS para melhorar a experiência de carregamento.",
];

const backendTechnologies = [
  "Node.js com Express 4.18.2 como base da API REST e da lógica de negócio.",
  "mysql2 3.16.1 para ligação assíncrona à base de dados MySQL com pool de conexões.",
  "jsonwebtoken 9.0.0 e bcryptjs 2.4.3 para autenticação com tokens JWT e hashing de passwords.",
  "google-auth-library 10.5.0 para validar o login Google no servidor.",
  "stripe 22.0.1 para criar Checkout Sessions, consultar sessões e tratar webhooks de pagamento.",
  "nodemailer 7.0.12 para emails transacionais, recibos e OTP do checkout.",
  "multer 2.0.2 para upload de imagens e documentos.",
  "compression 1.8.1, cors 2.8.5 e dotenv 16.3.1 para otimização e configuração do serviço.",
];

const dataAndModules = [
  "MySQL / InnoDB como base de dados relacional principal do projeto.",
  "Esquema com entidades centrais: cliente, categoria, origem, produto, carrinho, item_carrinho, encomenda e item_encomenda.",
  "Módulos adicionais para favoritos, avaliações, workshops, reservas de workshops, pedidos de upgrade, perguntas/respostas da comunidade, interações analíticas, slugs e definições do site.",
  "Armazenamento de estado local no frontend com localStorage e sessionStorage para sessão, idioma e carrinho.",
];

const features = [
  "Loja online com catálogo filtrável, carrinho persistente e sincronização entre frontend e backend.",
  "Autenticação por registo/login tradicional, sessão JWT e login Google.",
  "Verificação adicional do checkout com OTP enviado por email antes da compra.",
  "Perfis de utilizador com gestão de dados, avatar, histórico de encomendas e favoritos.",
  "Área de apicultor com gestão de produtos, workshops e métricas próprias.",
  "Painel de administração com KPIs, gráficos, moderação de utilizadores, produtos, workshops, pedidos de upgrade e interações.",
  "Comunidade de perguntas e respostas entre utilizadores e apicultores.",
  "Página de curiosidades com visualização 3D interativa do frasco e variação visual de tipos de mel.",
  "Sistema de analytics silencioso para page views, cliques, add to cart e arranque de checkout.",
  "Sistema de skeleton loaders, toasts e modais para elevar a experiência de utilização.",
];

const internalSources = [
  "estudo/relatorio/Resumo Executivo.docx",
  "estudo/relatorio/Secao Tecnologias Pap Vite Javascript.docx",
  "estudo/RELATORIO_ESTUDO_HEXOMEL.md",
  "estudo/funcionalidades.md",
  "estudo/DETALHES_TECNICOS_COMPRAS_EMAIL.md",
  "estudo/SKELETON_LOADERS_ESTUDO.md",
  "frontend/package.json",
  "frontend/vite.config.js",
  "frontend/src/main.js",
  "frontend/src/pre-load.js",
  "frontend/src/checkout.js",
  "frontend/src/analytics.js",
  "frontend/src/curiosidadesHero3d.js",
  "frontend/src/i18n.js",
  "backend/package.json",
  "backend/config/db.js",
  "backend/server.js",
  "backend/hexomel_mysql.sql",
];

const architectureFlow = [
  "[Utilizador / Navegador]",
  "            |",
  "            v",
  "[Frontend multipágina: HTML + CSS + JS + Vite]",
  "  |- Interface: Bootstrap, Font Awesome, Bootstrap Icons",
  "  |- UX: SweetAlert2, skeleton loaders, toasts, View Transitions",
  "  |- Conteúdo interativo: Three.js, i18n, analytics, carrinho",
  "  |- Estado local: localStorage / sessionStorage",
  "  |- Comunicação: Fetch API + JWT",
  "            |",
  "            v",
  "[Backend: Node.js + Express]",
  "  |- Autenticação: bcryptjs + jsonwebtoken + Google login",
  "  |- Pagamentos: Stripe Checkout + webhooks",
  "  |- Emails e OTP: Nodemailer / SMTP",
  "  |- Uploads: Multer",
  "  |- Compressão, rotas REST e regras de negócio",
  "  |- Analytics, comunidade, workshops e administração",
  "            |",
  "            v",
  "[MySQL / InnoDB]",
  "  |- clientes / perfis",
  "  |- produtos / categorias / origens",
  "  |- carrinho / encomendas / itens",
  "  |- workshops / reservas",
  "  |- comunidade / respostas",
  "  |- interações / relatórios",
  "",
  "[Serviços externos ligados ao backend]",
  "  |- Google Identity Services -> login",
  "  |- Stripe -> checkout, pagamento, webhook",
  "  |- SMTP/Gmail ou Ethereal -> emails e OTP",
];

async function generate() {
  const children = [];

  if (fs.existsSync(logoPath)) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 140 },
        children: [
          new ImageRun({
            data: fs.readFileSync(logoPath),
            transformation: { width: 120, height: 120 },
          }),
        ],
      }),
    );
  }

  children.push(title("Relatório Consolidado e Validado do Projeto Hexomel"));
  children.push(subtitle("Síntese técnica criada a 19/05/2026 com base no código real e nos documentos da pasta estudo."));
  children.push(
    body(
      "Este documento junta, corrige e harmoniza a informação dos dois ficheiros analisados. O objetivo foi manter o que estava certo, corrigir o que estava desatualizado ou incompleto e explicar de forma clara como as tecnologias do site se ligam entre si.",
    ),
  );

  children.push(heading("1. Metodologia de validação"));
  children.push(
    body(
      "A validação foi feita através da leitura dos dois documentos originais, dos apontamentos técnicos já existentes em estudo e da confirmação direta no frontend, backend, configuração do Vite, esquema SQL e módulos principais do projeto.",
    ),
  );

  children.push(heading("2. Resultado da análise aos documentos originais"));
  validationNotes.forEach((item) => children.push(bullet(item)));

  children.push(heading("3. Correções aplicadas ao conteúdo"));
  correctionNotes.forEach((item) => children.push(bullet(item)));

  children.push(heading("4. Tecnologias confirmadas no projeto"));
  children.push(heading("4.1 Frontend", HeadingLevel.HEADING_2));
  frontendTechnologies.forEach((item) => children.push(bullet(item)));

  children.push(heading("4.2 Backend", HeadingLevel.HEADING_2));
  backendTechnologies.forEach((item) => children.push(bullet(item)));

  children.push(heading("4.3 Dados e módulos transversais", HeadingLevel.HEADING_2));
  dataAndModules.forEach((item) => children.push(bullet(item)));

  children.push(heading("5. Funcionalidades que resultam desta arquitetura"));
  features.forEach((item) => children.push(bullet(item)));

  children.push(heading("6. Interligação entre as tecnologias"));
  children.push(
    body(
      "O fluxo central do Hexomel começa no navegador, onde o utilizador interage com páginas HTML renderizadas com CSS e módulos JavaScript. O Vite gere o desenvolvimento e a compilação, mas a lógica funcional vive nos módulos do frontend, que usam Fetch API para comunicar com a API Express.",
    ),
  );
  children.push(
    body(
      "No servidor, o Express centraliza a autenticação, o checkout, os uploads, a comunidade, os workshops, os dashboards e a comunicação com serviços externos. O MySQL guarda a informação persistente do negócio, enquanto o Stripe trata os pagamentos e o Nodemailer trata emails e códigos OTP.",
    ),
  );
  children.push(
    body(
      "Do ponto de vista visual, Bootstrap, SweetAlert2, Chart.js e Three.js não substituem a lógica do projeto; eles entram como camadas especializadas: estrutura de interface, feedback ao utilizador, análise gráfica e visualização 3D. Em paralelo, o sistema de analytics regista interações e volta a alimentar os dashboards administrativos.",
    ),
  );

  children.push(heading("7. Esquema final de interligação"));
  architectureFlow.forEach((line) => children.push(monoLine(line)));

  children.push(blankLine());
  children.push(heading("8. Conclusão"));
  children.push(
    body(
      'Em resumo, os dois documentos analisados tinham boa base, mas precisavam de ser fundidos e ajustados ao estado real do código. O texto final correto para a PAP deve descrever o Hexomel como um site multipágina construído com Vite e JavaScript modular, com backend Node.js/Express, base de dados MySQL, autenticação JWT/Google, checkout Stripe, emails com Nodemailer, dashboards com Chart.js e uma experiência visual reforçada por Bootstrap, SweetAlert2, skeleton loaders e Three.js.',
    ),
  );

  children.push(heading("9. Fontes internas usadas na validação"));
  internalSources.forEach((item) => children.push(bullet(item)));

  const doc = new Document({
    creator: "Codex",
    title: "Relatório Consolidado e Validado do Projeto Hexomel",
    description: "Documento consolidado com validação das tecnologias e arquitetura do projeto Hexomel.",
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Documento criado com sucesso: ${outputPath}`);
}

generate().catch((error) => {
  console.error("Falha ao gerar o relatório consolidado:", error);
  process.exit(1);
});
