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

  async execute(name: string, input: Record<string, unknown>, signal = new AbortController().signal) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Missing tool: ${name}`);
    return tool.execute(input, { signal });
  }
}

export function setModelContext(value: WebMCP.ModelContext | undefined) {
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value,
  });
}
