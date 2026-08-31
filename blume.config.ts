import { defineConfig } from "blume";

export default defineConfig({
  title: "Protocol Tooling",
  description: "Agent interfaces for the existing web.",
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
  redirects: [
    { from: "/quickstart", to: "/integrations/fullcalendar/quickstart" },
    { from: "/concepts/repository", to: "/integrations/fullcalendar/concepts/repository" },
    { from: "/concepts/persistence", to: "/integrations/fullcalendar/concepts/persistence" },
    { from: "/concepts/webmcp", to: "/integrations/fullcalendar/concepts/webmcp" },
    { from: "/guides/existing-app", to: "/integrations/fullcalendar/guides/existing-app" },
    { from: "/guides/nextjs", to: "/integrations/fullcalendar/guides/nextjs" },
    { from: "/guides/custom-event-model", to: "/integrations/fullcalendar/guides/custom-event-model" },
    { from: "/guides/testing", to: "/integrations/fullcalendar/guides/testing" },
    { from: "/reference/use-fullcalendar-webmcp", to: "/integrations/fullcalendar/reference/use-fullcalendar-webmcp" },
    { from: "/reference/calendar-event-repository", to: "/integrations/fullcalendar/reference/calendar-event-repository" },
    { from: "/reference/types", to: "/integrations/fullcalendar/reference/types" },
    { from: "/troubleshooting", to: "/integrations/fullcalendar/troubleshooting" },
  ],
});
