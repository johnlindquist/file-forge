import Conf from "conf";
import { EditorConfig } from "./types.js";
import { APP_NAME } from "./constants.js";

// Default editor configuration
export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
    command: "code",
    skipEditor: false
};

// Single shared configuration instance
export const config = new Conf<{ editor: EditorConfig }>({
    projectName: APP_NAME,
    projectSuffix: '', // Prevent -nodejs suffix in config path
    defaults: {
        editor: DEFAULT_EDITOR_CONFIG
    }
});

// Helper function to get the editor configuration
export function getConfig(): typeof config {
    return config;
} 