import { defineConfig } from "blume";

export default defineConfig({
  title: "FullCalendar WebMCP · Protocol Tooling",
  description: "Protocol Tooling builds integrations that make existing web software available to AI agents through open standards such as WebMCP.",
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
  search: {
    popular: [
      { label: "Overview", href: "/integrations/fullcalendar" },
      { label: "Quickstart", href: "/integrations/fullcalendar/quickstart" },
      { label: "Repository Contract", href: "/integrations/fullcalendar/concepts/repository" },
      { label: "Persistence Model", href: "/integrations/fullcalendar/concepts/persistence" },
      { label: "WebMCP Tools", href: "/integrations/fullcalendar/concepts/webmcp" },
      { label: "API Reference: useFullCalendarWebMCP", href: "/integrations/fullcalendar/reference/use-fullcalendar-webmcp" },
    ],
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
