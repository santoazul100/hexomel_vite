/**
 * Hexomel i18n — Internationalization Module
 * Supports: PT (default) ↔ EN
 */

const STORAGE_KEY = 'hexomel-lang';

const translations = {
  // ── Navbar ──
  'nav.home':        { pt: 'Início',       en: 'Home' },
  'nav.products':    { pt: 'Produtos',     en: 'Products' },
  'nav.workshops':   { pt: 'Workshops',    en: 'Workshops' },
  'nav.discover':    { pt: 'Descobrir',    en: 'Discover' },
  'nav.curiosities': { pt: 'Curiosidades', en: 'Curiosities' },
  'nav.learn':       { pt: 'Aprender',     en: 'Learn' },
  'nav.community':   { pt: 'Comunidade',   en: 'Community' },
  'nav.about':       { pt: 'Sobre',        en: 'About' },
  'nav.contacts':    { pt: 'Contactos',    en: 'Contacts' },
  'nav.social':      { pt: 'HexoHive',     en: 'HexoHive' },
  'nav.messages':    { pt: 'Mensagens',    en: 'Messages' },
  'nav.profile':     { pt: 'Perfil',       en: 'Profile' },

  // ── Rede Social ──
  'social.title':      { pt: 'Membros & HexoHive',    en: 'Members & HexoHive' },
  'social.subtitle':   { pt: 'Explore e conecte-se com todos os membros e apicultores na nossa plataforma.', en: 'Explore and connect with all members and beekeepers on our platform.' },
  'social.search.ph':  { pt: 'Pesquisar membros por nome...', en: 'Search members by name...' },
  'social.filter.all': { pt: 'Todos', en: 'All' },
  'social.filter.clients': { pt: 'Clientes', en: 'Clients' },
  'social.filter.apicultores': { pt: 'Apicultores', en: 'Beekeepers' },
  'social.msg.btn':    { pt: 'Enviar Mensagem', en: 'Send Message' },
  'social.block.btn':  { pt: 'Bloquear', en: 'Block' },
  'social.unblock.btn':{ pt: 'Desbloquear', en: 'Unblock' },
  'social.report.btn': { pt: 'Denunciar', en: 'Report' },
  'social.empty.title':{ pt: 'Nenhum Membro Encontrado', en: 'No Members Found' },
  'social.empty.desc': { pt: 'Não encontrámos nenhum membro com o nome pesquisado. Tente outro nome.', en: 'We did not find any member with the searched name. Try another name.' },

  // ── Footer ──
  'footer.desc':       { pt: 'Dedicados à produção de mel 100% natural, preservando a pureza e a tradição apícola em cada gota.', en: 'Dedicated to the production of 100% natural honey, preserving the purity and beekeeping tradition in every drop.' },
  'footer.desc.short': { pt: 'Dedicados à produção de mel 100% natural.', en: 'Dedicated to 100% natural honey production.' },
  'footer.desc.alt':   { pt: 'Dedicados à produção de mel 100% natural, preservando a pureza e a tradição apícola.', en: 'Dedicated to 100% natural honey production, preserving purity and beekeeping tradition.' },
  'footer.nav':        { pt: 'Navegação',  en: 'Navigation' },
  'footer.order':      { pt: 'Pedido',     en: 'Order' },
  'footer.cart':       { pt: 'Carrinho',   en: 'Cart' },
  'footer.myaccount':  { pt: 'A minha conta', en: 'My Account' },
  'footer.terms':      { pt: 'Termos',     en: 'Terms' },
  'footer.contacts':   { pt: 'Contactos',  en: 'Contacts' },
  'footer.copy':       { pt: '© 2026 Hexomel — Excelência em Mel Artesanal. Todos os direitos reservados.', en: '© 2026 Hexomel — Excellence in Artisanal Honey. All rights reserved.' },
  'footer.copy.short': { pt: '© 2026 Hexomel — Todos os direitos reservados.', en: '© 2026 Hexomel — All rights reserved.' },

  // ── Index / Home ──
  'home.badge':        { pt: '100% ARTESANAL', en: '100% ARTISANAL' },
  'home.title':        { pt: 'A Doçura Pura da Natureza', en: 'The Pure Sweetness of Nature' },
  'home.subtitle':     { pt: 'Produzimos mel de alta qualidade na Serra da Estrela, preservando métodos tradicionais e a pureza de cada gota.', en: 'We produce high-quality honey in Serra da Estrela, preserving traditional methods and the purity of every drop.' },
  'home.cta.buy':      { pt: 'Comprar Agora', en: 'Shop Now' },
  'home.cta.discover': { pt: 'Descobrir Mais', en: 'Discover More' },
  'home.selection':    { pt: 'A Nossa Seleção', en: 'Our Selection' },
  'home.collection':   { pt: 'Coleção Premium', en: 'Premium Collection' },
  'home.honey1.name':  { pt: 'Mel de Rosmaninho', en: 'Rosemary Honey' },
  'home.honey1.desc':  { pt: 'Suave e aromático, colhido nas encostas ensolaradas.', en: 'Smooth and aromatic, harvested from sunny hillsides.' },
  'home.honey2.name':  { pt: 'Mel de Urze', en: 'Heather Honey' },
  'home.honey2.desc':  { pt: 'Intenso e rico em propriedades antioxidantes.', en: 'Intense and rich in antioxidant properties.' },
  'home.honey3.name':  { pt: 'Mel de Castanheiro', en: 'Chestnut Honey' },
  'home.honey3.desc':  { pt: 'Sabor robusto com notas amadeiradas profundas.', en: 'Robust flavour with deep woody notes.' },
  'home.details':      { pt: 'Ver Detalhes', en: 'View Details' },
  'home.tradition':    { pt: 'Tradição que se Sente', en: 'A Tradition You Can Feel' },
  'home.tradition.p1': { pt: 'O nosso processo de colheita respeita os ciclos da natureza e o bem-estar das abelhas.', en: 'Our harvesting process respects nature\'s cycles and the well-being of bees.' },
  'home.tradition.p2': { pt: 'Desde 1984 que a família Hexomel se dedica à apicultura artesanal. Cada colmeia é tratada com carinho, garantindo um produto final de pureza inigualável.', en: 'Since 1984, the Hexomel family has been dedicated to artisanal beekeeping. Each hive is cared for with love, ensuring unmatched purity.' },
  'home.years':        { pt: 'Anos de Históra', en: 'Years of History' },
  'home.bio':          { pt: 'Bio Certificado', en: 'Bio Certified' },
  'home.why':          { pt: 'Porquê a Hexomel?', en: 'Why Hexomel?' },
  'home.why.sub':      { pt: 'A pureza que você pode sentir em cada gota.', en: 'The purity you can feel in every drop.' },
  'home.organic':      { pt: '100% Orgânico', en: '100% Organic' },
  'home.organic.desc': { pt: 'Produção totalmente livre de químicos, respeitando integralmente o ciclo natural das nossas abelhas.', en: 'Completely chemical-free production, fully respecting the natural cycle of our bees.' },
  'home.artisanal':    { pt: 'Recolha Artesanal', en: 'Artisanal Harvest' },
  'home.artisanal.desc': { pt: 'Técnicas tradicionais passadas por gerações que preservam todas as propriedades medicinais do mel.', en: 'Traditional techniques passed down through generations that preserve all medicinal properties of honey.' },
  'home.purity':       { pt: 'Pureza Garantida', en: 'Guaranteed Purity' },
  'home.purity.desc':  { pt: 'Sem qualquer adição de açúcares, corantes ou conservantes. Apenas o mel no seu estado mais puro.', en: 'No added sugars, colourings or preservatives. Just honey in its purest state.' },
  'home.newsletter':   { pt: 'Junte-se à Nossa Colmeia', en: 'Join Our Hive' },
  'home.newsletter.desc': { pt: 'Subscreva a nossa newsletter para receber ofertas exclusivas, receitas sazonais e novidades sobre as nossas colheitas.', en: 'Subscribe to our newsletter for exclusive offers, seasonal recipes and harvest news.' },
  'home.subscribe':    { pt: 'Subscrever', en: 'Subscribe' },

  // ── About ──
  'about.badge':       { pt: 'NOSSA ESSÊNCIA', en: 'OUR ESSENCE' },
  'about.title':       { pt: 'Mais que Mel,', en: 'More Than Honey,' },
  'about.title2':      { pt: 'Uma Tradição Viva', en: 'A Living Tradition' },
  'about.subtitle':    { pt: 'Desde 1984, dedicamo-nos à arte da apicultura na Serra da Estrela, transformando a magia da natureza num néctar puro e inigualável.', en: 'Since 1984, we have been dedicated to the art of beekeeping in Serra da Estrela, transforming nature\'s magic into a pure, unmatched nectar.' },
  'about.origin':      { pt: 'A Nossa Origem', en: 'Our Origin' },
  'about.generation':  { pt: 'De Geração em Geração', en: 'From Generation to Generation' },
  'about.story.p1':    { pt: 'A Hexomel não é apenas uma marca; é um legado familiar que nasceu do respeito profundo pelo ciclo da vida e pelas abelhas.', en: 'Hexomel is not just a brand; it is a family legacy born from a deep respect for the cycle of life and bees.' },
  'about.story.p2':    { pt: 'Localizados no coração de Portugal, trabalhamos em simbiose com a biodiversidade local. Não apressamos a natureza, acompanhamos o seu ritmo. É este tempo, dedicado e paciente, que confere ao nosso mel as suas propriedades terapêuticas e o seu perfil aromático distinto.', en: 'Located in the heart of Portugal, we work in symbiosis with local biodiversity. We don\'t rush nature, we follow its rhythm. It is this dedicated, patient time that gives our honey its therapeutic properties and distinct aromatic profile.' },
  'about.experience':  { pt: 'Anos de Experiência', en: 'Years of Experience' },
  'about.biological':  { pt: 'Biológico', en: 'Organic' },
  'about.values':      { pt: 'O Que Nos Move', en: 'What Drives Us' },
  'about.sustain':     { pt: 'Sustentabilidade', en: 'Sustainability' },
  'about.sustain.desc': { pt: 'Protegemos a biodiversidade garantindo práticas apícolas que não esgotam, mas regeneram o ecossistema local.', en: 'We protect biodiversity by ensuring beekeeping practices that don\'t deplete but regenerate the local ecosystem.' },
  'about.purity':      { pt: 'Pureza Absoluta', en: 'Absolute Purity' },
  'about.purity.desc': { pt: 'Extração a frio e sem filtração agressiva. O mel chega ao seu frasco exatamente como a natureza o criou.', en: 'Cold extraction without aggressive filtration. The honey reaches your jar exactly as nature created it.' },
  'about.fair':        { pt: 'Comércio Justo', en: 'Fair Trade' },
  'about.fair.desc':   { pt: 'Valorizamos a comunidade local, apoiando pequenos produtores e mantendo viva a economia rural da região.', en: 'We value the local community, supporting small producers and keeping the rural economy alive.' },
  'about.cta':         { pt: 'Descubra o Sabor da Tradição', en: 'Discover the Taste of Tradition' },
  'about.cta.desc':    { pt: 'Deixe-se envolver pela riqueza e complexidade da nossa coleção de méis premium. Uma experiência sensorial única.', en: 'Let yourself be immersed in the richness and complexity of our premium honey collection. A unique sensory experience.' },
  'about.cta.btn':     { pt: 'Visitar a Loja', en: 'Visit the Shop' },
  'about.quote':       { pt: '"Onde a pureza da montanha encontra o cuidado artesanal."', en: '"Where mountain purity meets artisanal care."' },
  'about.quote.author': { pt: '— Família Hexomel', en: '— Hexomel Family' },

  // ── Shop ──
  'shop.filters':      { pt: 'Filtros', en: 'Filters' },
  'shop.categories':   { pt: 'Categorias', en: 'Categories' },
  'shop.origin':       { pt: 'Origem', en: 'Origin' },
  'shop.seller':       { pt: 'Vendedor', en: 'Seller' },
  'shop.hexomel.orig': { pt: 'Originais Hexomel', en: 'Hexomel Originals' },
  'shop.community':    { pt: 'Comunidade de Apicultores', en: 'Beekeeper Community' },
  'shop.maxprice':     { pt: 'Preço Máximo', en: 'Max Price' },
  'shop.title':        { pt: 'Nossos Produtos', en: 'Our Products' },
  'shop.sort':         { pt: 'Ordenar:', en: 'Sort:' },
  'shop.recent':       { pt: 'Mais recentes', en: 'Most Recent' },
  'shop.price.asc':    { pt: 'Preço: Baixo-Alto', en: 'Price: Low-High' },
  'shop.price.desc':   { pt: 'Preço: Alto-Baixo', en: 'Price: High-Low' },
  'shop.search':       { pt: 'Pesquisar por mel, origem, tags...', en: 'Search by honey, origin, tags...' },

  // ── Contact ──
  'contact.title':     { pt: 'Fale Connosco', en: 'Contact Us' },
  'contact.subtitle':  { pt: 'Tem alguma dúvida sobre os nossos produtos ou quer saber mais sobre o nosso processo? Estamos aqui para ajudar.', en: 'Have a question about our products or want to know more about our process? We\'re here to help.' },
  'contact.phone':     { pt: 'Telefone', en: 'Phone' },
  'contact.address':   { pt: 'Morada', en: 'Address' },
  'contact.send':      { pt: 'Envie uma Mensagem', en: 'Send a Message' },
  'contact.name':      { pt: 'NOME COMPLETO', en: 'FULL NAME' },
  'contact.email':     { pt: 'EMAIL', en: 'EMAIL' },
  'contact.subject':   { pt: 'ASSUNTO', en: 'SUBJECT' },
  'contact.message':   { pt: 'MENSAGEM', en: 'MESSAGE' },
  'contact.submit':    { pt: 'Enviar Mensagem', en: 'Send Message' },
  'contact.name.ph':   { pt: 'Seu nome', en: 'Your name' },
  'contact.email.ph':  { pt: 'Seu email', en: 'Your email' },
  'contact.subject.ph': { pt: 'Como podemos ajudar?', en: 'How can we help?' },
  'contact.message.ph': { pt: 'Escreva a sua mensagem aqui...', en: 'Write your message here...' },

  // ── Workshops ──
  'ws.badge':          { pt: 'EXPERIÊNCIAS APÍCOLAS', en: 'BEEKEEPING EXPERIENCES' },
  'ws.subtitle':       { pt: 'Aprenda com apicultores experientes. Descubra os segredos do mel artesanal, participe em experiências únicas e leve para casa conhecimento valioso.', en: 'Learn from experienced beekeepers. Discover the secrets of artisanal honey, join unique experiences and take home valuable knowledge.' },
  'ws.loading':        { pt: 'A carregar workshops...', en: 'Loading workshops...' },
  'ws.empty.title':    { pt: 'Sem Workshops Disponíveis', en: 'No Workshops Available' },
  'ws.empty.desc':     { pt: 'De momento não existem workshops agendados. Volta em breve!', en: 'There are currently no scheduled workshops. Come back soon!' },
  'ws.empty.btn':      { pt: 'Ver Produtos', en: 'View Products' },

  // ── Community ──
  'comm.badge':        { pt: 'COMUNIDADE', en: 'COMMUNITY' },
  'comm.title':        { pt: 'Perguntas & Respostas', en: 'Questions & Answers' },
  'comm.subtitle':     { pt: 'Os nossos apicultores respondem às dúvidas mais frequentes dos clientes. Aprenda diretamente com quem vive a apicultura todos os dias.', en: 'Our beekeepers answer the most frequently asked questions. Learn directly from those who live beekeeping every day.' },
  'comm.question':     { pt: 'Tem alguma dúvida?', en: 'Have a question?' },
  'comm.placeholder':  { pt: 'Ex: Qual é a melhor forma de conservar o mel?', en: 'E.g.: What is the best way to store honey?' },
  'comm.validation':   { pt: 'A pergunta deve ter pelo menos 10 caracteres.', en: 'The question must be at least 10 characters.' },
  'comm.login':        { pt: 'Inicie sessão para participar.', en: 'Sign in to participate.' },
  'comm.submit':       { pt: 'Publicar Pergunta', en: 'Post Question' },
  'comm.loading':      { pt: 'A carregar comunidade...', en: 'Loading community...' },
  'comm.cta.title':    { pt: 'Descubra Mais Sobre o Mel', en: 'Discover More About Honey' },
  'comm.cta.desc':     { pt: 'Explore factos fascinantes sobre o mel, as abelhas e a arte da apicultura na nossa página de curiosidades.', en: 'Explore fascinating facts about honey, bees and the art of beekeeping on our curiosities page.' },
  'comm.cta.btn':      { pt: 'Ver Curiosidades', en: 'View Curiosities' },

  // ── Curiosidades ──
  'cur.badge':         { pt: 'SABIA QUE...', en: 'DID YOU KNOW...' },
  'cur.title':         { pt: 'Curiosidades do Mundo do Mel', en: 'Curiosities of the Honey World' },
  'cur.subtitle':      { pt: 'Descubra factos fascinantes sobre o mel, as abelhas e a arte da apicultura. Uma viagem interativa pelo doce mundo da natureza.', en: 'Discover fascinating facts about honey, bees and the art of beekeeping. An interactive journey through nature\'s sweet world.' },
  'cur.3d.all':        { pt: 'Tudo', en: 'All' },
  'cur.3d.lid':        { pt: 'Tampa', en: 'Lid' },
  'cur.3d.honey':      { pt: 'Mel', en: 'Honey' },
  'cur.3d.loading':    { pt: 'A carregar 3D...', en: 'Loading 3D...' },
  'cur.3d.drag':       { pt: 'Arraste para explorar', en: 'Drag to explore' },
  'cur.3d.color':      { pt: 'Cor do Mel', en: 'Honey Colour' },
  'cur.3d.light':      { pt: 'Claro', en: 'Light' },
  'cur.3d.medium':     { pt: 'Médio', en: 'Medium' },
  'cur.3d.dark':       { pt: 'Escuro', en: 'Dark' },
  'cur.join':          { pt: 'Junta-te à Comunidade', en: 'Join the Community' },
  'cur.join.desc':     { pt: 'Explora com centenas de amantes de mel.', en: 'Explore with hundreds of honey lovers.' },
  'cur.join.btn':      { pt: 'Ver', en: 'View' },
  'cur.stat1':         { pt: 'A volta ao mundo para 1kg de mel', en: 'Around the world for 1kg of honey' },
  'cur.stat2':         { pt: 'O mel puro nunca expira', en: 'Pure honey never expires' },
  'cur.stat3':         { pt: 'Das plantas dependem das abelhas', en: 'Of plants depend on bees' },
  'cur.stat4':         { pt: 'Substâncias benéficas', en: 'Beneficial substances' },
  'cur.colors.badge':  { pt: 'CORES DO MEL', en: 'HONEY COLOURS' },
  'cur.colors.title':  { pt: 'Porque Tem o Mel Cores Diferentes?', en: 'Why Does Honey Have Different Colours?' },
  'cur.colors.desc':   { pt: 'A cor do mel depende da origem botânica e dos minerais presentes. Méis claros são mais suaves; escuros são mais intensos e ricos em antioxidantes.', en: 'Honey colour depends on botanical origin and minerals present. Light honeys are milder; dark ones are more intense and rich in antioxidants.' },
  'cur.lifecycle.badge': { pt: 'CICLO DE VIDA', en: 'LIFECYCLE' },
  'cur.lifecycle.title': { pt: 'O Ciclo de Vida da Abelha', en: 'The Bee Lifecycle' },
  'cur.lifecycle.desc': { pt: 'Da postura do ovo à abelha adulta, uma metamorfose completa em apenas 21 dias.', en: 'From egg laying to adult bee, a complete metamorphosis in just 21 days.' },
  'cur.history.badge': { pt: 'HISTÓRIA', en: 'HISTORY' },
  'cur.history.title': { pt: 'A Evolução da Apicultura', en: 'The Evolution of Beekeeping' },
  'cur.history.desc':  { pt: 'Da arte rupestre aos apiários modernos, uma história de milhares de anos.', en: 'From cave art to modern apiaries, a story spanning thousands of years.' },
  'cur.facts.badge':   { pt: 'FACTOS', en: 'FACTS' },
  'cur.facts.title':   { pt: 'Factos Fascinantes', en: 'Fascinating Facts' },
  'cur.facts.desc':    { pt: 'Cada facto é uma viagem ao universo das abelhas', en: 'Each fact is a journey into the universe of bees' },
  'cur.cta.title':     { pt: 'Quer Aprender Mais?', en: 'Want to Learn More?' },
  'cur.cta.desc':      { pt: 'Teste os seus conhecimentos com o nosso quiz interativo ou participe na comunidade.', en: 'Test your knowledge with our interactive quiz or join the community.' },
  'cur.cta.quiz':      { pt: 'Quiz Interativo', en: 'Interactive Quiz' },

  // ── Aprender ──
  'learn.badge':       { pt: 'EDUCAÇÃO', en: 'EDUCATION' },
  'learn.title':       { pt: 'Aprende Sobre o Mundo das Abelhas', en: 'Learn About the World of Bees' },
  'learn.subtitle':    { pt: 'Testa os teus conhecimentos com o nosso quiz, descobre factos surpreendentes e explora o glossário do mel.', en: 'Test your knowledge with our quiz, discover surprising facts and explore the honey glossary.' },
  'learn.cta.quiz':    { pt: 'Começar o Quiz', en: 'Start the Quiz' },
  'learn.quiz.badge':  { pt: 'QUIZ', en: 'QUIZ' },
  'learn.quiz.title':  { pt: 'Quiz: Quanto Sabes Sobre Abelhas?', en: 'Quiz: How Much Do You Know About Bees?' },
  'learn.quiz.desc':   { pt: 'Responde às perguntas e descobre a tua pontuação!', en: 'Answer the questions and discover your score!' },
  'learn.quiz.next':   { pt: 'Próxima', en: 'Next' },
  'learn.quiz.done':   { pt: 'Quiz Concluído!', en: 'Quiz Complete!' },
  'learn.quiz.retry':  { pt: 'Tentar Novamente', en: 'Try Again' },
  'learn.reveal.badge': { pt: 'DESCOBRE', en: 'DISCOVER' },
  'learn.reveal.title': { pt: 'Factos Para Descobrir', en: 'Facts to Discover' },
  'learn.reveal.desc': { pt: 'Clica nos cartões para revelar factos surpreendentes!', en: 'Click the cards to reveal surprising facts!' },
  'learn.reveal.tap':  { pt: 'Toca para revelar', en: 'Tap to reveal' },
  'learn.glossary.badge': { pt: 'GLOSSÁRIO', en: 'GLOSSARY' },
  'learn.glossary.title': { pt: 'Glossário do Mel', en: 'Honey Glossary' },
  'learn.glossary.desc':  { pt: 'Termos essenciais do mundo apícola', en: 'Essential terms from the beekeeping world' },
  'learn.explore':     { pt: 'Explora Mais', en: 'Explore More' },
  'learn.explore.desc': { pt: 'Visita a página de curiosidades ou junta-te à comunidade Hexomel.', en: 'Visit the curiosities page or join the Hexomel community.' },

  // ── Auth (injected by main.js) ──
  'auth.login':        { pt: 'Iniciar Sessão', en: 'Sign In' },
  'auth.register':     { pt: 'Criar Conta', en: 'Create Account' },
  'auth.enter':        { pt: 'Entrar', en: 'Sign In' },
  'auth.create':       { pt: 'Criar conta', en: 'Create Account' },

  // ── Newsletter placeholder ──
  'home.email.ph':     { pt: 'O seu melhor email...', en: 'Your best email...' },

  // ── Loading / Placeholder ──
  'loading.text':      { pt: 'Carregando', en: 'Loading' },
};

