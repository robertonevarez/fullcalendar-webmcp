/**
 * Test double for document.modelContext that mirrors the current WebMCP
 * imperative execution contract from the W3C WebMCP draft:
 *
 * - registerTool(tool, { signal? }) unregisters on abort
 * - executeTool(RegisteredTool, inputObject?, { signal? }) serializes input,
 *   always invents a ToolExecuteCallbackOptions.abort controller signal when
 *   the caller omits one, and invokes tool.execute(inputObject, { signal })
 *
 * The browser never calls execute with a missing second argument. Tests that
 * need to cover one-arg agent shims must call tool.execute(input) directly.
 */
export class FakeModelContext extends EventTarget implements WebMCP.ModelContext {
  readonly tools = new Map<string, WebMCP.ModelContextTool>();
  ontoolchange: ((this: WebMCP.ModelContext, ev: Event) => unknown) | null = null;

  async registerTool(
    tool: WebMCP.ModelContextTool,
    options: WebMCP.ModelContextRegisterToolOptions = {},
  ) {
    if (this.tools.has(tool.name)) {
      throw new DOMException(`Duplicate tool: ${tool.name}`, "InvalidStateError");
    }
    options.signal?.throwIfAborted();
    this.tools.set(tool.name, tool);
    const remove = () => {
      this.tools.delete(tool.name);
      this.dispatchEvent(new Event("toolchange"));
    };
    options.signal?.addEventListener("abort", remove, { once: true });
    this.dispatchEvent(new Event("toolchange"));
  }

  async getTools(): Promise<WebMCP.RegisteredTool[]> {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      title: tool.title ?? "",
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
      origin: window.location.origin,
      window,
    }));
  }

  /**
   * Mirrors ModelContext.executeTool from the WebMCP draft / Chromium.
   * Always invokes the registered callback as execute(inputObject, { signal }).
   */
  async executeTool(
    tool: WebMCP.RegisteredTool | string,
    inputObject: Record<string, unknown> = {},
    options: { signal?: AbortSignal } = {},
  ) {
    const name = typeof tool === "string" ? tool : tool.name;
    const registered = this.tools.get(name);
    if (!registered) {
      throw new DOMException(`Unknown tool: ${name}`, "NotFoundError");
    }

    // Spec executeTool serializes then re-parses input before invoke.
    const serialized = JSON.stringify(inputObject);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;

    const signal = options.signal ?? new AbortController().signal;
    signal.throwIfAborted();

    return registered.execute(parsed, { signal });
  }

  /** Convenience for tests; delegates to executeTool with browser semantics. */
  async execute(
    name: string,
    input: Record<string, unknown> = {},
    signal?: AbortSignal,
  ) {
    return this.executeTool(name, input, signal ? { signal } : {});
  }
}

export function setModelContext(value: WebMCP.ModelContext | undefined) {
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value,
  });
}
