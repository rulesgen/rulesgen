import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeClient {
  generate(systemPrompt: string, userPrompt: string, onChunk?: (chunk: string) => void): Promise<string>;
}

export function createClaudeClient(apiKey: string, model: string = 'claude-sonnet-4-5'): ClaudeClient {
  const client = new Anthropic({ apiKey });

  return {
    async generate(systemPrompt: string, userPrompt: string, onChunk?: (chunk: string) => void): Promise<string> {
      let fullResponse = '';

      const stream = client.messages.stream({
        model,
        max_tokens: 4096,
        temperature: 0,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text;
          fullResponse += text;
          onChunk?.(text);
        }
      }

      return fullResponse;
    },
  };
}

export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 chars per token for English text
  return Math.ceil(text.length / 4);
}

export function estimateCost(inputTokens: number, outputTokens: number = 4096): number {
  // Claude Sonnet pricing (approximate)
  const inputCostPer1M = 3.0;
  const outputCostPer1M = 15.0;
  return (inputTokens / 1_000_000) * inputCostPer1M + (outputTokens / 1_000_000) * outputCostPer1M;
}
