// src/types.ts

export type EditorConfig = {
  command: string | null;
  skipEditor: boolean;
};

export type IngestFlags = {
  include?: string[];
  exclude?: string[];
  branch?: string | undefined;
  commit?: string | undefined;
  maxSize?: number;
  pipe?: boolean | undefined;
  debug?: boolean | undefined;
  bulk?: boolean | undefined;
  ignore?: boolean | undefined;
  skipArtifacts?: boolean | undefined;
  clipboard?: boolean | undefined;
  noEditor?: boolean | undefined;
  find?: string[];
  require?: string[];
  useRegularGit?: boolean | undefined;
  open?: boolean | undefined;
};

export type ScanStats = {
  totalFiles: number;
  totalSize: number;
};

export interface TreeNode {
  name: string;
  type: "file" | "directory";
  path: string;
  size: number;
  children?: TreeNode[];
  content?: string;
  file_count: number;
  dir_count: number;
  parent?: TreeNode;
}
