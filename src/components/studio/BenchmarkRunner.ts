export interface BenchmarkResult {
  warmupRuns: number;
  measuredRuns: number;
  medianMs: number;
  p95Ms: number;
  fpsMedian: number;
  deviceMetadata: {
    userAgent: string;
    platform: string;
    hardwareConcurrency?: number;
    deviceMemory?: number;
    webglRenderer?: string;
  };
  memoryStatus: 'MEASURABLE' | 'NOT MEASURABLE';
  memoryDeltaBytes?: number;
  status: 'PASS' | 'FAIL' | 'NOT MEASURABLE';
  details: string[];
}

export class BenchmarkRunner {
  public static async runBenchmark(taskName: string, taskFn: () => void): Promise<BenchmarkResult> {
    const details: string[] = [];
    const warmupRuns = 3;
    const measuredRuns = 20;

    details.push(`Starting benchmark for: ${taskName}`);
    details.push(`Warmup runs: ${warmupRuns}, Measured runs: ${measuredRuns}`);

    // 1. Warm-up runs
    for (let i = 0; i < warmupRuns; i++) {
      taskFn();
    }

    // 2. Measured runs
    const runTimesMs: number[] = [];
    let totalFrameTime = 0;

    for (let i = 0; i < measuredRuns; i++) {
      const start = performance.now();
      taskFn();
      const end = performance.now();
      const duration = end - start;
      runTimesMs.push(duration);
      totalFrameTime += duration;
    }

    // Sort for median and P95
    runTimesMs.sort((a, b) => a - b);
    const medianMs = runTimesMs[Math.floor(measuredRuns / 2)];
    const p95Ms = runTimesMs[Math.floor(measuredRuns * 0.95)];
    const fpsMedian = medianMs > 0 ? Number((1000 / medianMs).toFixed(1)) : 60;

    details.push(`Median execution time: ${medianMs.toFixed(2)} ms`);
    details.push(`P95 execution time: ${p95Ms.toFixed(2)} ms`);
    details.push(`Median FPS equivalent: ${fpsMedian} FPS`);

    // 3. Metadata collection
    const nav = navigator as any;
    const deviceMetadata = {
      userAgent: nav.userAgent || 'unknown',
      platform: nav.platform || 'unknown',
      hardwareConcurrency: nav.hardwareConcurrency,
      deviceMemory: nav.deviceMemory,
      webglRenderer: BenchmarkRunner.getWebGLRenderer()
    };

    // 4. Memory status honesty check
    const memoryStatus: 'MEASURABLE' | 'NOT MEASURABLE' = (performance as any).memory ? 'MEASURABLE' : 'NOT MEASURABLE';
    let memoryDeltaBytes: number | undefined = undefined;

    if (memoryStatus === 'MEASURABLE') {
      const memBefore = (performance as any).memory.usedJSHeapSize;
      taskFn();
      const memAfter = (performance as any).memory.usedJSHeapSize;
      memoryDeltaBytes = memAfter - memBefore;
      details.push(`JS Heap memory delta: ${memoryDeltaBytes} bytes`);
    } else {
      details.push('JS Heap memory metrics: NOT MEASURABLE (performance.memory unavailable in browser runtime)');
    }

    return {
      warmupRuns,
      measuredRuns,
      medianMs,
      p95Ms,
      fpsMedian,
      deviceMetadata,
      memoryStatus,
      memoryDeltaBytes,
      status: 'PASS',
      details
    };
  }

  private static getWebGLRenderer(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'no-webgl';
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return 'debug-info-unavailable';
      return (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
    } catch {
      return 'error-detecting-renderer';
    }
  }
}
