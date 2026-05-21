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
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  VerticalAlign,
} = require("docx");

const outputPath = path.join(
  __dirname,
  "relatorio",
  "Secao_Tecnologias_Hexomel_PAP.docx",
);

const logoPath = path.join(__dirname, "logo_hexomel.png");
const printBase = path.join(__dirname, "prints_projeto");

const figures = {
  homepage: {
    path: path.join(printBase, "homepage_hexomel.png"),
    caption:
      "Figura 1 - Página inicial do Hexomel, onde se observam a estrutura HTML, o styling CSS e a organização visual da interface.",
  },
  shop: {
    path: path.join(printBase, "shop_hexomel.png"),
    caption:
      "Figura 2 - Página da loja, usada para exemplificar filtros, componentes reutilizáveis e interação com JavaScript.",
  },
  curiosidades: {
    path: path.join(printBase, "curiosidades_hexomel.png"),
    caption:
      "Figura 3 - Página de curiosidades com o módulo 3D em Three.js para visualização interativa do frasco de mel.",
  },
  admin: {
    path: path.join(printBase, "admin_hexomel.png"),
    caption:
      "Figura 4 - Painel administrativo com gráficos e métricas, demonstrando a utilização de Chart.js e dados do backend.",
  },
};

const stackSummary = [
  {
    layer: "Frontend base",
    technologies: "HTML5, CSS3, JavaScript ES Modules",
    purpose: "Estrutura, aparência e comportamento das páginas do website.",
  },
  {
    layer: "Ferramenta de desenvolvimento",
    technologies: "Vite",
    purpose: "Servidor local rápido, proxy para a API e build otimizada do projeto.",
  },
  {
    layer: "Interface e UX",
    technologies: "Bootstrap, Bootstrap Icons, Font Awesome, SweetAlert2",
    purpose: "Componentes visuais, iconografia e feedback mais moderno ao utilizador.",
  },
  {
    layer: "Visualização avançada",
    technologies: "Chart.js, Three.js",
    purpose: "Gráficos nos dashboards e experiência 3D na área de curiosidades.",
  },
  {
    layer: "Backend",
    technologies: "Node.js, Express",
    purpose: "API REST, lógica de negócio, autenticação e integração com serviços externos.",
  },
  {
    layer: "Segurança e autenticação",
    technologies: "JWT, bcryptjs, Google Identity Services, google-auth-library",
    purpose: "Sessões seguras, palavras-passe protegidas e login com Google.",
  },
  {
    layer: "Dados e ficheiros",
    technologies: "MySQL, mysql2, Multer",
    purpose: "Armazenamento relacional e gestão de uploads de imagens e documentos.",
  },
  {
    layer: "Serviços externos",
    technologies: "Nodemailer, Stripe",
    purpose: "Emails automáticos, OTP no checkout e pagamentos online.",
  },
];

