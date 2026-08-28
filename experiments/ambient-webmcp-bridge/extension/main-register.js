(async () => {
  if (globalThis.__protocolToolingMainStaticLoaded) return;
  globalThis.__protocolToolingMainStaticLoaded = true;

  if (globalThis.ProtocolToolingAmbientBridge?.experimentMode() === "main-static") {
    await globalThis.ProtocolToolingAmbientBridge.register({ mechanism: "manifest-main-world" });
  }
})();
