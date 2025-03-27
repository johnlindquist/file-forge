// src/editor.ts

import Conf from "conf";
import * as p from "@clack/prompts";
import { EditorConfig } from "./types.js";
import { APP_NAME } from "./constants.js"
import { formatDebugMessage } from "./formatter.js";

// Define the default editor configuration
const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  command: "code",
  skipEditor: false
};

// Global configuration for editor settings
const config = new Conf<{ editor: EditorConfig }>({
  projectName: APP_NAME,
  defaults: {
    editor: DEFAULT_EDITOR_CONFIG
  }
});

console.log(formatDebugMessage(`Editor config path: ${config.path}`));

/** Prompt for editor configuration if not already set */
export async function getEditorConfig(): Promise<EditorConfig> {
  console.log(formatDebugMessage(`getEditorConfig() called`));
  console.log(formatDebugMessage(`Config file location: ${config.path}`));
  console.log(formatDebugMessage(`Raw config store: ${JSON.stringify(config.store, null, 2)}`));

  const saved = config.get("editor");
  console.log(formatDebugMessage(`Editor config from file: ${JSON.stringify(saved, null, 2)}`));

  if (saved) {
    console.log(formatDebugMessage(`Using saved editor configuration: command="${saved.command}", skipEditor=${saved.skipEditor}`));
    return saved;
  }

  console.log(formatDebugMessage(`No editor config found, prompting user`));
  const editorCommand = await p.text({
    message: "Enter editor command (e.g. 'code', 'vim', 'nano')",
    placeholder: "code",
    validate(value: string) {
      if (!value) return "Please enter a command";
      return undefined;
    },
  });
  if (p.isCancel(editorCommand)) {
    p.cancel("Setup cancelled");
    process.exit(1);
  }
  const econf = { command: editorCommand, skipEditor: false };
  console.log(formatDebugMessage(`Saving new editor config: ${JSON.stringify(econf, null, 2)}`));
  config.set("editor", econf);
  return econf;
}
