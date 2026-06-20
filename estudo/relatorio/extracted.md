__3\.1 Título do Projeto__

O projeto desenvolvido no âmbito da Prova de Aptidão Profissional tem como título Hexomel\.

A designação Hexomel foi escolhida para associar imediatamente a plataforma ao universo do mel, da apicultura e da organização natural das colmeias\. O prefixo "Hexo" faz referência à estrutura hexagonal dos favos de mel, símbolo universal da eficiência natural das abelhas, enquanto "mel" identifica de forma direta o produto central da plataforma\. O nome transmite uma identidade curta, memorável e adequada a uma marca digital, mantendo ligação ao produto principal e ao posicionamento premium pretendido\.

__3\.2 Tema do Projeto__

O tema do projeto centra\-se na criação de uma plataforma web completa para comércio eletrónico, divulgação e valorização do mel português artesanal\. A solução não se limita a apresentar e vender produtos: integra perfis de utilizador diferenciados, catálogo filtrável com paginação dinâmica, carrinho de compras persistente, checkout com verificação 2FA, pagamentos reais via Stripe, sistema de comunidade Q&A, área dedicada ao apicultor, painel administrativo com dashboard analítico, workshops presenciais e conteúdos educativos sobre apicultura\.

A Hexomel combina três dimensões complementares que, em conjunto, formam um ecossistema digital coerente:

__Dimensão__

__Aplicação no Projeto__

__Exemplos Concretos__

__Comercial__

Venda online, gestão de compras e fluxo completo de encomendas\.

Loja com filtros cruzados, carrinho dual \(localStorage \+ BD\), checkout em 2 passos, Stripe Checkout, histórico de encomendas, recibos por email\.

__Educativa__

Explicação do produto, da apicultura e da origem botânica do mel\.

Página de curiosidades com visualizador 3D \(Three\.js\), secção de aprendizagem, referências sobre tipos de mel e boas práticas apícolas\.

__Comunitária__

Interação entre utilizadores, clientes e apicultores verificados\.

Sistema Q&A com perguntas, respostas, votos, melhor resposta, moderação administrativa e perfis de apicultor certificado\.

__Administrativa__

Gestão interna, monitorização e análise de dados da plataforma\.

Dashboard com KPIs, gráficos Chart\.js \(vendas, categorias, crescimento\), gestão de produtos, utilizadores, workshops e aprovação de upgrades\.

Tabela 1\. As quatro dimensões complementares da plataforma Hexomel\.

__3\.3 Motivação para o Projeto__

A motivação principal para o desenvolvimento da Hexomel foi criar um projeto completo, com utilidade prática e capaz de demonstrar competências técnicas adquiridas ao longo do curso de Informática e Tecnologias de Multimédia\.

A apicultura é uma atividade tradicional com importância económica, ambiental e cultural em Portugal, mas muitos pequenos produtores continuam com pouca presença digital, o que limita a divulgação dos seus produtos e reduz o contacto direto com o consumidor final\. A Hexomel surge como resposta a essa realidade, propondo uma plataforma onde o mel não é tratado como um produto genérico, mas como o centro de uma experiência digital cuidada e profissional\.

__Origem e Evolução do Projeto__

Importa referir que a Hexomel não nasceu do zero como um conceito totalmente novo\. Numa fase inicial, o projeto começou como uma aplicação simples destinada à empresa do meu pai, ligada à produção e venda de mel\. Contudo, rapidamente se tornou evidente que essa versão inicial era demasiado básica e limitada para servir como Prova de Aptidão Profissional — tanto em termos de funcionalidades como de complexidade técnica e ambição de design\.

Face a essas limitações, tomei a decisão de reconstruir o projeto de raiz, transformando\-o numa plataforma completa de e\-commerce com múltiplos perfis de utilizador, segurança avançada, pagamentos reais, comunidade interativa, visualização 3D e painel administrativo com analytics\. O resultado final é uma aplicação que, embora mantenha a ligação ao mel e à apicultura como tema central, representa uma evolução substancial em relação ao ponto de partida — passando de uma página informativa simples para uma plataforma full\-stack funcional e profissional\.

