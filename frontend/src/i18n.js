/**
 * Hexomel i18n — Internationalization Module
 * Supports: PT (default) ↔ EN
 */

const STORAGE_KEY = 'hexomel-lang';

const translations = {
  // ── Autenticação ──
  'auth.login':        { pt: 'Iniciar Sessão', en: 'Sign In' },
  'auth.login.desc':   { pt: 'Bem-vindo de volta! Introduza os seus dados para aceder.', en: 'Welcome back! Enter your details to access.' },
  'auth.email':        { pt: 'EMAIL OU USERNAME', en: 'EMAIL OR USERNAME' },
  'auth.email.ph':     { pt: 'email@exemplo.com ou username', en: 'email@example.com or username' },
  'auth.password':     { pt: 'PASSWORD', en: 'PASSWORD' },
  'auth.password.ph':  { pt: 'Sua password', en: 'Your password' },
  'auth.forgot':       { pt: 'Esqueceu-se da palavra-passe?', en: 'Forgot your password?' },
  'auth.enter':        { pt: 'Entrar', en: 'Sign In' },
  'auth.or':           { pt: 'ou entrar com', en: 'or sign in with' },
  'auth.noaccount':    { pt: 'Não tem uma conta? ', en: 'Don\'t have an account? ' },
  'auth.create':       { pt: 'Criar conta', en: 'Create account' },
  
  'auth.reg.title':    { pt: 'Criar Conta', en: 'Create Account' },
  'auth.reg.desc':     { pt: 'Registe-se e desfrute do mel 100% puro e das nossas novidades.', en: 'Register and enjoy 100% pure honey and our news.' },
  'auth.reg.name':     { pt: 'NOME COMPLETO', en: 'FULL NAME' },
  'auth.reg.name_ph':  { pt: 'Como deseja aparecer', en: 'How you want to appear' },
  'auth.reg.username': { pt: 'NOME DE UTILIZADOR', en: 'USERNAME' },
  'auth.reg.username_ph': { pt: 'Ex: joao_silva', en: 'E.g.: john_doe' },
  'auth.reg.email_ph': { pt: 'nome@exemplo.com', en: 'name@example.com' },
  'auth.reg.pass_label': { pt: 'PASSWORD', en: 'PASSWORD' },
  'auth.reg.pass_ph':  { pt: 'Crie uma password forte', en: 'Create a strong password' },
  'auth.reg.pass_min': { pt: 'Mínimo 6 caracteres', en: 'Minimum 6 characters' },
  'auth.reg.confpass_label': { pt: 'CONFIRMAR PASSWORD', en: 'CONFIRM PASSWORD' },
  'auth.reg.confpass_ph': { pt: 'Repita a password', en: 'Repeat the password' },
  'auth.reg.accept':   { pt: 'Aceito os ', en: 'I accept the ' },
  'auth.reg.terms_link': { pt: 'Termos e Condições', en: 'Terms and Conditions' },
  'auth.reg.btn':      { pt: 'Registar', en: 'Register' },
  'auth.reg.already':  { pt: 'Já tem uma conta? ', en: 'Already have an account? ' },

  'auth.rec.h2':       { pt: 'Recuperar Palavra-passe', en: 'Recover Password' },
  'auth.rec.desc':     { pt: 'Introduza o seu email ou nome de utilizador.<br />Enviaremos um link seguro para redefinir o acesso.', en: 'Enter your email or username.<br />We will send a secure link to reset access.' },
  'auth.rec.email_label': { pt: 'EMAIL OU USERNAME', en: 'EMAIL OR USERNAME' },
  'auth.rec.email_ph': { pt: 'Email ou nome de utilizador', en: 'Email or username' },
  'auth.rec.btn_send': { pt: 'Enviar Link de Recuperação', en: 'Send Recovery Link' },

  'auth.ver.title':    { pt: 'Verificar Email — Hexomel', en: 'Verify Email — Hexomel' },
  'auth.ver.h2':       { pt: 'Verificação de Email', en: 'Email Verification' },
  'auth.ver.verifying':{ pt: 'A verificar a sua conta, aguarde um momento...', en: 'Verifying your account, please wait...' },
  'auth.ver.back_home':{ pt: 'Voltar à Página Inicial', en: 'Back to Home Page' },

  // ── Outras Páginas (Sucesso/Erro/Apicultor) ──
  'succ.title':        { pt: 'Sucesso | Hexomel 🐝', en: 'Success | Hexomel 🐝' },
  'succ.heading':      { pt: 'Encomenda Recebida!', en: 'Order Received!' },
  'succ.message':      { pt: 'A tua encomenda foi processada com sucesso pela nossa colmeia.', en: 'Your order was successfully processed by our hive.' },
  'succ.loadingOrder': { pt: 'A carregar encomenda...', en: 'Loading order...' },
  'succ.emailInfo':    { pt: 'Enviámos um email com os detalhes da tua encomenda.', en: 'We sent an email with your order details.' },
  'succ.goHome':       { pt: 'Voltar ao Início', en: 'Back to Home' },

  'canc.title':        { pt: 'Pagamento Cancelado | Hexomel 🐝', en: 'Payment Cancelled | Hexomel 🐝' },
  'canc.heading':      { pt: 'Pagamento Cancelado', en: 'Payment Cancelled' },
  'canc.message':      { pt: 'Parece que o pagamento não foi concluído. Não te preocupes, os teus itens ainda estão no carrinho.', en: 'It seems the payment was not completed. Don\'t worry, your items are still in the cart.' },
  'canc.retry':        { pt: 'Tentar Novamente', en: 'Try Again' },
  'canc.backToShop':   { pt: 'Voltar à Loja', en: 'Back to Shop' },

  'apis.title':        { pt: 'Apicultores - Hexomel', en: 'Beekeepers - Hexomel' },
  'apis.badge':        { pt: 'NOSSOS PRODUTORES', en: 'OUR PRODUCERS' },
  'apis.heading':      { pt: 'Nossos Apicultores', en: 'Our Beekeepers' },
  'apis.subtitle':     { pt: 'Conheça os apicultores que dedicam a sua vida à produção do melhor mel artesanal.', en: 'Meet the beekeepers who dedicate their lives to producing the best artisanal honey.' },

  'apic.title':        { pt: 'Perfil do Apicultor - Hexomel', en: 'Beekeeper Profile - Hexomel' },
  'apic.loading':      { pt: 'Carregando...', en: 'Loading...' },
  'apicultor.verified':{ pt: '<i class="fas fa-check-circle me-1"></i> Apicultor Verificado', en: '<i class="fas fa-check-circle me-1"></i> Verified Beekeeper' },
  'apic.productsTitle':{ pt: 'Produtos do Apicultor', en: 'Beekeeper Products' },
  'apic.workshopsTitle':{ pt: 'Experiências e Workshops', en: 'Experiences and Workshops' },

  // ── Dashboards ──
  'dash.modal.product.name': { pt: 'Nome do Produto', en: 'Product Name' },
  'dash.modal.product.name_ph': { pt: 'Ex: Mel de Rosmaninho', en: 'E.g.: Rosemary Honey' },
  'dash.modal.product.slug': { pt: 'Slug (URL Amigável)', en: 'Slug (Friendly URL)' },
  'dash.modal.product.slug_ph': { pt: 'ex: mel-de-rosmaninho (gerado automaticamente se vazio)', en: 'e.g.: rosemary-honey (auto-generated if empty)' },
  'dash.modal.product.slug_help': { pt: 'Deixe vazio para gerar automaticamente a partir do nome.', en: 'Leave empty to auto-generate from name.' },
  'dash.modal.product.price': { pt: 'Preço (€)', en: 'Price (€)' },
  'dash.modal.product.stock': { pt: 'Stock', en: 'Stock' },
  'dash.modal.product.category': { pt: 'Categoria', en: 'Category' },
  'dash.modal.select': { pt: 'Selecionar...', en: 'Select...' },
  'dash.modal.product.origin': { pt: 'Origem', en: 'Origin' },
  'dash.modal.product.desc': { pt: 'Descrição', en: 'Description' },
  'dash.modal.product.desc_ph': { pt: 'Descreva o seu produto...', en: 'Describe your product...' },
  'dash.modal.product.tags': { pt: 'Tags', en: 'Tags' },
  'dash.modal.product.tags_ph': { pt: 'ENTER para adicionar', en: 'ENTER to add' },
  'dash.modal.image': { pt: 'Imagem', en: 'Image' },
  'dash.modal.image_click': { pt: 'Clique para carregar', en: 'Click to upload' },
  'dash.modal.image_req': { pt: 'PNG, JPG até 5MB', en: 'PNG, JPG up to 5MB' },
  'dash.modal.image_change': { pt: 'Alterar', en: 'Change' },
  'dash.modal.product.btn_save': { pt: 'Guardar Produto', en: 'Save Product' },

  // ── Chatbot ──
  'chatbot.title':       { pt: 'Melita — Assistente Virtual', en: 'Melita — Virtual Assistant' },
  'chatbot.placeholder': { pt: 'Como posso ajudar?',          en: 'How can I help?' },
  'chatbot.tooltip':     { pt: 'Olá! Posso ajudar? 🐝',       en: 'Hi! Can I help? 🐝' },

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
  'about.badge':                  { pt: 'SOBRE NÓS', en: 'ABOUT US' },
  'about.hero.tagline':           { pt: 'Hexomel é mais do que uma loja de mel. É uma ponte entre a tradição da apicultura portuguesa e a experiência digital moderna.', en: 'Hexomel is more than a honey shop. It is a bridge between Portuguese beekeeping tradition and the modern digital experience.' },
  'about.hero.subtitle':          { pt: 'Unimos apicultores portugueses e consumidores finais numa plataforma que valoriza origem, qualidade e autenticidade.', en: 'We unite Portuguese beekeepers and end consumers in a platform that values origin, quality, and authenticity.' },
  
  'about.name.badge':             { pt: 'O NOME', en: 'THE NAME' },
  'about.name.title':             { pt: 'A Essência por Trás de Hexomel', en: 'The Essence Behind Hexomel' },
  'about.name.desc1':             { pt: 'O nome Hexomel nasce da união entre “Hexo”, inspirado no hexágono dos favos de mel, e “mel”, o coração da nossa plataforma.', en: 'The name Hexomel is born from the union of “Hexo”, inspired by the hexagon of the honeycombs, and “mel” (honey), the heart of our platform.' },
  'about.name.desc2':             { pt: 'Curto, memorável e diretamente ligado ao universo da apicultura, o nome reflete a eficiência da natureza e a essência da marca.', en: 'Short, memorable and directly connected to the universe of beekeeping, the name reflects the efficiency of nature and the essence of the brand.' },
  
  'about.history.badge':          { pt: 'A NOSSA HISTÓRIA', en: 'OUR HISTORY' },
  'about.history.title':          { pt: 'Da Tradição Familiar à Inovação Digital', en: 'From Family Tradition to Digital Innovation' },
  'about.history.text':           { pt: 'A Hexomel começou como uma aplicação simples criada para apoiar a empresa familiar do fundador, ligada à produção e venda de mel em Portugal. Com o tempo, tornou-se claro que essa primeira versão não correspondia à ambição do projeto. Foi então reconstruída de raiz, dando origem a uma plataforma completa de e-commerce que liga apicultores portugueses diretamente ao consumidor final, sem intermediários.', en: 'Hexomel began as a simple application created to support the founder\'s family business, linked to honey production and sales in Portugal. Over time, it became clear that this first version did not match the project\'s ambition. It was then rebuilt from scratch, giving rise to a complete e-commerce platform that connects Portuguese beekeepers directly to the end consumer, without intermediaries.' },
  
  'about.mission.badge':          { pt: 'A NOSSA MISSÃO', en: 'OUR MISSION' },
  'about.mission.title':          { pt: 'Valorizar a Apicultura Portuguesa', en: 'Valuing Portuguese Beekeeping' },
  'about.mission.text':           { pt: 'A nossa missão é valorizar a apicultura portuguesa e dar visibilidade aos pequenos produtores que, apesar da qualidade do seu trabalho, continuam com pouca presença digital. A Hexomel existe para aproximar produtores e consumidores, promovendo uma experiência onde o mel é tratado com o respeito que merece: como produto artesanal, com origem, identidade e história.', en: 'Our mission is to value Portuguese beekeeping and give visibility to small producers who, despite the quality of their work, still have little digital presence. Hexomel exists to bring producers and consumers closer, promoting an experience where honey is treated with the respect it deserves: as an artisanal product, with origin, identity, and history.' },
  
  'about.diff.badge':             { pt: 'O QUE NOS TORNA DIFERENTES', en: 'WHAT MAKES US DIFFERENT' },
  'about.diff.title':             { pt: 'Um Ecossistema Digital Completo', en: 'A Complete Digital Ecosystem' },
  'about.diff.intro':             { pt: 'A Hexomel combina comércio, educação e comunidade para criar um ecossistema digital completo dedicado ao mel português artesanal.', en: 'Hexomel combines commerce, education, and community to create a complete digital ecosystem dedicated to artisanal Portuguese honey.' },
  'about.diff.pillar1.title':     { pt: 'Comercial', en: 'Commercial' },
  'about.diff.pillar1.desc':      { pt: 'Loja online com pagamentos seguros e experiência simples de compra.', en: 'Online store with secure payments and a simple buying experience.' },
  'about.diff.pillar2.title':     { pt: 'Educativa', en: 'Educational' },
  'about.diff.pillar2.desc':      { pt: 'Curiosidades, conteúdos sobre apicultura e visualização 3D dos tipos de mel.', en: 'Curiosities, beekeeping content, and 3D visualization of honey types.' },
  'about.diff.pillar3.title':     { pt: 'Comunitária', en: 'Community' },
  'about.diff.pillar3.desc':      { pt: 'Fórum de perguntas entre clientes e apicultores verificados.', en: 'Q&A forum between customers and verified beekeepers.' },
  
  'about.values.badge':           { pt: 'VALORES', en: 'VALUES' },
  'about.values.title':           { pt: 'Aquilo em que Acreditamos', en: 'What We Believe In' },
  'about.values.intro':           { pt: 'Na Hexomel, acreditamos em autenticidade, qualidade e proximidade. Valorizamos o trabalho dos produtores locais, promovemos práticas responsáveis e usamos a tecnologia para aproximar pessoas do verdadeiro sabor do mel português.', en: 'At Hexomel, we believe in authenticity, quality, and proximity. We value the work of local producers, promote responsible practices, and use technology to bring people closer to the true taste of Portuguese honey.' },
  'about.values.val1.title':      { pt: 'Autenticidade', en: 'Authenticity' },
  'about.values.val1.desc':       { pt: 'Mel puro e cru, sem misturas, que reflete fielmente o terroir e a flor de cada região.', en: 'Pure and raw honey, unblended, faithfully reflecting the terroir and flower of each region.' },
  'about.values.val2.title':      { pt: 'Qualidade', en: 'Quality' },
  'about.values.val2.desc':       { pt: 'Padrões de controlo rigorosos para assegurar que cada frasco mantém o sabor e as propriedades medicinais originais.', en: 'Rigorous control standards to ensure that each jar maintains its original taste and medicinal properties.' },
  'about.values.val3.title':      { pt: 'Proximidade', en: 'Proximity' },
  'about.values.val3.desc':       { pt: 'Ligamos quem produz a quem consome, eliminando barreiras e fomentando relações humanas de confiança.', en: 'We connect those who produce with those who consume, removing barriers and fostering human relationships of trust.' },
  'about.values.val4.title':      { pt: 'Inovação', en: 'Innovation' },
  'about.values.val4.desc':       { pt: 'Tecnologia ao serviço da tradição: da visualização 3D do mel aos pagamentos digitais seguros.', en: 'Technology at the service of tradition: from 3D honey visualization to secure digital payments.' },
  'about.values.val5.title':      { pt: 'Sustentabilidade', en: 'Sustainability' },
  'about.values.val5.desc':       { pt: 'Apoio a práticas apícolas éticas que protegem as abelhas e promovem a conservação da biodiversidade.', en: 'Support for ethical beekeeping practices that protect bees and promote biodiversity conservation.' },
  'about.values.val6.title':      { pt: 'Valorização do Produtor', en: 'Producer Appreciation' },
  'about.values.val6.desc':       { pt: 'Garantimos uma remuneração justa para os apicultores locais, dignificando e preservando a sua atividade.', en: 'We guarantee fair remuneration for local beekeepers, dignifying and preserving their activity.' },
  
  'about.impact.badge':           { pt: 'IMPACTO E PROPÓSITO', en: 'IMPACT AND PURPOSE' },
  'about.impact.title':           { pt: 'Contribuir para Algo Maior', en: 'Contributing to Something Greater' },
  'about.impact.text':            { pt: 'Ao aproximar apicultores e consumidores, ajudamos a fortalecer pequenos produtores, promovemos o consumo informado e contribuímos para a valorização de uma atividade fundamental para o equilíbrio ambiental e cultural em Portugal.', en: 'By bringing beekeepers and consumers closer, we help strengthen small producers, promote informed consumption, and contribute to valuing an activity fundamental to environmental and cultural balance in Portugal.' },
  
  'about.project.badge':          { pt: 'PROVA DE APTIDÃO PROFISSIONAL (PAP)', en: 'PROFESSIONAL CAPABILITY TEST (PAP)' },
  'about.project.title':          { pt: 'O Projeto Técnico Hexomel', en: 'The Hexomel Technical Project' },
  'about.project.subtitle':       { pt: 'Desenvolvido no âmbito do curso Técnico de Gestão e Programação de Sistemas Informáticos (TGPSI).', en: 'Developed for the Computer Systems Management and Programming Technician course (TGPSI).' },
  'about.project.motivation.title': { pt: 'Motivação & Objetivo', en: 'Motivation & Goal' },
  'about.project.motivation.desc': { pt: 'O Hexomel nasceu para criar uma ponte digital entre pequenos apicultores portugueses e os consumidores. Aliando métodos tradicionais a tecnologias de ponta, permitimos que os produtores vendam diretamente e promovam a biodiversidade de forma sustentável.', en: 'Hexomel was born to build a digital bridge between small Portuguese beekeepers and consumers. Combining traditional methods with cutting-edge technologies, we allow producers to sell directly and promote biodiversity sustainably.' },
  'about.project.architecture.title': { pt: 'Arquitetura e Construção', en: 'Architecture & Construction' },
  'about.project.architecture.desc': { pt: 'Construído sobre uma arquitetura de três camadas (Three-Tier), o sistema implementa uma SPA híbrida nativa no frontend (com View Transitions API e pre-load.js) conectada a uma API REST robusta em Express e a uma base de dados relacional segura.', en: 'Built on a three-tier architecture, the system implements a native hybrid SPA on the frontend (using View Transitions API and pre-load.js) connected to a robust Express REST API and a secure relational database.' },
  'about.project.db.title':       { pt: 'Base de Dados Relacional', en: 'Relational Database' },
  'about.project.db.desc':        { pt: 'Utilizamos o SGBD MySQL 8.0 gerido pelo MySQL Workbench. A estrutura com motor InnoDB garante a integridade referencial com Transações ACID, chaves estrangeiras complexas, histórico de faturação e um log de analytics comportamental em JSON nativo.', en: 'We use MySQL 8.0 SGBD managed by MySQL Workbench. The InnoDB engine structure guarantees referential integrity with ACID Transactions, complex foreign keys, billing history, and a behavioral analytics log in native JSON.' },
  'about.project.tech.title':     { pt: 'Tecnologias Avançadas', en: 'Advanced Technologies' },
  'about.project.tech.desc':      { pt: 'Para elevar a experiência, o site integra um motor 3D em Three.js para simulação física de tipos de mel, pagamentos online seguros integrados com a API Stripe, e envio de emails transacionais SMTP com verificação 2FA no Checkout.', en: 'To elevate the experience, the site integrates a Three.js 3D engine for physical simulation of honey types, secure online payments integrated with the Stripe API, and transactional SMTP emails with 2FA verification at Checkout.' },

  'about.cta.text':               { pt: 'Descobre a Hexomel, explora os nossos méis e conhece as histórias por trás de cada produtor.', en: 'Discover Hexomel, explore our honeys and learn the stories behind each producer.' },
  'about.cta.shop':               { pt: 'Explorar Loja', en: 'Explore Shop' },
  'about.cta.producers':          { pt: 'Conhecer Produtores', en: 'Meet Producers' },
  'about.cta.community':          { pt: 'Ver Comunidade', en: 'View Community' },

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
  'learn.subtitle':    { pt: 'Testa os teus conhecimentos com o nosso quiz e explora o glossário do mel.', en: 'Test your knowledge with our quiz and explore the honey glossary.' },
  'learn.cta.quiz':    { pt: 'Começar o Quiz', en: 'Start the Quiz' },
  'learn.quiz.badge':  { pt: 'QUIZ', en: 'QUIZ' },
  'learn.quiz.title':  { pt: 'Quiz: Quanto Sabes Sobre Abelhas?', en: 'Quiz: How Much Do You Know About Bees?' },
  'learn.quiz.desc':   { pt: 'Responde às perguntas e descobre a tua pontuação!', en: 'Answer the questions and discover your score!' },
  'learn.quiz.next':   { pt: 'Próxima', en: 'Next' },
  'learn.quiz.done':   { pt: 'Quiz Concluído!', en: 'Quiz Complete!' },
  'learn.quiz.retry':  { pt: 'Tentar Novamente', en: 'Try Again' },
  'learn.glossary.badge': { pt: 'GLOSSÁRIO', en: 'GLOSSARY' },
  'learn.glossary.title': { pt: 'Glossário do Mel', en: 'Honey Glossary' },
  'learn.glossary.desc':  { pt: 'Termos essenciais do mundo apícola', en: 'Essential terms from the beekeeping world' },
  'learn.explore':     { pt: 'Explora Mais', en: 'Explore More' },
  'learn.explore.desc': { pt: 'Visita a página de curiosidades ou junta-te à comunidade Hexomel.', en: 'Visit the curiosities page or join the Hexomel community.' },

  // ── Apicultores & Apicultor ──
  'apicultores.badge':            { pt: 'NOSSOS PRODUTORES', en: 'OUR PRODUCERS' },
  'apicultores.title':            { pt: 'Nossos Apicultores', en: 'Our Beekeepers' },
  'apicultores.subtitle':         { pt: 'Conheça os apicultores que dedicam a sua vida à produção do melhor mel artesanal.', en: 'Meet the beekeepers who dedicate their lives to producing the best artisanal honey.' },
  'apicultores.empty':            { pt: 'Nenhum apicultor encontrado.', en: 'No beekeepers found.' },
  'apicultores.default_bio':      { pt: 'Dedicado à apicultura tradicional.', en: 'Dedicated to traditional beekeeping.' },
  'apicultores.view_profile':     { pt: 'Ver Perfil', en: 'View Profile' },
  'apicultor.verified':           { pt: 'Apicultor Verificado', en: 'Verified Beekeeper' },
  'apicultor.default_bio':        { pt: 'Este apicultor ainda não definiu a sua biografia, mas garante o melhor mel da região!', en: 'This beekeeper has not set a biography yet, but guarantees the best honey in the region!' },
  'apicultor.send_msg':           { pt: 'Enviar Mensagem', en: 'Send Message' },
  'apicultor.report':             { pt: 'Denunciar', en: 'Report' },
  'apicultor.block':              { pt: 'Bloquear', en: 'Block' },
  'apicultor.unblock':            { pt: 'Desbloquear', en: 'Unblock' },
  'apicultor.no_products':        { pt: 'Ainda não há produtos listados por este apicultor.', en: 'No products listed by this beekeeper yet.' },

  // ── Auth (injected by main.js) ──
  'auth.login':        { pt: 'Iniciar Sessão', en: 'Sign In' },
  'auth.register':     { pt: 'Criar Conta', en: 'Create Account' },
  'auth.enter':        { pt: 'Entrar', en: 'Sign In' },
  'auth.create':       { pt: 'Criar conta', en: 'Create Account' },

  // ── Newsletter placeholder ──
  'home.email.ph':     { pt: 'O seu melhor email...', en: 'Your best email...' },

  // ── Loading / Placeholder ──
  'loading.text':      { pt: 'Carregando', en: 'Loading' },

  // ── Other Pages (Apicultor, Success, Cancel) ──
  "apic.title": { pt: "Perfil do Apicultor - Hexomel", en: "Beekeeper Profile - Hexomel" },
  "apic.loading": { pt: "Carregando...", en: "Loading..." },
  "apic.bio": { pt: '"A nossa paixão é cuidar das abelhas e trazer até si o melhor da natureza."', en: '"Our passion is caring for bees and bringing you the best of nature."' },
  "apic.productsTitle": { pt: "Produtos do Apicultor", en: "Beekeeper's Products" },
  "apic.workshopsTitle": { pt: "Experiências e Workshops", en: "Experiences and Workshops" },

  "apis.title": { pt: "Apicultores - Hexomel", en: "Beekeepers - Hexomel" },
  "apis.badge": { pt: "NOSSOS PRODUTORES", en: "OUR PRODUCERS" },
  "apis.heading": { pt: "Nossos Apicultores", en: "Our Beekeepers" },
  "apis.subtitle": { pt: "Conheça os apicultores que dedicam a sua vida à produção do melhor mel artesanal.", en: "Meet the beekeepers who dedicate their lives to producing the best artisanal honey." },

  "succ.title": { pt: "Sucesso | Hexomel 🐝", en: "Success | Hexomel 🐝" },
  "succ.heading": { pt: "Encomenda Recebida!", en: "Order Received!" },
  "succ.message": { pt: "A tua encomenda foi processada com sucesso pela nossa colmeia.", en: "Your order was successfully processed by our hive." },
  "succ.loadingOrder": { pt: "A carregar pedido...", en: "Loading order..." },
  "succ.emailInfo": { pt: "Enviámos um email de confirmação com todos os detalhes. Podes acompanhar o estado no teu perfil.", en: "We've sent a confirmation email with all the details. You can track the status in your profile." },
  "succ.goHome": { pt: "Voltar ao Início", en: "Back to Home" },

  "canc.title": { pt: "Pagamento Cancelado | Hexomel 🐝", en: "Payment Canceled | Hexomel 🐝" },
  "canc.heading": { pt: "Pagamento Cancelado", en: "Payment Canceled" },
  "canc.message": { pt: "Parece que o pagamento não foi concluído. Não te preocupes, os teus itens ainda estão no carrinho.", en: "It looks like the payment was not completed. Don't worry, your items are still in the cart." },
  "canc.retry": { pt: "Tentar Novamente", en: "Try Again" },
  "canc.backToShop": { pt: "Voltar à Loja", en: "Back to Shop" },

  // ── Check/Dash Missing ──
  "check.title": { pt: "Checkout | Hexomel", en: "Checkout | Hexomel" },
  "check.secure_checkout": { pt: "Checkout 100% Seguro", en: "100% Secure Checkout" },
  "check.step_shipping": { pt: "Dados de Envio", en: "Shipping Data" },
  "check.step_payment": { pt: "Confirmacao e Pagamento", en: "Confirmation & Payment" },
  "check.order_summary": { pt: "Resumo do Pedido", en: "Order Summary" },
  "check.subtotal": { pt: "Subtotal", en: "Subtotal" },
  "check.shipping": { pt: "Envio", en: "Shipping" },
  "check.total_tax_incl": { pt: "Total (IVA incl.)", en: "Total (VAT incl.)" },
  "check.finish_pay": { pt: "Finalizar e Pagar", en: "Finish & Pay" },
  "dash.sidebar.title": { pt: "Painel Apicultor", en: "Beekeeper Dashboard" },
  "dash.sidebar.main": { pt: "Principal", en: "Main" },
  "dash.welcome.badge": { pt: "Painel Apicultor", en: "Beekeeper Panel" },
  "dash.stat.total_earned": { pt: "Total Ganho", en: "Total Earned" },
  "dash.sales.title": { pt: "Minhas Vendas", en: "My Sales" },
  "dash.products.title": { pt: "Meus Produtos", en: "My Products" },
  "dash.workshops.title": { pt: "Meus Workshops", en: "My Workshops" },

  // ── Tags ──
  "tag.HEALTH": { pt: "SAÚDE", en: "HEALTH" },
  "tag.PROPOLIS": { pt: "PRÓPOLIS", en: "PROPOLIS" },
  "tag.BIO": { pt: "BIO", en: "BIO" },
  "tag.MOUNTAIN": { pt: "MONTANHA", en: "MOUNTAIN" },
  "tag.RAW": { pt: "BRUTO", en: "RAW" },
  "tag.WILD": { pt: "SELVAGEM", en: "WILD" },
  "tag.ORGANIC": { pt: "ORGÂNICO", en: "ORGANIC" },
  "tag.PREMIUM": { pt: "PREMIUM", en: "PREMIUM" },
  "tag.FLOWER": { pt: "FLORAL", en: "FLOWER" },
  "tag.VINTAGE": { pt: "VINTAGE", en: "VINTAGE" },
  "tag.GOLD": { pt: "OURO", en: "GOLD" },
  "tag.SUPERFOOD": { pt: "SUPER-ALIMENTO", en: "SUPERFOOD" },
  "tag.PROTEIN": { pt: "PROTEÍNA", en: "PROTEIN" },
  "tag.NATURAL": { pt: "NATURAL", en: "NATURAL" }
};

