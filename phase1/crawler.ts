export interface CrawlerOptions {
  timeoutMs?: number;
  maxRetries?: number;
  backoffBaseMs?: number;
  userAgent?: string;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export class GrowwCrawler {
  private timeoutMs: number;
  private maxRetries: number;
  private backoffBaseMs: number;
  private userAgent: string;

  constructor(options: CrawlerOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 12000;
    this.maxRetries = options.maxRetries ?? 3;
    this.backoffBaseMs = options.backoffBaseMs ?? 500;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  }

  /**
   * Fetches raw HTML content from a given Groww URL with exponential backoff retry.
   */
  async fetchHtml(url: string): Promise<{ html: string; status: number; durationMs: number }> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.maxRetries) {
      attempt++;
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        if (!html || html.length < 500) {
          throw new Error(`Received incomplete HTML response (${html?.length || 0} bytes)`);
        }

        return { html, status: response.status, durationMs };
      } catch (err: any) {
        lastError = err;
        if (attempt < this.maxRetries) {
          const delay = this.backoffBaseMs * Math.pow(2, attempt - 1) + Math.random() * 200;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw new Error(
      `GrowwCrawler failed to fetch ${url} after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }
}