__Objetivos Técnicos e Pessoais__

Do ponto de vista técnico, o projeto permitiu trabalhar várias áreas fundamentais do desenvolvimento web moderno:

__• Valorizar o mel português __e a produção artesanal através de uma presença digital cuidada e com design premium\.

__• Criar uma ponte direta __entre apicultores e consumidores, reduzindo a dependência de intermediários comerciais\.

__• Construir uma aplicação full\-stack funcional, __com frontend, backend e base de dados próprios, sem recurso a plataformas pré\-fabricadas como Shopify ou WordPress\.

__• Explorar segurança real __com bcrypt, JWT, Google OAuth e verificação 2FA por email antes do pagamento\.

__• Integrar pagamentos reais __e fluxos comerciais próximos de uma loja online profissional, utilizando a API Stripe Checkout\.

__• Aplicar princípios de UX premium, __como skeleton loaders, View Transitions API, toasts não\-intrusivos, micro\-interações e animações procedurais\.

__• Produzir documentação técnica completa __que explique decisões, ferramentas, arquitetura e a evolução do sistema ao longo do desenvolvimento\.

Esta diversidade técnica tornou a PAP mais completa e aproximou o trabalho de um cenário real de desenvolvimento de software profissional\.

__3\.4 Evolução do Projeto: Da Versão Inicial à Plataforma Final__

Como referido anteriormente, o projeto Hexomel teve uma evolução significativa desde a sua conceção inicial\. Esta secção documenta essa transformação, comparando o ponto de partida com o resultado final em termos de funcionalidades, complexidade técnica e ambição\.

__3\.4\.1 Versão Inicial — Aplicação Simples para a Empresa__

A primeira versão do projeto foi concebida como uma aplicação web simples destinada à empresa familiar do meu pai, dedicada à produção e comercialização de mel\. Esta versão inicial tinha um âmbito limitado:

__• __Apresentação básica dos produtos com imagens e preços estáticos\.

__• __Página informativa sobre a empresa e a atividade apícola\.

__• __Formulário de contacto simples, sem backend funcional\.

__• __Sem sistema de autenticação, carrinho de compras ou pagamentos\.

__• __Base de dados rudimentar com apenas 5 tabelas \(cliente, produto, encomenda, categoria, workshop\), sem relações complexas nem integridade referencial completa\.

__• __Design funcional mas básico, sem componentes premium ou micro\-interações\.

Embora esta versão cumprisse o propósito de apresentar os produtos da empresa, estava longe de demonstrar a profundidade técnica e a ambição necessárias para uma Prova de Aptidão Profissional do curso de Informática e Tecnologias de Multimédia\.

__3\.4\.2 Decisão de Reconstrução__

A decisão de reconstruir o projeto de raiz foi motivada por vários fatores:

__• Complexidade técnica insuficiente: __a versão original não permitia demonstrar competências em áreas como autenticação avançada, integração de APIs externas, segurança, analytics ou visualização 3D\.

__• Limitações funcionais: __a ausência de carrinho persistente, checkout real, sistema de roles, comunidade e painel administrativo tornava a aplicação demasiado simples para um projeto final\.

__• Design pouco ambicioso: __o aspeto visual da versão inicial não refletia as competências de design multimédia adquiridas ao longo do curso\.

__• Oportunidade de aprendizagem: __a reconstrução permitiu explorar tecnologias e padrões arquiteturais mais avançados, aproximando o projeto de um cenário real de desenvolvimento profissional\.

__3\.4\.3 Versão Final — Plataforma Completa__

A versão final da Hexomel representa uma transformação completa em relação ao ponto de partida\. A tabela seguinte sintetiza as principais diferenças:

__Aspeto__

__Versão Inicial__

__Versão Final__

__Autenticação__