const frontendTech = [
  {
    title: "HTML5",
    whatIs:
      "O HTML5 é a linguagem que define a estrutura das páginas web. É nele que se organizam cabeçalhos, menus, secções, botões, formulários, cartões de produto e áreas de conteúdo.",
    inProject:
      "No projeto Hexomel, o HTML5 está presente em páginas como index.html, shop.html, checkout.html, profile.html e admin.html. Isto mostra que o sistema segue uma abordagem multipágina, em que cada área importante possui a sua própria página.",
  },
  {
    title: "CSS3",
    whatIs:
      "O CSS3 é a tecnologia usada para controlar a apresentação visual do website. Permite definir cores, espaçamentos, tipografia, responsividade, animações e comportamento visual dos componentes.",
    inProject:
      "No Hexomel, o CSS é usado em ficheiros como index.css, modern.css, skeleton.css e i18n.css. É graças a esta camada que o site ganha identidade visual premium, loaders, transições e consistência entre a área pública, o perfil e os dashboards.",
  },
  {
    title: "Bootstrap, Bootstrap Icons e Font Awesome",
    whatIs:
      "Bootstrap é uma framework de interface que facilita a criação de layouts responsivos. Bootstrap Icons e Font Awesome são bibliotecas de ícones que tornam a interface mais clara e profissional.",
    inProject:
      "Estas bibliotecas são usadas no frontend para grelhas, formulários, modais, navegação e ícones. Assim, o desenvolvimento visual ficou mais rápido e o resultado final manteve uma aparência organizada em computador e telemóvel.",
  },
  {
    title: "JavaScript ES Modules",
    whatIs:
      "O JavaScript é a linguagem responsável pela interatividade do site. A sintaxe com módulos ES permite separar o código por ficheiros e responsabilidades, tornando a aplicação mais organizada e reutilizável.",
    inProject:
      "No Hexomel, o JavaScript controla autenticação, carrinho, filtros da loja, perfil, dashboards, comunidade, workshops, analytics e checkout. Módulos como main.js, shop.js, auth.js, checkout.js e analytics.js mostram essa divisão de responsabilidades.",
  },
  {
    title: "Vite",
    whatIs:
      "O Vite é uma ferramenta de desenvolvimento moderna para projetos frontend. A sua função é arrancar rapidamente o projeto, servir os ficheiros durante o desenvolvimento e gerar uma versão otimizada para produção.",
    inProject:
      "No Hexomel, o Vite foi configurado com várias entradas HTML, o que confirma a natureza multipágina do projeto. Também possui proxy para a API em /api, permitindo que o frontend comunique facilmente com o backend local.",
  },
  {
    title: "SweetAlert2",
    whatIs:
      "SweetAlert2 é uma biblioteca usada para apresentar alertas visuais mais apelativos do que as caixas padrão do navegador. É muito útil para mensagens de sucesso, erro, confirmação ou aviso.",
    inProject:
      "No projeto, esta biblioteca aparece em várias áreas, como autenticação, carrinho, checkout, perfil e loja. O seu uso melhora a experiência do utilizador e torna o feedback das ações mais claro e profissional.",
  },
  {
    title: "Chart.js",
    whatIs:
      "Chart.js é uma biblioteca JavaScript destinada à criação de gráficos. Permite transformar dados numéricos em representações visuais fáceis de interpretar.",
    inProject:
      "No Hexomel, Chart.js é usado sobretudo nos dashboards de administração para mostrar métricas, tendências e indicadores de atividade. Isto ajuda a converter dados da base de dados em informação útil para gestão.",
  },
  {
    title: "Three.js",
    whatIs:
      "Three.js é uma biblioteca JavaScript para gráficos 3D no navegador. Com ela é possível renderizar objetos, luzes, câmaras e materiais diretamente numa página web.",
    inProject:
      "No projeto, Three.js é usada na página de curiosidades para apresentar um frasco de mel 3D interativo. O utilizador pode visualizar diferentes tonalidades e propriedades visuais do mel, o que acrescenta valor educativo e tecnológico ao website.",
  },
  {
    title: "i18n, pre-load, View Transitions e analytics",
    whatIs:
      "Estas tecnologias e módulos complementares melhoram a experiência do utilizador. O i18n permite vários idiomas, o pre-load reduz flicker visual, as View Transitions suavizam a troca entre páginas e o analytics regista interações importantes.",
    inProject:
      "No Hexomel, existe um módulo i18n com suporte para português e inglês, um pre-load.js que injeta rapidamente o estado de autenticação e carrinho, transições visuais entre páginas e um módulo analytics.js que envia page views, cliques e eventos de compra para o backend.",
  },
];