/** Get current language */
export function getLang() {
  return localStorage.getItem(STORAGE_KEY) || 'pt';
}

// ── SVG Flag Icons (inline base64 for cross-platform consistency) ──
const FLAG_SVG = {
  pt: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#006600" d="M0 0h256v480H0z"/><path fill="#ff0000" d="M256 0h384v480H256z"/><circle cx="256" cy="240" r="80" fill="#ff0" stroke="#006600" stroke-width="4"/><path fill="#006600" d="M256 176c-14 0-26 4-36 12l36 52 36-52c-10-8-22-12-36-12z"/><path fill="#ff0000" d="M220 240c0-20 16-36 36-36s36 16 36 36-16 36-36 36-36-16-36-36z"/><path fill="#fff" d="M240 220h32v40h-32z"/></svg>`,
  en: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#012169" d="M0 0h640v480H0z"/><path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"/><path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z"/><path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/><path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z"/></svg>`
};

/** Get flag SVG HTML for a language */
function getFlagHTML(lang) {
  return `<span class="lang-flag-svg">${FLAG_SVG[lang] || FLAG_SVG.pt}</span>`;
}

/** Set language and apply translations */
export function setLang(lang) {
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations(lang);
  document.documentElement.lang = lang;
  
  // Update toggle button UI
  const btn = document.getElementById('lang-toggle-btn');
  if (btn) {
    const flagWrap = btn.querySelector('.lang-flag');
    const label = btn.querySelector('.lang-label');
    if (flagWrap) flagWrap.innerHTML = getFlagHTML(lang);
    if (label) label.textContent = lang.toUpperCase();
    btn.title = lang === 'pt' ? 'Switch to English' : 'Mudar para Português';
  }
}

