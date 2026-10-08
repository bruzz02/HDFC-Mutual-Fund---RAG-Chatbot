export interface SSEMessage {
  event?: string;
  data: any;
  id?: string;
}

export class SSEStreamer {
  /**
   * Formats an object into SSE text format.
   */
  static formatMessage(msg: SSEMessage): string {
    let out = '';
    if (msg.event) out += `event: ${msg.event}\n`;
    if (msg.id) out += `id: ${msg.id}\n`;
    const payload = typeof msg.data === 'string' ? msg.data : JSON.stringify(msg.data);
    out += `data: ${payload}\n\n`;
    return out;
  }

  /**
   * Tokenizes markdown text into chunk tokens for SSE simulation.
   */
  static simulateTokenStream(text: string, chunkSize: number = 4): string[] {
    const tokens: string[] = [];
    const words = text.split(/(\s+)/);
    let buffer = '';

    for (let i = 0; i < words.length; i++) {
      buffer += words[i];
      if ((i + 1) % chunkSize === 0 || i === words.length - 1) {
        tokens.push(buffer);
        buffer = '';
      }
    }
    return tokens;
  }
}
