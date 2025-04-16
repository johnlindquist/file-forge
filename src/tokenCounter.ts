import { get_encoding } from 'tiktoken';

/**
 * Counts the number of tokens in a text string using tiktoken
 * @param text - The text to count tokens for
 * @returns The number of tokens in the text
 */
export function countTokens(text: string): number {
    try {
        // Get the encoding for the specified model
        const encoding = get_encoding('cl100k_base'); // cl100k_base is used by gpt-3.5-turbo and gpt-4

        // Encode the text and get the token count
        const tokens = encoding.encode(text);
        const tokenCount = tokens.length;

        return tokenCount;
    } catch (error) {
        console.error(`Error counting tokens: ${error}`);
        // Return an estimate if tiktoken fails
        return Math.ceil(text.length / 4); // Rough estimate
    }
} 