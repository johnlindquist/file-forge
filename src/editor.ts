// src/editor.ts

import Conf from "conf";
import * as p from "@clack/prompts";
import { EditorConfig } from "./types.js";

// Global configuration for editor settings
const config = new Conf<{ editor: EditorConfig }>({
  projectName: "ghi",
});

/** Prompt for editor configuration if not already set */
export async function getEditorConfig(): Promise<EditorConfig> {
  const saved = config.get("editor");
  if (saved) return saved;

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
  config.set("editor", econf);
  return econf;
}