Sem login

JWT \+ Google OAuth \+ 2FA por email

__Perfis de utilizador__

Sem diferenciação

3 perfis: cliente, apicultor e administrador

__Catálogo__

Produtos estáticos

Catálogo dinâmico com filtros cruzados, pesquisa, paginação e ordenação

__Carrinho__

Inexistente

Carrinho dual: localStorage \(offline\) \+ BD MySQL \(persistente\)

__Pagamentos__

Sem pagamentos

Stripe Checkout com recibos automáticos por email

__Base de dados__

5 tabelas simples

15\+ tabelas com integridade referencial, migrações e JSON nativo

__Segurança__

Mínima

bcrypt, JWT, roles, middleware de autorização, OTP 2FA, rate\-limiting

__Comunidade__

Inexistente

Fórum Q&A com votos, melhor resposta e moderação

__Workshops__

Listagem estática

CRUD completo com reservas, gestão de vagas e aprovação por admin

__Visualização 3D__

Inexistente

Visualizador Three\.js com materiais PBR por tipo de mel

__Analytics__

Inexistente

Sistema comportamental com funnel, page views e dados JSON

__Dashboard admin__

Inexistente

KPIs, gráficos Chart\.js, gestão de utilizadores, produtos e upgrades

__Internacionalização__

Apenas português

Sistema i18n completo com PT/EN e persistência no localStorage

__Design/UX__

Funcional mas básico

Design premium com glassmorphism, skeleton loaders, View Transitions API, toasts e animações

Tabela 2\. Comparação funcional entre a versão inicial e a versão final da Hexomel\.

Esta evolução demonstra não apenas o crescimento técnico do projeto, mas também a capacidade de análise crítica, adaptação e tomada de decisão durante o processo de desenvolvimento — competências essenciais num profissional de informática e multimédia\.

__3\.5 Melhorias Técnicas Específicas__

Para além da visão geral apresentada na secção anterior, importa detalhar as melhorias técnicas mais significativas que distinguem a versão final da Hexomel\.

__3\.5\.1 Base de Dados — De 5 para 15\+ Tabelas__

A maior melhoria estrutural foi a passagem de um modelo pensado apenas para uma loja online simples para um modelo relacional capaz de sustentar uma plataforma completa\. A versão antiga tinha uma função principalmente conceptual; a versão nova foi construída de acordo com problemas reais encontrados durante o desenvolvimento\.

__• __A base de dados deixou de guardar apenas entidades principais e passou a representar fluxos reais de compra, com tabelas específicas para cada fase do processo\.

__• __A relação muitos\-para\-muitos entre encomendas e produtos foi resolvida com a tabela item\_encomenda, que guarda o preço unitário no momento da compra para garantir imutabilidade histórica\.

__• __Foram adicionados papéis de utilizador \(client, beekeeper, admin\) para suportar três perfis com permissões diferenciadas\.

__• __O catálogo ficou mais rico com campos de categoria, origem botânica, tags, estado de aprovação e associação ao apicultor produtor\.

__• __Foram adicionadas tabelas para comunidade Q&A \(pergunta\_comunidade, resposta\_comunidade, voto\_pergunta, voto\_resposta\), favoritos, avaliações, analytics \(interacao com JSON nativo\) e upgrade\_requests\.

__• __O sistema de migrações programáticas no server\.js garante que novas colunas e tabelas são adicionadas automaticamente ao arrancar, sem necessidade de scripts manuais\.

__3\.5\.2 Segurança — De Zero a Multi\-Camada__

A versão inicial não possuía qualquer mecanismo de segurança\. A versão final implementa múltiplas camadas de proteção:

__• Hashing de passwords com bcryptjs __\(10 salt rounds\), tornando impossível a leitura direta de passwords mesmo em caso de acesso à base de dados\.

__• Sessões com JSON Web Tokens \(JWT\) __com expiração temporizada de 7 dias, eliminando a necessidade de sessões no servidor\.

