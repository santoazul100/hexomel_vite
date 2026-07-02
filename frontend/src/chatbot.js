import { getLang } from "./i18n.js";

// Knowledge Base for Melita Chatbot
const KNOWLEDGE_BASE = {
  pt: {
    greetings: {
      patterns: /\b(ol[aá]|oi|bom\s+dia|boa\s+tarde|boa\s+noite|ol[aá]s|hey|boas|salve|al[oô]|como\s+estas|como\s+vai|tudo\s+bem)\b/i,
      response: "Olá! Sou a **Melita**, a assistente virtual do Hexomel. Como posso ajudar-te hoje? Podes perguntar-me sobre os nossos produtos, workshops, como comprar, a rede social ou contactos! 🐝"
    },
    whois: {
      patterns: /(quem\s+(e|é|es|és)\s+(a\s+)?melita|quem\s+(es|foste|tu|voce)|sobre\s+ti|apresenta-te|apresentacao|o\s+que\s+(es|fazes|farias)|como\s+te\s+chamas|teu\s+nome|assistente\s+virtual|melita)/i,
      response: "Eu sou a **Melita**, a assistente virtual do Hexomel. Fui programada para ajudar os utilizadores a obter informações sobre o site, os nossos produtos e workshops. 😊"
    },
    products: {
      patterns: /\b(mel|m[eé]is|produto|produtos|loja|shop|comprar|pre[cç]o|pre[cç]os|venda|vendas|rosmaninho|urze|castanheiro|encomendar|encomenda|encomendas|compras|pagar|pagamento|pagamentos|carrinho|adicionar|valor|custo|custos|portes|envio|entregar|entrega|entregas|frasco|frascos|biologico|artesanal|melzinho|qualidade|compre)\b/i,
      response: "No Hexomel oferecemos méis artesanais e biológicos de qualidade premium, colhidos na Serra da Estrela! 🍯 Temos **Mel de Rosmaninho** (suave e aromático), **Mel de Urze** (intenso e antioxidante) e **Mel de Castanheiro** (robusto e amadeirado). Podes explorar todos eles e comprá-los de forma segura na nossa [Loja Online](/loja). Basta adicionares ao carrinho!"
    },
    workshops: {
      patterns: /\b(workshop|workshops|curso|cursos|aprender\s+apicultura|aula|aulas|agenda|datas|inscri[cç][aã]o|inscri[cç][oõ]es|participar|inscrever|aprender|formacao|formacoes|apicultura|evento|eventos|experiencia|experiencias)\b/i,
      response: "Gostarias de ser apicultor por um dia? 🐝 Nós organizamos **Workshops de Apicultura**! Neles podes aprender sobre a vida das abelhas, a colheita de mel e visitar as colmeias em segurança com equipamento adequado. Vê as próximas datas e faz a tua inscrição na nossa página de [Workshops](/workshops)!"
    },
    auth: {
      patterns: /\b(login|entrar|iniciar\s+sess[aã]o|registar|registo|criar\s+conta|conta|perfil|logout|entrar\s+na\s+conta|password|palavra-passe|passe|esqueci|recuperar|minha\s+conta|painel|dashboard|dados|alterar|mudar|sair)\b/i,
      response: "Podes criar uma conta no Hexomel para comprar mel, inscrever-te em workshops e aceder à nossa rede social! 🐝 Se já tens conta, faz Iniciar Sessão. Se és novo, podes Registar-te. \n\nQueres que eu abra a janela para entrares ou te registares?",
      showAuthActions: true
    },
    beekeepers: {
      patterns: /\b(apicultor|apicultores|vender|parceiro|parceria|colmeia|colmeias|produzir|produtor|produtores|produzir\s+mel|vender\s+mel|ser\s+parceiro|registar\s+como\s+apicultor|painel\s+apicultor)\b/i,
      response: "A nossa missão é apoiar a apicultura local! 🍯 Se és um apicultor e queres vender o teu mel no Hexomel, podes registar-te como Apicultor. Terás acesso a um painel exclusivo para gerir o teu mel, vendas e colmeias. Sabe mais na nossa página de [Apicultores](/apicultores)!"
    },
    contacts: {
      patterns: /\b(contacto|contactos|telefone|email|suporte|ajuda|morada|localiza[cç][aã]o|onde\s+fica|onde\s+ficam|sede|whatsapp|falar|escrever|ligar|telefonar|mensagem|rua|local|mapa|apoio|reclamar|reclamacao)\b/i,
      response: "Estamos sempre aqui para ajudar! 📞 Podes contactar-nos na página de [Contactos](/contactos), por email em **hexomelpap@gmail.com** ou por telefone: **+351 912 345 678**. A nossa sede fica na bela região da **Serra da Estrela, Portugal**."
    },
    social: {
      patterns: /\b(social|rede\s+social|hexohive|comunidade|membros|posts|mensagens|f[oó]rum|forum|hive|partilhar|publicar|publicacao|publicacoes|postar|amigos|chat|conversar|mensagens\s+privadas)\b/i,
      response: "O **HexoHive** é a nossa rede social exclusiva! 🐝 Lá podes partilhar publicações, fotos das tuas colmeias, dicas de apicultura e interagir com outros membros da comunidade. Acede à [Rede Social](/rede-social) ou junta-te às discussões no [Fórum Comunitário](/comunidade)!"
    },
    curiosities: {
      patterns: /\b(curiosity|curiosidades|abelhas|poliniza[cç][aã]o|rainha|obreira|zang[aã]o|fatos|fatos\s+curiosos|importancia|ciencia|cientifico|estranho|interessante|beneficios|saude|propriedades|expirar|valer|estragar)\b/i,
      response: "Sabias que as abelhas são cruciais para a polinização de um terço dos alimentos que consumimos? 🐝 E o mel puro é o único alimento que nunca se estraga! Podes aprender mais factos científicos incríveis na nossa página de [Curiosidades](/curiosidades) ou consultar materiais de estudo em [Aprender](/aprender)!"
    },
    about: {
      patterns: /\b(sobre|historia|missao|quem\s+somos|equipa|fundador|origem|empresa|valores|autenticidade|qualidade|sustentabilidade|criador|hexomel|nome)\b/i,
      response: "O **Hexomel** nasceu do desejo de unir a tradição da apicultura portuguesa à experiência digital. O nome combina “Hexo” (o hexágono dos favos) com “Mel”. Conhece a nossa equipa e a nossa história na página [Sobre Nós](/sobre-nos)!"
    }
  },
  en: {
    greetings: {
      patterns: /\b(hello|hi|hey|good\s+morning|good\s+afternoon|good\s+evening|greetings|howdy|welcome|whats\s+up|sup)\b/i,
      response: "Hello! I'm **Melita**, the Hexomel virtual assistant. How can I help you today? You can ask me about our products, workshops, how to buy, the social network, or contacts! 🐝"
    },
    whois: {
      patterns: /(who\s+(is|are)\s+melita|who\s+are\s+you|about\s+you|introduce\s+yourself|what\s+are\s+you|your\s+name|what\s+is\s+your\s+name|what\s+do\s+you\s+do|virtual\s+assistant)/i,
      response: "I'm **Melita**, the Hexomel virtual assistant. I was programmed to help users navigate our website, obtain information about our products, and answer questions about beekeeping and workshops. 😊"
    },
    products: {
      patterns: /\b(honey|honeys|product|products|shop|store|buy|price|prices|sale|sales|rosemary|heather|chestnut|order|orders|purchase|purchases|cart|checkout|add|value|cost|costs|shipping|delivery|deliver|jar|jars|organic|artisanal|quality)\b/i,
      response: "At Hexomel, we offer premium organic artisanal honey harvested in Serra da Estrela! 🍯 We have **Rosemary Honey** (smooth and aromatic), **Heather Honey** (intense and antioxidant), and **Chestnut Honey** (robust and woody). You can explore them all and buy securely in our [Online Shop](/loja). Just add to cart!"
    },
    workshops: {
      patterns: /\b(workshop|workshops|course|courses|learn\s+beekeeping|class|classes|schedule|dates|sign\s*up|register|participation|participate|learning|training|beekeeping|event|events|experience|experiences)\b/i,
      response: "Would you like to be a beekeeper for a day? 🐝 We organize **Beekeeping Workshops**! In them, you can learn about bee life, harvesting honey, and visit the hives safely with proper gear. See upcoming dates and register on our [Workshops](/workshops) page!"
    },
    auth: {
      patterns: /\b(login|sign\s*in|register|sign\s*up|account|create\s+account|profile|logout|password|forgot|reset|recover|my\s+account|dashboard|data|change|modify|logout|signout)\b/i,
      response: "You can create an account on Hexomel to buy honey, register for workshops, and access our social network! 🐝 If you already have an account, you can Login. If you are new, you can Register. \n\nWould you like me to open the window to sign in or register?",
      showAuthActions: true
    },
    beekeepers: {
      patterns: /\b(beekeeper|beekeepers|sell|partner|partnership|hive|hives|produce|producer|producers|produce\s+honey|sell\s+honey|be\s+a\s+partner|register\s+as\s+beekeeper)\b/i,
      response: "Our mission is to support local beekeeping! 🍯 If you are a beekeeper and want to sell your honey on Hexomel, you can register as a Beekeeper. You'll gain access to an exclusive dashboard to manage your honey, sales, and hives. Learn more on our [Beekeepers](/apicultores) page!"
    },
    contacts: {
      patterns: /\b(contact|contacts|phone|email|support|help|address|location|where\s+is|headquarters|whatsapp|talk|write|call|message|street|place|map|complain|complaint)\b/i,
      response: "We are always here to help! 📞 You can reach us on our [Contacts](/contactos) page, via email at **hexomelpap@gmail.com**, or by phone: **+351 912 345 678**. We are located in the beautiful region of **Serra da Estrela, Portugal**."
    },
    social: {
      patterns: /\b(social|social\s+network|hexohive|community|members|posts|messages|forum|hive|share|publish|post|posts|friends|chat|chatting|private\s+messages)\b/i,
      response: "O **HexoHive** is our exclusive social network! 🐝 There you can share posts, photos of your hives, beekeeping tips, and interact with other community members. Go to the [Social Network](/rede-social) or join the discussions in our [Community Forum](/comunidade)!"
    },
    curiosities: {
      patterns: /\b(curiosity|curiosities|bees|bee|pollination|queen|worker|drone|facts|scientific\s+facts|importance|science|scientific|strange|interesting|benefits|health|properties|expire|spoil)\b/i,
      response: "Did you know that bees are crucial for the pollination of a third of the food we consume? 🐝 And pure honey is the only food that never spoils! You can learn more incredible scientific facts on our [Curiosities](/curiosidades) page or consult educational materials in [Learn](/aprender)!"
    },
    about: {
      patterns: /\b(about|history|mission|who\s+are\s+we|team|founder|origin|company|values|authenticity|quality|sustainability|creator|hexomel|name)\b/i,
      response: "Hexomel was born from the desire to bridge traditional Portuguese beekeeping with a modern digital experience. The name combines “Hexo” (the hexagon of honeycombs) with “Mel” (honey). Meet our team and read our story on the [About Us](/sobre-nos) page!"
    }
  }
};