/** Get current language */
export function getLang() {
  return localStorage.getItem(STORAGE_KEY) || 'pt';
}

// ── SVG Flag Icons (inline base64 for cross-platform consistency) ──
const FLAG_SVG = {
  pt: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" preserveAspectRatio="xMidYMid slice"><path fill="#006600" d="M0 0h256v480H0z"/><path fill="#ff0000" d="M256 0h384v480H256z"/><circle cx="256" cy="240" r="80" fill="#ff0" stroke="#006600" stroke-width="4"/><path fill="#006600" d="M256 176c-14 0-26 4-36 12l36 52 36-52c-10-8-22-12-36-12z"/><path fill="#ff0000" d="M220 240c0-20 16-36 36-36s36 16 36 36-16 36-36 36-36-16-36-36z"/><path fill="#fff" d="M240 220h32v40h-32z"/></svg>`,
  en: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" preserveAspectRatio="xMidYMid slice"><path fill="#012169" d="M0 0h640v480H0z"/><path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"/><path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z"/><path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/><path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z"/></svg>`
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

/** Translate a specific key manually */
export function t(key) {
  const lang = getLang();
  const entry = translations[key];
  if (entry && entry[lang]) {
    return entry[lang];
  }
  // Fallback
  if (key.startsWith("tag.")) {
    return key.replace("tag.", "");
  }
  return key;
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
window.__t = t;