__• Login social com Google OAuth 2\.0, __permitindo autenticação segura sem criação manual de password\.

__• Verificação 2FA por email __antes do checkout, com código OTP de uso único e expiração temporal, usando Nodemailer via SMTP\.

__• Middleware de autorização por roles, __que protege rotas administrativas e de apicultor contra acessos não autorizados\.

__• Verificação de email no registo, __com token único enviado por Nodemailer para confirmar a titularidade do endereço\.

__3\.5\.3 Experiência do Utilizador — De Básico a Premium__

O design e a experiência do utilizador sofreram uma transformação completa:

__• Skeleton loaders: __placeholders visuais com efeito shimmer durante o carregamento de dados, substituindo o ecrã em branco\.

__• View Transitions API: __transições suaves entre páginas usando a API nativa do browser, criando uma experiência de SPA híbrida sem framework\.

__• Sistema de toasts: __notificações discretas e não\-intrusivas para feedback de ações do utilizador \(adicionar ao carrinho, erros, sucesso\)\.

__• Animações procedurais: __abelhas 2D flutuantes com física LERP e trigonometria, reagindo ao movimento do rato em tempo real\.

__• Visualização 3D com Three\.js: __frasco de mel interativo com materiais PBR que mudam conforme a origem botânica selecionada\.

__• Glassmorphism e design system: __variáveis CSS centralizadas, efeitos de vidro fosco, gradientes suaves e tipografia premium com Google Fonts \(Outfit\)\.

__• Internacionalização \(i18n\): __sistema completo de tradução PT/EN com atributos data\-i18n, persistência da língua e troca dinâmica sem recarregar a página\.

__• Responsividade total: __layout adaptativo para desktop, tablet e mobile, com navbar colapsável e grid responsivo\.

__3\.5\.4 Funcionalidades Novas__

A versão final introduziu funcionalidades que não existiam de todo na versão inicial:

__• Sistema de comunidade Q&A: __fórum interativo onde clientes fazem perguntas e apicultores verificados respondem, com sistema de votos e seleção de melhor resposta\.

__• Dashboard administrativo: __painel centralizado com KPIs em tempo real, gráficos de vendas, categorias, estados de encomendas, crescimento de utilizadores e analytics comportamental\.

__• Dashboard do apicultor: __área dedicada onde apicultores gerem os seus produtos, acompanham vendas e criam/gerem workshops presenciais\.

__• Sistema de upgrades: __processo formal para clientes solicitarem promoção a apicultor, com upload de documentação e aprovação por administrador\.

__• Analytics comportamental: __registo silencioso de interações \(page views, product views, add\-to\-cart, search, checkout funnel\) em formato JSON, permitindo análise detalhada do comportamento do utilizador\.

__• Recibos automáticos por email: __após pagamento via Stripe, o sistema gera e envia automaticamente um recibo HTML formatado com detalhes da encomenda, usando templates com o logótipo da marca\.

__• SEO e slugs dinâmicos: __URLs amigáveis para produtos com geração automática de slugs únicos, contribuindo para melhor indexação nos motores de busca\.

__3\.6 Síntese da Evolução__

A transformação da Hexomel — de uma aplicação simples para uma empresa familiar para uma plataforma de e\-commerce completa — reflete o percurso de aprendizagem e amadurecimento técnico ao longo do desenvolvimento deste projeto\.

A versão inicial demonstrou a intenção e o tema; a versão final demonstra a capacidade de execução técnica, a adaptação contínua a novos requisitos e a ambição de criar um produto que se aproxima de um cenário real de desenvolvimento profissional\. Cada melhoria foi motivada por problemas concretos encontrados durante o desenvolvimento e não por decisões arbitrárias, o que confere autenticidade e coerência ao projeto\.

Esta evolução evidencia competências transversais de programação, design, base de dados, segurança, integração de serviços externos e documentação técnica — áreas centrais do curso de Informática e Tecnologias de Multimédia\.

