// Main entry point for the sample project
import { greet } from './utils';
import { config } from './config';

/**
 * Main function that runs the application
 */
export function main() {
    const message = greet(config.defaultName);
    console.log(message);
}

// Run the app if this is the main module
if (require.main === module) {
    main();
} 