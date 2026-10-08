import * as cheerio from 'cheerio';

export interface ExtractedHydrationData {
  mfServerSideData: Record<string, any>;
  buildId?: string;
  page?: string;
}

export class GrowwExtractor {
  /**
   * Extracts the Next.js SSR hydration JSON from the Groww HTML page.
   */
  static extractNextData(html: string): ExtractedHydrationData {
    if (!html || typeof html !== 'string') {
      throw new Error('Invalid HTML input provided to extractor');
    }

    const $ = cheerio.load(html);
    const scriptContent = $('#__NEXT_DATA__').html();

    let jsonStr: string | null = scriptContent;

    // Substring fallback if Cheerio selector failed
    if (!jsonStr) {
      const idx = html.indexOf('__NEXT_DATA__');
      if (idx !== -1) {
        const start = html.indexOf('>', idx) + 1;
        const end = html.indexOf('</script>', start);
        if (start > 0 && end > start) {
          jsonStr = html.slice(start, end);
        }
      }
    }

    if (!jsonStr) {
      throw new Error('Unable to locate <script id="__NEXT_DATA__"> in Groww page HTML');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err: any) {
      throw new Error(`Failed to parse __NEXT_DATA__ JSON payload: ${err.message}`);
    }

    const pageProps = parsed?.props?.pageProps;
    if (!pageProps) {
      throw new Error('Next.js payload missing pageProps object');
    }

    const mfServerSideData = pageProps.mfServerSideData;
    if (!mfServerSideData) {
      throw new Error('pageProps missing mfServerSideData payload');
    }

    return {
      mfServerSideData,
      buildId: parsed.buildId,
      page: parsed.page
    };
  }
}
