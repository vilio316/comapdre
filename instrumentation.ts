export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWorker } = await import("./app/lib/ocr-queue");
    startWorker();

    const { startMcqWorker } = await import("./app/lib/mcq-queue");
    startMcqWorker();

    const { startCompileWorker } = await import("./app/lib/compile-queue");
    startCompileWorker();

    const { startPdfWorker } = await import("./app/lib/pdf-queue");
    startPdfWorker();
  }
}
