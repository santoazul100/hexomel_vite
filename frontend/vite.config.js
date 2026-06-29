import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "friendly-urls",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          let pathname = url.pathname;

          if (pathname.length > 1 && pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
          }

          const defaultRewrites = {
            '/': '/index.html',
            '/inicio': '/index.html',
            '/loja': '/shop.html',
            '/sobre-nos': '/about.html',
            '/contactos': '/contact.html',
            '/workshops': '/workshops.html',
            '/curiosidades': '/curiosidades.html',
            '/aprender': '/aprender.html',
            '/comunidade': '/comunidade.html',
            '/apicultores': '/apicultores.html',
            '/login': '/login.html',
            '/register': '/register.html',
            '/admin': '/admin.html',
            '/rede-social': '/rede-social.html'
          };

          let slugMap = {};
          try {
            const fetchRes = await fetch("http://127.0.0.1:3000/api/site-slugs");
            if (fetchRes.ok) {
              const pages = await fetchRes.json();
              pages.forEach(p => {
                if (p.Slug) {
                  slugMap['/' + p.Slug] = p.Pagina;
                }
              });
            }
          } catch (e) {
            // Backend offline/starting up
          }

          const pageKeyToHtml = {
            inicio: '/index.html',
            loja: '/shop.html',
            sobre: '/about.html',
            contactos: '/contact.html',
            workshops: '/workshops.html',
            curiosidades: '/curiosidades.html',
            aprender: '/aprender.html',
            comunidade: '/comunidade.html',
            apicultores: '/apicultores.html'
          };

          const matchedPageKey = slugMap[pathname];
          if (matchedPageKey && pageKeyToHtml[matchedPageKey]) {
            req.url = pageKeyToHtml[matchedPageKey] + url.search;
          } else if (defaultRewrites[pathname]) {
            req.url = defaultRewrites[pathname] + url.search;
          } else if (pathname.startsWith('/produto/')) {
            const slug = pathname.replace('/produto/', '');
            req.url = `/produto.html?slug=${slug}`;
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          let pathname = url.pathname;

          if (pathname.length > 1 && pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
          }

          const defaultRewrites = {
            '/': '/index.html',
            '/inicio': '/index.html',
            '/loja': '/shop.html',
            '/sobre-nos': '/about.html',
            '/contactos': '/contact.html',
            '/workshops': '/workshops.html',
            '/curiosidades': '/curiosidades.html',
            '/aprender': '/aprender.html',
            '/comunidade': '/comunidade.html',
            '/apicultores': '/apicultores.html',
            '/login': '/login.html',
            '/register': '/register.html',
            '/admin': '/admin.html',
            '/rede-social': '/rede-social.html'
          };

          let slugMap = {};
          try {
            const fetchRes = await fetch("http://127.0.0.1:3000/api/site-slugs");
            if (fetchRes.ok) {
              const pages = await fetchRes.json();
              pages.forEach(p => {
                if (p.Slug) {
                  slugMap['/' + p.Slug] = p.Pagina;
                }
              });
            }
          } catch (e) {
            // Backend offline/starting up
          }

          const pageKeyToHtml = {
            inicio: '/index.html',
            loja: '/shop.html',
            sobre: '/about.html',
            contactos: '/contact.html',
            workshops: '/workshops.html',
            curiosidades: '/curiosidades.html',
            aprender: '/aprender.html',
            comunidade: '/comunidade.html',
            apicultores: '/apicultores.html'
          };

          const matchedPageKey = slugMap[pathname];
          if (matchedPageKey && pageKeyToHtml[matchedPageKey]) {
            req.url = pageKeyToHtml[matchedPageKey] + url.search;
          } else if (defaultRewrites[pathname]) {
            req.url = defaultRewrites[pathname] + url.search;
          } else if (pathname.startsWith('/produto/')) {
            const slug = pathname.replace('/produto/', '');
            req.url = `/produto.html?slug=${slug}`;
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    strictPort: true, // Forces it to only use this port
    open: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      input: {
        main: "index.html",
        shop: "shop.html",
        about: "about.html",
        contact: "contact.html",
        workshops: "workshops.html",
        curiosidades: "curiosidades.html",
        aprender: "aprender.html",
        comunidade: "comunidade.html",
        apicultor: "apicultor.html",
        apicultores: "apicultores.html",
        profile: "profile.html",
        checkout: "checkout.html",
        admin: "admin.html",
        dashboardApicultor: "dashboard-apicultor.html",
        produto: "produto.html",
        login: "login.html",
        register: "register.html",
        verifyEmail: "verify-email.html",
        success: "success.html",
        cancel: "cancel.html",
        recuperar: "recuperar.html",
        redeSocial: "rede-social.html",
        faq: "faq.html",
        termos: "termos.html",
      },
    },
  },
});
