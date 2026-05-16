/**
 * Batch add data-i18n attributes to navbar and footer across all public HTML pages.
 * Also adds page-specific i18n attributes.
 */
const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, 'frontend');

// Pages to process (excluding index.html which is already done)
const pages = [
  'shop.html', 'about.html', 'contact.html', 'workshops.html',
  'curiosidades.html', 'aprender.html', 'comunidade.html'
];

// Common navbar replacements
const navReplacements = [
  // Nav links
  ['>Início</a>', ' data-i18n="nav.home">Início</a>'],
  ['>Produtos</a>', ' data-i18n="nav.products">Produtos</a>'],
  ['>Workshops</a>', ' data-i18n="nav.workshops">Workshops</a>'],
  ['aria-expanded="false">Descobrir</a>', 'aria-expanded="false" data-i18n="nav.discover">Descobrir</a>'],
  ['>Curiosidades</a></li>', ' data-i18n="nav.curiosities">Curiosidades</a></li>'],
  ['>Aprender</a></li>', ' data-i18n="nav.learn">Aprender</a></li>'],
  ['>Comunidade</a></li>', ' data-i18n="nav.community">Comunidade</a></li>'],
  ['>Sobre</a>', ' data-i18n="nav.about">Sobre</a>'],
  ['>Contactos</a>', ' data-i18n="nav.contacts">Contactos</a>'],
];

// Common footer replacements
const footerReplacements = [
  // Footer headings
  ['class="footer-heading">Navegação</h5>', 'class="footer-heading" data-i18n="footer.nav">Navegação</h5>'],
  ['class="footer-heading">Pedido</h5>', 'class="footer-heading" data-i18n="footer.order">Pedido</h5>'],
  ['class="footer-heading">Contactos</h5>', 'class="footer-heading" data-i18n="footer.contacts">Contactos</h5>'],
  // Footer links
  ['class="footer-link">Início</a>', 'class="footer-link" data-i18n="nav.home">Início</a>'],
  ['class="footer-link">Produtos</a>', 'class="footer-link" data-i18n="nav.products">Produtos</a>'],
  ['class="footer-link">Workshops</a>', 'class="footer-link" data-i18n="nav.workshops">Workshops</a>'],
  ['class="footer-link">Sobre</a>', 'class="footer-link" data-i18n="nav.about">Sobre</a>'],
  ['class="footer-link">Contactos</a>', 'class="footer-link" data-i18n="nav.contacts">Contactos</a>'],
  ['class="footer-link">Curiosidades</a>', 'class="footer-link" data-i18n="nav.curiosities">Curiosidades</a>'],
  ['class="footer-link">Aprender</a>', 'class="footer-link" data-i18n="nav.learn">Aprender</a>'],
  ['class="footer-link">Comunidade</a>', 'class="footer-link" data-i18n="nav.community">Comunidade</a>'],
  ['class="footer-link">Carrinho</a>', 'class="footer-link" data-i18n="footer.cart">Carrinho</a>'],
  ['class="footer-link">A minha conta</a>', 'class="footer-link" data-i18n="footer.myaccount">A minha conta</a>'],
  ['class="footer-link">Termos</a>', 'class="footer-link" data-i18n="footer.terms">Termos</a>'],
  // Footer copy (multiple variants)
  ['<p class="mb-0">\r\n            &copy; 2026 Hexomel', '<p class="mb-0" data-i18n="footer.copy">\r\n            &copy; 2026 Hexomel'],
  ['<p class="mb-0">&copy; 2026 Hexomel — Excelência', '<p class="mb-0" data-i18n="footer.copy">&copy; 2026 Hexomel — Excelência'],
  ['<p class="mb-0">&copy; 2026 Hexomel — Todos', '<p class="mb-0" data-i18n="footer.copy.short">&copy; 2026 Hexomel — Todos'],
];