const backendTech = [
  {
    title: "Node.js",
    whatIs:
      "Node.js é o ambiente de execução que permite correr JavaScript no servidor. Em vez de ser usado apenas no navegador, o JavaScript passa também a tratar dados, pedidos HTTP e integrações externas no backend.",
    inProject:
      "No Hexomel, o backend corre sobre Node.js. Isso permitiu utilizar a mesma linguagem nas duas camadas principais do projeto, facilitando a consistência do desenvolvimento.",
  },
  {
    title: "Express",
    whatIs:
      "Express é uma framework para Node.js usada para criar APIs e organizar rotas no servidor. Simplifica o tratamento de pedidos, respostas, middlewares e lógica de segurança.",
    inProject:
      "No Hexomel, Express é responsável por rotas de autenticação, produtos, carrinho, encomendas, workshops, comunidade, analytics, perfil, administração e webhooks do Stripe.",
  },
  {
    title: "JWT e bcryptjs",
    whatIs:
      "JWT é um sistema de tokens usado para manter sessões autenticadas de forma segura. bcryptjs é uma biblioteca de hashing que protege palavras-passe, evitando que sejam guardadas em texto simples.",
    inProject:
      "No projeto, bcryptjs é utilizado no registo e na alteração de password, enquanto os tokens JWT são gerados no login e validados nas rotas protegidas. Isto reforça a segurança das contas e do acesso às áreas privadas.",
  },
  {
    title: "Nodemailer e OTP por email",
    whatIs:
      "Nodemailer é uma biblioteca para envio de emails através de SMTP. Um OTP é um código temporário de verificação usado como segunda validação antes de concluir uma operação sensível.",
    inProject:
      "No Hexomel, Nodemailer envia emails relacionados com autenticação e checkout. O sistema gera um código OTP de seis dígitos, envia-o por email e só permite avançar no processo de compra depois dessa confirmação.",
  },
  {
    title: "Stripe",
    whatIs:
      "Stripe é uma plataforma de pagamentos online. Permite criar sessões de checkout, confirmar pagamentos e tratar notificações automáticas através de webhooks.",
    inProject:
      "No projeto, Stripe é usado para iniciar o checkout e confirmar o pagamento das encomendas. O backend cria a sessão de pagamento e o webhook atualiza o estado da encomenda quando a transação é concluída.",
  },
  {
    title: "Multer",
    whatIs:
      "Multer é um middleware para upload de ficheiros em aplicações Express. Serve para receber imagens e documentos enviados a partir de formulários no frontend.",
    inProject:
      "No Hexomel, Multer é utilizado para guardar imagens de produtos, avatars e documentos de pedidos de upgrade. Assim, o sistema suporta conteúdo enviado pelos utilizadores sem depender apenas de texto.",
  },
  {
    title: "Google Identity Services e google-auth-library",
    whatIs:
      "Google Identity Services permite login com conta Google no frontend e a biblioteca google-auth-library valida esse processo no backend.",
    inProject:
      "No projeto, esta integração oferece uma alternativa ao login tradicional. O utilizador pode autenticar-se com a conta Google e o backend confirma a validade do token recebido.",
  },
];

const databaseTech = [
  {
    title: "MySQL",
    whatIs:
      "MySQL é um sistema de gestão de bases de dados relacionais. A sua função é guardar os dados do sistema em tabelas ligadas entre si por relações e chaves estrangeiras.",
    inProject:
      "No Hexomel, o MySQL guarda clientes, produtos, categorias, origens, carrinho, encomendas, workshops, perguntas da comunidade, respostas e interações analíticas. A utilização do motor InnoDB ajuda a garantir integridade e consistência dos dados.",
  },
  {
    title: "mysql2",
    whatIs:
      "mysql2 é a biblioteca usada no backend para comunicar com o MySQL a partir do Node.js. Ela permite executar queries e gerir ligações à base de dados.",
    inProject:
      "No projeto, mysql2 é usado com pool de conexões, o que melhora a organização do acesso aos dados e permite que o backend responda a vários pedidos de forma mais estável.",
  },
  {
    title: "MySQL Workbench",
    whatIs:
      "MySQL Workbench é uma ferramenta gráfica de apoio à administração de bases de dados. Não faz parte do site em execução, mas ajuda no desenho, inspeção e manutenção da estrutura dos dados.",
    inProject:
      "Na PAP, o Workbench pode ser apresentado como a ferramenta usada para observar tabelas, relações, dados inseridos e operações de manutenção da base de dados durante o desenvolvimento.",
  },
];

const architectureFlow = [
  "[Utilizador / Navegador]",
  "          |",
  "          v",
  "[Frontend: HTML5 + CSS3 + JavaScript + Vite]",
  "  |- Interface: Bootstrap, Icons, Font Awesome",
  "  |- UX: SweetAlert2, pre-load, View Transitions",
  "  |- Conteúdo avançado: Chart.js, Three.js, i18n",
  "          |",
  "          v",
  "[Backend: Node.js + Express]",
  "  |- Autenticação: JWT, bcryptjs, Google login",
  "  |- Serviços: Nodemailer, Stripe, Multer",
  "  |- Regras de negócio: carrinho, encomendas, comunidade, dashboards",
  "          |",
  "          v",
  "[Base de dados: MySQL + mysql2]",
];

