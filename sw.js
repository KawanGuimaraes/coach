// Service worker do site publicado (GitHub Pages): guarda os arquivos do app para ele abrir sem
// internet. Os registros não passam por aqui: o Supabase é de outra origem e nunca é guardado; os
// dados offline ficam no localStorage (src/lib/sincronia.ts).
const CACHE = "coach-v1";
const ESCOPO = new URL(self.registration.scope).pathname;

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.add(ESCOPO)));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  const url = new URL(pedido.url);
  if (pedido.method !== "GET" || url.origin !== self.location.origin) return;

  // Arquivos do build têm o conteúdo no nome: o que está guardado vale para sempre.
  if (url.pathname.includes("/_next/static/")) {
    evento.respondWith(
      caches.match(pedido).then(
        (guardada) =>
          guardada ||
          fetch(pedido).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(CACHE).then((c) => c.put(pedido, copia));
            }
            return resposta;
          }),
      ),
    );
    return;
  }

  // O resto (a página, o manifesto, os ícones): da rede quando dá, para pegar a versão nova; sem
  // rede, a última guardada. Qualquer página sem rede cai no app.
  evento.respondWith(
    fetch(pedido)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE).then((c) => c.put(pedido, copia));
        }
        return resposta;
      })
      .catch(() =>
        caches.match(pedido, { ignoreSearch: true }).then((guardada) => guardada || (pedido.mode === "navigate" ? caches.match(ESCOPO) : Response.error())),
      ),
  );
});
