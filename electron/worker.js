addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request));
  });
  
  async function handleRequest(request) {
    return new Response("Hello from your deployed API!", {
      headers: { "Content-Type": "text/plain" },
    });
  }
  