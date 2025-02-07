/**
 * @fileoverview Formatter module for consistent message styling across the application.
 * This module provides a set of functions to format different types of messages with
 * consistent styling, colors, and icons. It helps maintain a uniform look and feel
 * throughout the CLI application.
 *
 * The module uses ANSI escape codes for colors and text formatting:
 * - \x1b[1m: Bold
 * - \x1b[31m: Red (for errors)
 * - \x1b[32m: Green (for success/info)
 * - \x1b[90m: Gray (for debug)
 * - \x1b[0m: Reset all formatting
 */

import * as p from "@clack/prompts";

/**
 * Formats a message for introduction/header display.
 * Uses clack/prompts intro for consistent and attractive formatting.
 *
 * @example
 * formatIntroMessage("Analyzing repository...") // Returns styled intro message
 *
 * @param message The message to format
 * @param useClack Whether to use clack/prompts output (default: true)
 * @returns Formatted message with clack/prompts styling
 */
export function formatIntroMessage(message: string, useClack = true): string {
  const formattedMessage = `\x1b[1m\x1b[32m🔍 ${message}\x1b[0m`;
  if (useClack) {
    p.intro(message);
  }
  return formattedMessage;
}

/**
 * Formats an error message.
 * Uses red text with a cross icon to make errors stand out and be immediately recognizable.
 *
 * @example
 * formatErrorMessage("Failed to clone repository") // Returns "❌ Error: Failed to clone repository" in red
 *
 * @param message The error message to format
 * @returns Formatted message with red styling and error icon
 */
export function formatErrorMessage(message: string): string {
  return `\x1b[31m❌ Error: ${message}\x1b[0m`;
}

/**
 * Formats a spinner/progress message.
 * Uses a lightning bolt icon to indicate ongoing operations or progress updates.
 *
 * @example
 * formatSpinnerMessage("Building text digest...") // Returns "⚡ Building text digest..."
 *
 * @param message The progress message to format
 * @returns Formatted message with spinner icon
 */
export function formatSpinnerMessage(message: string): string {
  return `⚡ ${message}`;
}

/**
 * Formats a debug message.
 * Uses dimmed gray text with a [DEBUG] prefix to distinguish debug output from regular messages.
 * Only shown when debug mode is enabled.
 *
 * @example
 * formatDebugMessage("Starting graph analysis") // Returns "[DEBUG] Starting graph analysis" in gray
 *
 * @param message The debug message to format
 * @returns Formatted message with [DEBUG] prefix and dimmed styling
 */
export function formatDebugMessage(message: string): string {
  return `\x1b[90m[DEBUG] ${message}\x1b[0m`;
}

/**
 * Formats a clipboard success message.
 * Uses a sparkles emoji and green text to indicate successful clipboard operation.
 *
 * @example
 * formatClipboardMessage() // Returns "✨ Copied to clipboard" in green
 *
 * @returns Formatted message with sparkles emoji and green styling
 */
export function formatClipboardMessage(): string {
  return `\x1b[32m✨ Copied to clipboard\x1b[0m`;
}

/**
 * Formats a file save notification message.
 * Uses clack/prompts outro for a nice completion message.
 *
 * @example
 * formatSaveMessage("/path/to/file.md") // Returns styled outro message
 *
 * @param path The file path where results were saved
 * @param useClack Whether to use clack/prompts output (default: true)
 * @returns Formatted message with clack/prompts styling
 */
export function formatSaveMessage(path: string, useClack = true): string {
  const formattedMessage = `\x1b[34m📑 Results saved: ${path}\x1b[0m`;
  if (useClack) {
    p.outro(`📑 Results saved: ${path}`);
  }
  return formattedMessage;
}
