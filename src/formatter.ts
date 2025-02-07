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

/**
 * Formats a message for introduction/header display.
 * Uses bold green text with a magnifying glass icon to indicate analysis or important information.
 *
 * @example
 * formatIntroMessage("Analyzing repository...") // Returns "🔍 Analyzing repository..." in bold green
 *
 * @param message The message to format
 * @returns Formatted message with bold green styling and icon
 */
export function formatIntroMessage(message: string): string {
  return `\x1b[1m\x1b[32m🔍 ${message}\x1b[0m`;
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
 * Uses a bookmark emoji and blue text to indicate where results are saved.
 *
 * @example
 * formatSaveMessage("/path/to/file.md") // Returns "📑 Results saved: /path/to/file.md" in blue
 *
 * @param path The file path where results were saved
 * @returns Formatted message with bookmark emoji and blue styling
 */
export function formatSaveMessage(path: string): string {
  return `\x1b[34m📑 Results saved: ${path}\x1b[0m`;
}
