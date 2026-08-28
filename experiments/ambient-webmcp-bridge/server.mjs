import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./fixture/", import.meta.url));
const html = await readFile(`${root}index.html`);
const css = await readFile(`${root}styles.css`);
const port = Number(process.env.AMBIENT_WEBMCP_PORT || 4173);

const policies = {
  "/legacy/ordinary": {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'",
    "Origin-Agent-Cluster": "?1",
    "Permissions-Policy": "tools=(self)",
  },
  "/legacy/restrictive-csp": {
    "Content-Security-Policy": "default-src 'none'; script-src 'none'; style-src 'self'; object-src 'none'; base-uri 'none'",
    "Origin-Agent-Cluster": "?1",
    "Permissions-Policy": "tools=(self)",
  },
  "/legacy/permissions-denied": {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'",
    "Origin-Agent-Cluster": "?1",
    "Permissions-Policy": "tools=()",
  },
  "/legacy/origin-isolation-disabled": {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'",
    "Origin-Agent-Cluster": "?0",
    "Permissions-Policy": "tools=(self)",
  },
};

createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  if (url.pathname === "/styles.css") {
    response.writeHead(200, { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-store" });
    response.end(css);
    return;
  }

  const headers = policies[url.pathname];
  if (!headers) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found\n");
    return;
  }

  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(html);
}).listen(port, "0.0.0.0", () => {
  console.log(`Ambient WebMCP fixture listening on http://127.0.0.1:${port}`);
});
