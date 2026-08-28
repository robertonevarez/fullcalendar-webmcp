(function installProtocolToolingBridgeFactory(scope) {
  const DIAGNOSTIC_SOURCE = "protocol-tooling-ambient-webmcp";

  function report(event, detail = {}) {
    const payload = {
      source: DIAGNOSTIC_SOURCE,
      event,
      href: location.href,
      timestamp: new Date().toISOString(),
      ...detail,
    };
    console.info("[protocol-tooling ambient-webmcp]", payload);
    try {
      window.postMessage(payload, location.origin);
    } catch {
      window.postMessage(payload, "*");
    }
  }

  function resolvePage() {
    const localFixture =
      (location.hostname === "127.0.0.1" || location.hostname === "localhost") &&
      location.pathname.startsWith("/legacy/");

    if (localFixture) {
      return {
        kind: "business",
        businessId: "marias-deep-cleaning",
        name: "Maria's Deep Cleaning",
        location: "El Paso, TX",
        services: ["Deep Cleaning", "Move-out Cleaning"],
      };
    }

    if (location.hostname === "example.com") {
      return {
        kind: "public-page",
        pageId: "iana-example-domain",
        title: "Example Domain",
        canonicalUrl: "https://example.com/",
      };
    }

    return undefined;
  }

  function experimentMode() {
    return new URL(location.href).searchParams.get("bridge") || "main-static";
  }

  function businessTools(identity) {
    return [
      {
        name: "get_business_info",
        description: "Return static public information for the recognized business represented by this page.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: async () => {
          report("tool_invocation_received", { tool: "get_business_info" });
          const result = {
            name: identity.name,
            location: identity.location,
            services: [...identity.services],
          };
          report("tool_result_returned", { tool: "get_business_info", result });
          return result;
        },
      },
      {
        name: "request_appointment",
        description: "Record a mock appointment request. This experiment never schedules, emails, purchases, or contacts anyone.",
        inputSchema: {
          type: "object",
          properties: {
            service: { type: "string", enum: identity.services },
            preferred_date: { type: "string", description: "Preferred date as YYYY-MM-DD." },
            preferred_time: { type: "string", description: "Preferred local time, such as 10:00 AM." },
            customer_name: { type: "string", minLength: 1, maxLength: 100 },
          },
          required: ["service", "preferred_date", "preferred_time", "customer_name"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: async ({ service, preferred_date, preferred_time, customer_name }) => {
          report("tool_invocation_received", { tool: "request_appointment" });
          const result = {
            status: "request_received",
            business: identity.name,
            service,
            preferred_date,
            preferred_time,
            customer_name,
            mock: true,
          };
          report("tool_result_returned", {
            tool: "request_appointment",
            status: result.status,
            mock: true,
          });
          return result;
        },
      },
    ];
  }

  function publicPageTools(identity) {
    return [
      {
        name: "get_page_context",
        description: "Return static, non-personal context for this recognized public test page.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: async () => {
          report("tool_invocation_received", { tool: "get_page_context" });
          const result = {
            page_id: identity.pageId,
            title: identity.title,
            canonical_url: identity.canonicalUrl,
            source: "static_extension_mapping",
          };
          report("tool_result_returned", { tool: "get_page_context", result });
          return result;
        },
      },
    ];
  }

  async function waitForModelContext(timeoutMs = 10_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (typeof document.modelContext?.registerTool === "function") return document.modelContext;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return undefined;
  }

  async function register({ mechanism }) {
    const identity = resolvePage();
    report("extension_script_loaded", { mechanism });
    if (!identity) {
      report("page_not_matched", { mechanism });
      return;
    }

    report("page_matched", { mechanism, kind: identity.kind });
    report("business_resolved", { mechanism, business_id: identity.businessId, page_id: identity.pageId });
    report("injection_attempted", { mechanism });

    const modelContext = await waitForModelContext();
    if (!modelContext) {
      report("webmcp_api_unavailable", { mechanism });
      return;
    }
    report("webmcp_api_available", { mechanism });

    const tools = identity.kind === "business" ? businessTools(identity) : publicPageTools(identity);
    for (const tool of tools) {
      try {
        await modelContext.registerTool(tool);
        report("tool_registration_succeeded", { mechanism, tool: tool.name });
      } catch (error) {
        report("tool_registration_failed", {
          mechanism,
          tool: tool.name,
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        });
      }
    }
  }

  scope.ProtocolToolingAmbientBridge = { experimentMode, register };
})(globalThis);