export function getMelitaReply(query, activeLang = getLang()) {
  const lang = activeLang === "en" ? "en" : "pt";
  const db = KNOWLEDGE_BASE[lang] || KNOWLEDGE_BASE.pt;

  if (!query || typeof query !== "string") {
    const fallback = lang === "pt"
      ? "Desculpa, mas só consigo responder a questões relacionadas com o site do Hexomel (produtos, workshops, conta, contactos, rede social e curiosidades). 🍯"
      : "Sorry, but I can only answer questions related to the Hexomel website (products, workshops, account, contacts, social network, and curiosities). 🍯";

    return { response: fallback, isAllowed: false };
  }

  const cleanQuery = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const key in db) {
    if (db[key].patterns.test(cleanQuery)) {
      return {
        response: db[key].response,
        showAuthActions: !!db[key].showAuthActions,
        isAllowed: true
      };
    }
  }

  const fallback = lang === "pt"
    ? "Desculpa, mas só consigo responder a questões relacionadas com o site do Hexomel (como os nossos méis, workshops, rede social, conta ou contactos). 🍯\n\nTenta perguntar algo como:\n- 'Como comprar mel?'\n- 'Quais os workshops?'\n- 'O que é o HexoHive?'\n- 'Qual o vosso contacto?'"
    : "Sorry, but I can only answer questions related to the Hexomel website (such as our honey, workshops, social network, account, or contacts). 🍯\n\nTry asking something like:\n- 'How to buy honey?'\n- 'What workshops are available?'\n- 'What is HexoHive?'\n- 'What is your contact info?'";

  return { response: fallback, isAllowed: false };
}

