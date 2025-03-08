// src/types.ts

export type EditorConfig = {
  command: string | null;
  skipEditor: boolean;
};

export type IngestFlags = {
  repo?: string | undefined;
  path?: string | undefined;
  include?: string[];
  exclude?: string[];
  branch?: string | undefined;
  commit?: string | undefined;
  maxSize?: number | undefined;
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
  graph?: string | undefined;
  verbose?: boolean | undefined;
  test?: boolean | undefined;
  name?: string | undefined;
  basePath?: string;
  extension?: string[];
  svg?: boolean | undefined;
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
  tooLarge?: boolean;
  isBinary?: boolean;
  isSvgIncluded?: boolean;
}

export interface GitResetOptions {
  branch?: string | undefined;
  commit?: string | undefined;
  useRegularGit?: boolean | undefined;
  source?: string | undefined;
  repoPath?: string | undefined;
}
