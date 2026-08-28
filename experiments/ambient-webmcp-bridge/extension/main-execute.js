(async () => {
  if (globalThis.__protocolToolingMainExecuteLoaded) return;
  globalThis.__protocolToolingMainExecuteLoaded = true;

  if (globalThis.ProtocolToolingAmbientBridge?.experimentMode() === "main-execute") {
    await globalThis.ProtocolToolingAmbientBridge.register({ mechanism: "scripting-main-world" });
  }
})();
