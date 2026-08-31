import { defineConfig } from "blume";

export default defineConfig({
  title: "Protocol Tooling",
  description: "WebMCP tools for FullCalendar in React applications.",
  deployment: {
    site: "https://protocoltooling.com",
  },
  ai: {
    llmsTxt: true,
    webmcp: true,
  },
  content: {
    root: "docs",
    exclude: ["**/DX-AUDIT.md", "**/_*", "**/.*"],
  },
});