const databaseFlow = [
  "[cliente] 1 ---- N [encomenda] 1 ---- N [item_encomenda] N ---- 1 [produto]",
  "[cliente] 1 ---- 1 [carrinho] 1 ---- N [item_carrinho] N ---- 1 [produto]",
  "[cliente] 1 ---- N [workshop]",
  "[cliente] 1 ---- N [pergunta_comunidade] 1 ---- N [resposta_comunidade]",
  "[cliente] 1 ---- N [interacao]",
];

function textRun(text, options = {}) {
  return new TextRun({
    text,
    font: "Arial Narrow",
    size: options.size ?? 24,
    bold: options.bold ?? false,
    italics: options.italics ?? false,
    break: options.break ?? 0,
  });
}

function paragraph(text, options = {}) {
  return new Paragraph({
    alignment: options.align ?? AlignmentType.JUSTIFIED,
    spacing: options.spacing ?? { after: 160, line: 300 },
    children: [textRun(text, options)],
  });
}

function title(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 180, line: 320 },
    children: [textRun(text, { size: 34, bold: true })],
  });
}

function subtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 220, line: 300 },
    children: [textRun(text, { size: 22, italics: true })],
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [textRun(text, { size: level === HeadingLevel.HEADING_1 ? 28 : 24, bold: true })],
  });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 100, line: 280 },
    children: [textRun(text, { size: 24 })],
  });
}

function mono(text) {
  return new Paragraph({
    spacing: { after: 40, line: 260 },
    children: [
      new TextRun({
        text,
        font: "Consolas",
        size: 20,
      }),
    ],
  });
}

function labelParagraph(label, text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 300 },
    children: [
      textRun(`${label}: `, { bold: true }),
      textRun(text),
    ],
  });
}

function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200, line: 260 },
    children: [textRun(text, { size: 20, italics: true })],
  });
}

function buildSummaryTable() {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("Camada"),
        headerCell("Tecnologias"),
        headerCell("Função principal"),
      ],
    }),
    ...stackSummary.map(
      (item) =>
        new TableRow({
          children: [
            bodyCell(item.layer),
            bodyCell(item.technologies),
            bodyCell(item.purpose),
          ],
        }),
    ),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

function headerCell(text) {
  return new TableCell({
    shading: { fill: "E8C96B" },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 120, bottom: 120, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [textRun(text, { bold: true, size: 22 })],
      }),
    ],
  });
}

function bodyCell(text) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 40, line: 260 },
        children: [textRun(text, { size: 21 })],
      }),
    ],
  });
}

function buildTechBlock(item, indexLabel) {
  return [
    heading(`${indexLabel} ${item.title}`, HeadingLevel.HEADING_2),
    labelParagraph("O que é", item.whatIs),
    labelParagraph("No projeto Hexomel", item.inProject),
  ];
}