// Page-specific replacements
const pageSpecific = {
  'shop.html': [
    ['>Filtros</h3>', ' data-i18n="shop.filters">Filtros</h3>'],
    ['>Categorias</h5>', ' data-i18n="shop.categories">Categorias</h5>'],
    ['>Origem</h5>', ' data-i18n="shop.origin">Origem</h5>'],
    ['>Vendedor</h5>', ' data-i18n="shop.seller">Vendedor</h5>'],
    ['>Originais Hexomel</span>', ' data-i18n="shop.hexomel.orig">Originais Hexomel</span>'],
    ['>Comunidade de Apicultores</span', ' data-i18n="shop.community">Comunidade de Apicultores</span'],
    ['>Preço Máximo</h5>', ' data-i18n="shop.maxprice">Preço Máximo</h5>'],
    ['>Nossos Produtos</h2>', ' data-i18n="shop.title">Nossos Produtos</h2>'],
    ['placeholder="Pesquisar por mel, origem, tags..."', 'placeholder="Pesquisar por mel, origem, tags..." data-i18n-ph="shop.search"'],
    // Footer desc
    ['style="max-width: 300px; font-size: 0.95rem; line-height: 1.6"\r\n            >\r\n              Dedicados', 'style="max-width: 300px; font-size: 0.95rem; line-height: 1.6" data-i18n="footer.desc"\r\n            >\r\n              Dedicados'],
  ],
  'about.html': [
    ['>NOSSA ESSÊNCIA</span', ' data-i18n="about.badge">NOSSA ESSÊNCIA</span'],
    ['>Mais que Mel,<br />Uma Tradição Viva</h1>', ' data-i18n-html="about.title">Mais que Mel,<br />Uma Tradição Viva</h1>'],
    ['class="about-hero-subtitle">', 'class="about-hero-subtitle" data-i18n="about.subtitle">'],
    ['>A Nossa Origem</span', ' data-i18n="about.origin">A Nossa Origem</span'],
    ['>De Geração em Geração', ' data-i18n="about.generation">De Geração em Geração'],
    ['>O Que Nos Move', ' data-i18n="about.values">O Que Nos Move'],
    ['>Sustentabilidade</h4>', ' data-i18n="about.sustain">Sustentabilidade</h4>'],
    ['>Pureza Absoluta</h4>', ' data-i18n="about.purity">Pureza Absoluta</h4>'],
    ['>Comércio Justo</h4>', ' data-i18n="about.fair">Comércio Justo</h4>'],
    ['>Descubra o Sabor da Tradição', ' data-i18n="about.cta">Descubra o Sabor da Tradição'],
    ['>Visitar a Loja', ' data-i18n="about.cta.btn">Visitar a Loja'],
    ['style="max-width: 300px; font-size: 0.95rem; line-height: 1.6"\r\n            >\r\n              Dedicados', 'style="max-width: 300px; font-size: 0.95rem; line-height: 1.6" data-i18n="footer.desc"\r\n            >\r\n              Dedicados'],
  ],
  'contact.html': [
    ['>Fale Connosco', ' data-i18n="contact.title">Fale Connosco'],
    ['>Telefone</h5>', ' data-i18n="contact.phone">Telefone</h5>'],
    ['>Morada</h5>', ' data-i18n="contact.address">Morada</h5>'],
    ['>Envie uma Mensagem', ' data-i18n="contact.send">Envie uma Mensagem'],
    ['>NOME COMPLETO</label', ' data-i18n="contact.name">NOME COMPLETO</label'],
    ['>EMAIL</label', ' data-i18n="contact.email">EMAIL</label'],
    ['>ASSUNTO</label', ' data-i18n="contact.subject">ASSUNTO</label'],
    ['>MENSAGEM</label', ' data-i18n="contact.message">MENSAGEM</label'],
    ['placeholder="Seu nome"', 'placeholder="Seu nome" data-i18n-ph="contact.name.ph"'],
    ['placeholder="Seu email"', 'placeholder="Seu email" data-i18n-ph="contact.email.ph"'],
    ['placeholder="Como podemos ajudar?"', 'placeholder="Como podemos ajudar?" data-i18n-ph="contact.subject.ph"'],
    ['placeholder="Escreva a sua mensagem aqui..."', 'placeholder="Escreva a sua mensagem aqui..." data-i18n-ph="contact.message.ph"'],
    ['>Enviar Mensagem</button>', ' data-i18n="contact.submit">Enviar Mensagem</button>'],
    ['style="max-width: 300px; font-size: 0.95rem; line-height: 1.6"\r\n            >\r\n              Dedicados', 'style="max-width: 300px; font-size: 0.95rem; line-height: 1.6" data-i18n="footer.desc"\r\n            >\r\n              Dedicados'],
  ],
  'workshops.html': [
    ['>EXPERIÊNCIAS APÍCOLAS</span>', ' data-i18n="ws.badge">EXPERIÊNCIAS APÍCOLAS</span>'],
    ['>Sem Workshops Disponíveis</h3>', ' data-i18n="ws.empty.title">Sem Workshops Disponíveis</h3>'],
    ['>Ver Produtos</a>', ' data-i18n="ws.empty.btn">Ver Produtos</a>'],
    ['style="max-width: 300px; font-size: 0.95rem; line-height: 1.6"\r\n            >\r\n              Dedicados', 'style="max-width: 300px; font-size: 0.95rem; line-height: 1.6" data-i18n="footer.desc"\r\n            >\r\n              Dedicados'],
  ],
  'comunidade.html': [
    ['>COMUNIDADE</span>', ' data-i18n="comm.badge">COMUNIDADE</span>'],
    ['Perguntas & Respostas', 'Perguntas & Respostas'],
    ['>Tem alguma', ' data-i18n="comm.question">Tem alguma'],
    ['>Publicar Pergunta', ' data-i18n="comm.submit">Publicar Pergunta'],
    ['placeholder="Ex: Qual é a melhor forma de conservar o mel?"', 'placeholder="Ex: Qual é a melhor forma de conservar o mel?" data-i18n-ph="comm.placeholder"'],
    ['>Descubra Mais Sobre o Mel', ' data-i18n="comm.cta.title">Descubra Mais Sobre o Mel'],
    ['>Ver Curiosidades', ' data-i18n="comm.cta.btn">Ver Curiosidades'],
    ['style="max-width: 300px; font-size: 0.95rem; line-height: 1.6">\r\n            Dedicados', 'style="max-width: 300px; font-size: 0.95rem; line-height: 1.6" data-i18n="footer.desc">\r\n            Dedicados'],
  ],
  'curiosidades.html': [
    ['>SABIA QUE...</span>', ' data-i18n="cur.badge">SABIA QUE...</span>'],
    ['>Curiosidades do Mundo do Mel</h1>', ' data-i18n="cur.title">Curiosidades do Mundo do Mel</h1>'],
    ['>Tudo</button>', ' data-i18n="cur.3d.all">Tudo</button>'],
    ['>Tampa</button>', ' data-i18n="cur.3d.lid">Tampa</button>'],
    ['>Mel</button>', ' data-i18n="cur.3d.honey">Mel</button>'],
    ['>A carregar 3D...</p>', ' data-i18n="cur.3d.loading">A carregar 3D...</p>'],
    ['>Cor do Mel</span>', ' data-i18n="cur.3d.color">Cor do Mel</span>'],
    ['>Claro</span><span>Médio</span><span>Escuro</span>', ' data-i18n="cur.3d.light">Claro</span><span data-i18n="cur.3d.medium">Médio</span><span data-i18n="cur.3d.dark">Escuro</span>'],
    ['>Junta-te à Comunidade</strong>', ' data-i18n="cur.join">Junta-te à Comunidade</strong>'],
    ['>CORES DO MEL</span>', ' data-i18n="cur.colors.badge">CORES DO MEL</span>'],
    ['>Porque Tem o Mel Cores Diferentes?</h2>', ' data-i18n="cur.colors.title">Porque Tem o Mel Cores Diferentes?</h2>'],
    ['>CICLO DE VIDA</span>', ' data-i18n="cur.lifecycle.badge">CICLO DE VIDA</span>'],
    ['>O Ciclo de Vida da Abelha</h2>', ' data-i18n="cur.lifecycle.title">O Ciclo de Vida da Abelha</h2>'],
    ['>HISTÓRIA</span>', ' data-i18n="cur.history.badge">HISTÓRIA</span>'],
    ['>A Evolução da Apicultura</h2>', ' data-i18n="cur.history.title">A Evolução da Apicultura</h2>'],
    ['>FACTOS</span>', ' data-i18n="cur.facts.badge">FACTOS</span>'],
    ['>Factos Fascinantes</h2>', ' data-i18n="cur.facts.title">Factos Fascinantes</h2>'],
    ['>Quer Aprender Mais?</h2>', ' data-i18n="cur.cta.title">Quer Aprender Mais?</h2>'],
    ['>Quiz Interativo</a>', ' data-i18n="cur.cta.quiz">Quiz Interativo</a>'],
    ['font-size:0.95rem;line-height:1.6">Dedicados à produção de mel 100% natural, preservando a pureza e a tradição apícola.</p>', 'font-size:0.95rem;line-height:1.6" data-i18n="footer.desc.alt">Dedicados à produção de mel 100% natural, preservando a pureza e a tradição apícola.</p>'],
  ],
  'aprender.html': [
    ['>EDUCAÇÃO</span>', ' data-i18n="learn.badge">EDUCAÇÃO</span>'],
    ['>Aprende Sobre o Mundo das Abelhas</h1>', ' data-i18n="learn.title">Aprende Sobre o Mundo das Abelhas</h1>'],
    ['>Começar o Quiz</a>', ' data-i18n="learn.cta.quiz">Começar o Quiz</a>'],
    ['>QUIZ</span>', ' data-i18n="learn.quiz.badge">QUIZ</span>'],
    ['>Quiz: Quanto Sabes Sobre Abelhas?</h2>', ' data-i18n="learn.quiz.title">Quiz: Quanto Sabes Sobre Abelhas?</h2>'],
    ['>Quiz Concluído!</h2>', ' data-i18n="learn.quiz.done">Quiz Concluído!</h2>'],
    ['>DESCOBRE</span>', ' data-i18n="learn.reveal.badge">DESCOBRE</span>'],
    ['>Factos Para Descobrir</h2>', ' data-i18n="learn.reveal.title">Factos Para Descobrir</h2>'],
    ['>GLOSSÁRIO</span>', ' data-i18n="learn.glossary.badge">GLOSSÁRIO</span>'],
    ['>Glossário do Mel</h2>', ' data-i18n="learn.glossary.title">Glossário do Mel</h2>'],
    ['>Explora Mais</h2>', ' data-i18n="learn.explore">Explora Mais</h2>'],
    ['font-size:0.95rem;line-height:1.6">Dedicados à produção de mel 100% natural.</p>', 'font-size:0.95rem;line-height:1.6" data-i18n="footer.desc.short">Dedicados à produção de mel 100% natural.</p>'],
  ],
};

for (const page of pages) {
  const filePath = path.join(frontendDir, page);
  let content = fs.readFileSync(filePath, 'utf-8');
  let changes = 0;

  // Apply nav replacements
  for (const [search, replace] of navReplacements) {
    if (content.includes(search) && !content.includes(replace)) {
      content = content.replace(search, replace);
      changes++;
    }
  }

  // Apply footer replacements
  for (const [search, replace] of footerReplacements) {
    if (content.includes(search) && !content.includes(replace)) {
      content = content.replace(search, replace);
      changes++;
    }
  }

  // Apply page-specific replacements
  if (pageSpecific[page]) {
    for (const [search, replace] of pageSpecific[page]) {
      if (content.includes(search) && !content.includes(replace)) {
        content = content.replace(search, replace);
        changes++;
      }
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${page}: ${changes} replacements`);
}

console.log('\nDone! All pages updated with data-i18n attributes.');
