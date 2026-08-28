(async () => {
  const prefix = "[protocol-tooling ambient-webmcp isolated]";
  const mode = new URL(location.href).searchParams.get("bridge") || "main-static";
  console.info(prefix, { event: "extension_loaded", mode, href: location.href });

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "protocol-tooling-ambient-webmcp") return;
    console.info(prefix, { event: "main_world_diagnostic", detail: event.data });
  });

  if (mode === "isolated") {
    const identity =
      (location.hostname === "127.0.0.1" || location.hostname === "localhost") &&
      location.pathname.startsWith("/legacy/")
        ? { name: "Maria's Deep Cleaning", location: "El Paso, TX", services: ["Deep Cleaning", "Move-out Cleaning"] }
        : undefined;

    console.info(prefix, {
      event: identity ? "page_matched" : "page_not_matched",
      business_id: identity ? "marias-deep-cleaning" : undefined,
    });

    const deadline = Date.now() + 10_000;
    while (identity && Date.now() < deadline && typeof document.modelContext?.registerTool !== "function") {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!identity || typeof document.modelContext?.registerTool !== "function") {
      console.warn(prefix, { event: "webmcp_api_unavailable" });
      return;
    }

    const tools = [
      {
        name: "get_business_info",
        description: "Return static public information for the recognized business represented by this page.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: async () => {
          console.info(prefix, { event: "tool_invocation_received", tool: "get_business_info" });
          const result = { name: identity.name, location: identity.location, services: [...identity.services] };
          console.info(prefix, { event: "tool_result_returned", tool: "get_business_info" });
          return result;
        },
      },
      {
        name: "request_appointment",
        description: "Record a mock appointment request without contacting anyone or creating an appointment.",
        inputSchema: {
          type: "object",
          properties: {
            service: { type: "string", enum: identity.services },
            preferred_date: { type: "string" },
            preferred_time: { type: "string" },
            customer_name: { type: "string", minLength: 1, maxLength: 100 },
          },
          required: ["service", "preferred_date", "preferred_time", "customer_name"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: async ({ service, preferred_date, preferred_time, customer_name }) => {
          console.info(prefix, { event: "tool_invocation_received", tool: "request_appointment" });
          const result = {
            status: "request_received",
            business: identity.name,
            service,
            preferred_date,
            preferred_time,
            customer_name,
            mock: true,
          };
          console.info(prefix, { event: "tool_result_returned", tool: "request_appointment", status: result.status });
          return result;
        },
      },
    ];

    for (const tool of tools) {
      try {
        await document.modelContext.registerTool(tool);
        console.info(prefix, { event: "tool_registration_succeeded", tool: tool.name });
      } catch (error) {
        console.warn(prefix, {
          event: "tool_registration_failed",
          tool: tool.name,
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        });
      }
    }
  }

  if (mode === "main-execute") {
    chrome.runtime.sendMessage({ type: "protocol-tooling-inject-main" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(prefix, { event: "execute_script_failed", error: chrome.runtime.lastError.message });
        return;
      }
      console.info(prefix, { event: "execute_script_result", response });
    });
  }
})();