function buildFigure(figure, width, height) {
  if (!fs.existsSync(figure.path)) {
    return [paragraph(`Imagem não encontrada: ${figure.path}`)];
  }

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new ImageRun({
          data: fs.readFileSync(figure.path),
          transformation: { width, height },
        }),
      ],
    }),
    caption(figure.caption),
  ];
}

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
            transformation: { width: 110, height: 110 },
          }),
        ],
      }),
    );
  }

  children.push(title("Secção do Relatório: Tecnologias Utilizadas no Projeto Hexomel"));
  children.push(
    subtitle(
      "Documento de apoio à PAP com linguagem técnica simples, esquema de funcionamento e imagens do próprio projeto.",
    ),
  );

  children.push(heading("1. Objetivo desta secção"));
  children.push(
    paragraph(
      "Esta secção do relatório tem como objetivo explicar as principais tecnologias utilizadas no desenvolvimento do projeto Hexomel. Em vez de apresentar apenas uma lista de nomes, o texto descreve o papel de cada tecnologia e mostra como ela foi aplicada de forma prática no website.",
    ),
  );
  children.push(
    paragraph(
      "A informação foi preparada com base no código real do projeto, na configuração do frontend e backend, no esquema SQL existente e no material de estudo já presente na pasta estudo. Desta forma, o conteúdo fica mais correto, mais claro e mais adequado a um relatório escolar.",
    ),
  );

  children.push(heading("2. Resumo geral da stack tecnológica"));
  children.push(
    paragraph(
      "O projeto Hexomel está dividido em três camadas principais: frontend, backend e base de dados. A tabela seguinte resume as tecnologias mais importantes e a sua função dentro do sistema.",
    ),
  );
  children.push(buildSummaryTable());

  children.push(heading("3. Esquema geral de funcionamento"));
  children.push(
    paragraph(
      "O esquema seguinte mostra a forma como as diferentes tecnologias se ligam entre si durante a utilização normal do website.",
    ),
  );
  architectureFlow.forEach((line) => children.push(mono(line)));

  children.push(heading("4. Tecnologias do frontend"));
  children.push(
    paragraph(
      "O frontend representa tudo aquilo que o utilizador vê e com que interage no navegador. No Hexomel, esta camada foi construída com páginas HTML, estilos CSS, módulos JavaScript e bibliotecas de apoio para melhorar a experiência visual e a interatividade.",
    ),
  );

  frontendTech.forEach((item, index) => {
    buildTechBlock(item, `4.${index + 1}`).forEach((node) => children.push(node));

    if (item.title === "Vite") {
      buildFigure(figures.homepage, 520, 300).forEach((node) => children.push(node));
    }

    if (item.title === "JavaScript ES Modules") {
      buildFigure(figures.shop, 500, 280).forEach((node) => children.push(node));
    }

    if (item.title === "Chart.js") {
      buildFigure(figures.admin, 500, 280).forEach((node) => children.push(node));
    }

    if (item.title === "Three.js") {
      buildFigure(figures.curiosidades, 500, 305).forEach((node) => children.push(node));
    }
  });

  children.push(heading("5. Tecnologias do backend"));
  children.push(
    paragraph(
      "O backend é a parte do sistema responsável por receber pedidos do frontend, validar utilizadores, aceder à base de dados, processar regras de negócio e integrar serviços externos. No Hexomel, esta camada foi desenvolvida com JavaScript no servidor.",
    ),
  );

  backendTech.forEach((item, index) => {
    buildTechBlock(item, `5.${index + 1}`).forEach((node) => children.push(node));
  });

  children.push(heading("6. Base de dados e persistência"));
  children.push(
    paragraph(
      "A base de dados é a camada onde ficam guardadas as informações permanentes do sistema. Sem ela, o website não conseguiria armazenar utilizadores, produtos, carrinho, encomendas, workshops ou métricas de interação.",
    ),
  );

  databaseTech.forEach((item, index) => {
    buildTechBlock(item, `6.${index + 1}`).forEach((node) => children.push(node));
  });

  children.push(heading("6.4 Esquema relacional simplificado", HeadingLevel.HEADING_2));
  children.push(
    paragraph(
      "Para além da arquitetura geral, também é importante compreender de forma resumida como os dados principais do projeto se relacionam entre si.",
    ),
  );
  databaseFlow.forEach((line) => children.push(mono(line)));

  children.push(heading("7. Conclusão"));
  children.push(
    paragraph(
      "As tecnologias escolhidas para o Hexomel mostram uma combinação equilibrada entre desenvolvimento web moderno, organização de código e funcionalidades úteis para um projeto de e-commerce. O frontend garante apresentação apelativa e interação fluida, o backend assegura a lógica de negócio e a segurança, e a base de dados mantém a informação estruturada e persistente.",
    ),
  );
  children.push(
    paragraph(
      "Em contexto de PAP, esta secção demonstra não só que tecnologias foram usadas, mas também porque foram escolhidas e qual a sua utilidade concreta no funcionamento do projeto. Isso ajuda a tornar o relatório mais técnico, mais claro e mais credível.",
    ),
  );

  const doc = new Document({
    creator: "Codex",
    description:
      "Secção de relatório escolar sobre as tecnologias utilizadas no projeto Hexomel.",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Documento gerado com sucesso em: ${outputPath}`);
}

generate().catch((error) => {
  console.error("Falha ao gerar a secção de tecnologias:", error);
  process.exitCode = 1;
});