/** Toggle between PT and EN */
export function toggleLang() {
  const current = getLang();
  setLang(current === 'pt' ? 'en' : 'pt');
}

/** Apply translations to all [data-i18n] elements */
function applyTranslations(lang) {
  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const entry = translations[key];
    if (entry && entry[lang]) {
      el.textContent = entry[lang];
    }
  });

  // innerHTML (for elements with icons inside)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const entry = translations[key];
    if (entry && entry[lang]) {
      // Preserve leading icons
      const icons = el.querySelectorAll('i');
      const iconHTML = Array.from(icons).map(i => i.outerHTML).join('');
      el.innerHTML = iconHTML + entry[lang];
    }
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const entry = translations[key];
    if (entry && entry[lang]) {
      el.placeholder = entry[lang];
    }
  });
}

/** Initialize — apply saved language on page load */
export function initI18n() {
  const lang = getLang();
  if (lang !== 'pt') {
    applyTranslations(lang);
  }
  document.documentElement.lang = lang;
}

export function updateTranslation(key, lang, value) {
  if (translations[key]) {
    translations[key][lang] = value;
  } else {
    translations[key] = { [lang]: value };
  }
}

/** Create the language toggle button HTML */
export function createLangToggle() {
  const lang = getLang();
  return `
    <button id="lang-toggle-btn" class="lang-toggle-btn" onclick="window.__toggleLang()" title="${lang === 'pt' ? 'Switch to English' : 'Mudar para Português'}">
      <span class="lang-flag">${getFlagHTML(lang)}</span>
      <span class="lang-label">${lang.toUpperCase()}</span>
    </button>
  `;
}

// Expose toggle globally for onclick
window.__toggleLang = toggleLang;
