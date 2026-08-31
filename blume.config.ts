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
  theme: {
    fonts: {
      display: {
        name: "Inter",
        fallback: "sans",
        variants: [
          { src: "./fonts/inter/InterVariable.woff2", weight: "100..900", style: "normal" },
          { src: "./fonts/inter/InterVariable-Italic.woff2", weight: "100..900", style: "italic" },
        ],
      },
      body: {
        name: "Inter",
        fallback: "sans",
        variants: [
          { src: "./fonts/inter/InterVariable.woff2", weight: "100..900", style: "normal" },
          { src: "./fonts/inter/InterVariable-Italic.woff2", weight: "100..900", style: "italic" },
        ],
      },
      mono: {
        name: "Lilex",
        fallback: "mono",
        variants: [
          { src: "./fonts/lilex/Lilex-Variable.woff2", weight: "100..700", style: "normal" },
          { src: "./fonts/lilex/Lilex-Italic-Variable.woff2", weight: "100..700", style: "italic" },
        ],
      },
    },
  },
  content: {
    root: "docs",
    exclude: ["**/DX-AUDIT.md", "**/_*", "**/.*"],
  },
  // Docs shell is already "FullCalendar WebMCP · Protocol Tooling", so don't
  // nest the same product name again under Integrations in the sidebar.
  navigation: {
    sidebar: [
      "/integrations/fullcalendar",
      "/integrations/fullcalendar/quickstart",
      "/integrations/fullcalendar/troubleshooting",
      {
        label: "Concepts",
        items: [
          "/integrations/fullcalendar/concepts/repository",
          "/integrations/fullcalendar/concepts/persistence",
          "/integrations/fullcalendar/concepts/webmcp",
        ],
      },
      {
        label: "Guides",
        items: [
          "/integrations/fullcalendar/guides/existing-app",
          "/integrations/fullcalendar/guides/nextjs",
          "/integrations/fullcalendar/guides/custom-event-model",
          "/integrations/fullcalendar/guides/testing",
        ],
      },
      {
        label: "Reference",
        items: [
          "/integrations/fullcalendar/reference/use-fullcalendar-webmcp",
          "/integrations/fullcalendar/reference/calendar-event-repository",
          "/integrations/fullcalendar/reference/types",
        ],
      },
    ],
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