export function initMelitaChatbot() {
  // Check if chatbot is already injected
  if (document.getElementById("melita-chat-root")) return;

  const lang = getLang();
  const welcomeMsg = lang === "pt"
    ? "Olá! Sou a **Melita**, a assistente virtual do Hexomel. Como posso ajudar-te hoje?"
    : "Hello! I'm **Melita**, the Hexomel virtual assistant. How can I help you today?";

  const placeholderText = lang === "pt" ? "Pergunta-me algo..." : "Ask me something...";
  const tooltipText = lang === "pt" ? "Olá! Posso ajudar? 🐝" : "Hi! Can I help? 🐝";

  // Create UI Root Container
  const chatRoot = document.createElement("div");
  chatRoot.id = "melita-chat-root";

  // Injected HTML structure
  chatRoot.innerHTML = `
    <!-- Floating Action Button -->
    <button class="melita-fab" id="melitaFab">
      <img src="/images/bee/abelha.webp" alt="Melita" class="melita-fab-img" id="melitaFabImg" style="object-fit: cover; border-radius: 50%; width: 100%; height: 100%;" />
    </button>

    <!-- Discreet Dock Tab on screen edge when hidden -->
    <button class="melita-dock-tab" id="melitaDockTab">
      <i class="fas fa-chevron-left"></i>
    </button>

    <!-- Welcome Tooltip Bubble -->
    <div class="melita-tooltip" id="melitaTooltip">
      <span data-i18n="chatbot.tooltip">${tooltipText}</span>
      <i class="fas fa-times" id="melitaTooltipClose" style="font-size: 11px; margin-left: 4px; opacity: 0.7;"></i>
    </div>

    <!-- Chat Window Widget -->
    <div class="melita-chat-window" id="melitaChatWindow">
      <!-- Header -->
      <div class="melita-chat-header">
        <div class="melita-chat-header-profile">
          <div class="melita-header-avatar-wrap">
            <img src="/images/bee/abelha.webp" alt="Melita" class="melita-header-avatar" style="object-fit: cover; border-radius: 50%; width: 100%; height: 100%;" />
          </div>
          <div class="melita-header-info">
            <h6 class="melita-header-name" data-i18n="chatbot.title">Melita — Assistente Virtual</h6>
          </div>
        </div>
        <button class="melita-close-btn" id="melitaCloseBtn">&times;</button>
      </div>

      <!-- Messages History -->
      <div class="melita-chat-messages" id="melitaMessages">
        <div class="melita-msg-row bot">
          <div class="melita-bubble">${formatMessageText(welcomeMsg)}</div>
        </div>
        <!-- Injected Suggestion Chips -->
        <div class="melita-chips-container" id="melitaInitialChips">
          <button class="melita-suggest-chip" data-query="${lang === "pt" ? "Quem é a Melita?" : "Who is Melita?"}">🐝 ${lang === "pt" ? "Quem é a Melita?" : "Who is Melita?"}</button>
          <button class="melita-suggest-chip" data-query="${lang === "pt" ? "Nossos Produtos" : "Our Products"}">🍯 ${lang === "pt" ? "Nossos Produtos" : "Our Products"}</button>
          <button class="melita-suggest-chip" data-query="${lang === "pt" ? "Workshops de Apicultura" : "Beekeeping Workshops"}">📅 ${lang === "pt" ? "Workshops" : "Workshops"}</button>
          <button class="melita-suggest-chip" data-query="${lang === "pt" ? "Rede Social HexoHive" : "HexoHive Social Network"}">💬 ${lang === "pt" ? "Rede Social" : "Social Network"}</button>
        </div>
      </div>

      <!-- Footer Input -->
      <div class="melita-chat-footer">
        <div class="melita-input-row">
          <input type="text" class="melita-input" id="melitaInput" data-i18n-ph="chatbot.placeholder" placeholder="${placeholderText}" autocomplete="off" />
          <button class="melita-send-btn" id="melitaSendBtn">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(chatRoot);

  // Select DOM Elements
  const fab = document.getElementById("melitaFab");
  const dockTab = document.getElementById("melitaDockTab");
  const tooltip = document.getElementById("melitaTooltip");
  const tooltipClose = document.getElementById("melitaTooltipClose");
  const chatWindow = document.getElementById("melitaChatWindow");
  const closeBtn = document.getElementById("melitaCloseBtn");
  const messagesContainer = document.getElementById("melitaMessages");
  const input = document.getElementById("melitaInput");
  const sendBtn = document.getElementById("melitaSendBtn");
  const initialChips = document.getElementById("melitaInitialChips");

  function dockMelita() {
    fab.classList.add("docked-hidden");
    fab.style.transform = "translateX(0px)";
    tooltip.classList.add("hide");
    dockTab.style.display = "flex";
  }

  function undockMelita() {
    fab.classList.remove("docked-hidden");
    fab.style.transform = "translateX(0px)";
    dockTab.style.display = "none";
  }

  if (dockTab) {
    dockTab.addEventListener("click", () => undockMelita());
  }

  // Strictly right-drag functionality to hide Melita
  let isDragging = false;
  let dragMoved = false;
  let startX = 0;

  function onPointerDown(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    isDragging = true;
    dragMoved = false;
    startX = clientX;
    fab.style.transition = "none";
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - startX;

    if (deltaX > 5) {
      dragMoved = true;
      const clampX = Math.max(0, Math.min(deltaX, 70));
      fab.style.transform = `translateX(${clampX}px)`;
    } else {
      fab.style.transform = `translateX(0px)`;
    }
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    fab.style.transition = "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";

    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const deltaX = clientX - startX;

    if (deltaX > 25) {
      dockMelita();
    } else {
      fab.style.transform = "translateX(0px)";
    }
  }

  fab.addEventListener("mousedown", onPointerDown);
  document.addEventListener("mousemove", onPointerMove);
  document.addEventListener("mouseup", onPointerUp);

  fab.addEventListener("touchstart", onPointerDown, { passive: true });
  document.addEventListener("touchmove", onPointerMove, { passive: true });
  document.addEventListener("touchend", onPointerUp);

  // Show tooltip bubble on load, automatically hide after 8s if not clicked
  let tooltipTimeout = setTimeout(() => {
    tooltip.classList.add("hide");
  }, 8000);

  // Close tooltip manually
  tooltipClose.addEventListener("click", (e) => {
    e.stopPropagation();
    clearTimeout(tooltipTimeout);
    tooltip.classList.add("hide");
  });

  // Clicking tooltip opens chat
  tooltip.addEventListener("click", () => {
    clearTimeout(tooltipTimeout);
    tooltip.classList.add("hide");
    toggleChat(true);
  });

  // Toggle Chat window
  function toggleChat(forceOpen = null) {
    const isOpen = forceOpen !== null ? forceOpen : !chatWindow.classList.contains("open");
    if (isOpen) {
      chatWindow.classList.add("open");
      fab.style.transform = "scale(0.9) rotate(-10deg)";
      tooltip.classList.add("hide");
      setTimeout(() => input.focus(), 150);
    } else {
      chatWindow.classList.remove("open");
      fab.style.transform = "";
    }
  }

  fab.addEventListener("click", () => {
    if (!dragMoved) toggleChat();
  });
  closeBtn.addEventListener("click", () => toggleChat(false));

  // Suggestion chips listeners
  document.addEventListener("click", (e) => {
    const chip = e.target.closest(".melita-suggest-chip");
    if (chip) {
      const query = chip.getAttribute("data-query");
      if (query) {
        handleUserMessage(query);
        // Hide chips container once used
        const parent = chip.closest(".melita-chips-container");
        if (parent) {
          parent.style.display = "none";
        }
      }
    }
  });

  // Send message events
  sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (text) {
      handleUserMessage(text);
      input.value = "";
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const text = input.value.trim();
      if (text) {
        handleUserMessage(text);
        input.value = "";
      }
    }
  });

  // Process User Messages
  async function handleUserMessage(text) {
    // 1. Add user bubble
    appendMessage("user", text);

    // 2. Hide initial suggestion chips if they are visible
    if (initialChips) {
      initialChips.style.display = "none";
    }

    // 3. Show typing indicator
    const typingIndicator = appendTypingIndicator();

    try {
      // Natural delay before showing response
      await new Promise(resolve => setTimeout(resolve, 700));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, lang: typeof getLang === "function" ? getLang() : "pt" })
      });

      const data = await response.json();

      // Check if fallback is requested (e.g. no GEMINI_API_KEY set)
      if (response.ok && !data.fallback) {
        typingIndicator.remove();
        appendMessage("bot", data.response, data.showAuthActions);
      } else {
        throw new Error("Fallback required");
      }
    } catch (err) {
      typingIndicator.remove();
      // Find answer locally (fallback logic)
      const answerObj = getMelitaReply(text);
      appendMessage("bot", answerObj.response, answerObj.showAuthActions);
    }
  }

  // Append a message bubble to the history
  function appendMessage(sender, text, showAuthActions = false) {
    const row = document.createElement("div");
    row.className = `melita-msg-row ${sender}`;

    const bubble = document.createElement("div");
    bubble.className = "melita-bubble";
    bubble.innerHTML = formatMessageText(text);

    // If auth actions are requested (e.g. login/register buttons in bot response)
    if (sender === "bot" && showAuthActions) {
      const activeLang = getLang();
      const loginText = activeLang === "pt" ? "Iniciar Sessão" : "Sign In";
      const registerText = activeLang === "pt" ? "Registar" : "Register";

      const btnContainer = document.createElement("div");
      btnContainer.className = "melita-chips-container";

      const loginBtn = document.createElement("button");
      loginBtn.className = "melita-action-btn";
      loginBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> ${loginText}`;
      loginBtn.addEventListener("click", () => {
        toggleChat(false);
        if (typeof window.openAuthModal === "function") {
          window.openAuthModal("login");
        } else {
          window.location.href = activeLang === "pt" ? "/login" : "/login.html";
        }
      });

      const registerBtn = document.createElement("button");
      registerBtn.className = "melita-action-btn";
      registerBtn.innerHTML = `<i class="fas fa-user-plus"></i> ${registerText}`;
      registerBtn.addEventListener("click", () => {
        toggleChat(false);
        if (typeof window.openAuthModal === "function") {
          window.openAuthModal("register");
        } else {
          window.location.href = activeLang === "pt" ? "/register" : "/register.html";
        }
      });

      btnContainer.appendChild(loginBtn);
      btnContainer.appendChild(registerBtn);
      bubble.appendChild(btnContainer);
    }

    row.appendChild(bubble);
    messagesContainer.appendChild(row);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Append typing indicator bubble
  function appendTypingIndicator() {
    const row = document.createElement("div");
    row.className = "melita-msg-row bot";

    const bubble = document.createElement("div");
    bubble.className = "melita-bubble";
    bubble.style.padding = "10px 14px";
    bubble.innerHTML = `
      <div class="melita-typing-indicator">
        <span class="melita-typing-dot"></span>
        <span class="melita-typing-dot"></span>
        <span class="melita-typing-dot"></span>
      </div>
    `;

    row.appendChild(bubble);
    messagesContainer.appendChild(row);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return row;
  }

  // Help format bold and links in text
  function formatMessageText(text) {
    if (!text) return "";

    // Escape HTML special characters except safe formatting
    let formatted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Re-allow specific markdown formatting: **bold**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Format links: [Text](URL) -> convert relative links to friendly urls
    formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, (match, linkText, url) => {
      const friendlyUrl = typeof window.toFriendlyUrl === "function" ? window.toFriendlyUrl(url) : url;
      return `<a href="${friendlyUrl}">${linkText}</a>`;
    });

    // Replace linebreaks with <br>
    formatted = formatted.replace(/\n/g, "<br>");

    return formatted;
  }

}
