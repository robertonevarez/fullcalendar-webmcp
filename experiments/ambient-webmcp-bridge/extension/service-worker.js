chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "protocol-tooling-inject-main") return false;
  if (!sender.tab?.id || sender.frameId !== 0) {
    sendResponse({ ok: false, error: "Top-level tab context required." });
    return false;
  }

  chrome.scripting
    .executeScript({
      target: { tabId: sender.tab.id, frameIds: [0] },
      files: ["bridge-tools.js", "main-execute.js"],
      world: "MAIN",
      injectImmediately: true
    })
    .then(() => sendResponse({ ok: true, mechanism: "chrome.scripting.executeScript MAIN" }))
    .catch((error) => sendResponse({ ok: false, error: String(error) }));

  return true;
});
