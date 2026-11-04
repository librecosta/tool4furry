import { boundedFiles, fail, MiB } from '../general/bounds';
import { safePath } from './core';

export function filePath(file: File) { return file.webkitRelativePath || file.name; }

/** Check the whole intake before changing the current collection. */
export function checkFiles(files: readonly File[]) {
  boundedFiles(files, 500, 96 * MiB, 32 * MiB);
  const paths = new Set<string>();
  for (const file of files) {
    const path = safePath(filePath(file)), key = path.toLowerCase();
    if (path.endsWith('/')) fail('请选择文件，而不是目录条目。', 'Select files, not directory entries.');
    if (paths.has(key)) fail('归档内存在重复路径。', 'Duplicate archive paths.');
    paths.add(key);
  }
}

export function folderStem(files: readonly File[]) {
  const parts = files.map(file => filePath(file).split('/'));
  return parts.length && parts.every(path => path.length > 1 && path[0] === parts[0][0]) ? parts[0][0] : 'archive';
}

export type ZipNode = { path: string; name: string; size: number; files: string[]; children?: ZipNode[] };

/** Directory groups project safe file paths; they never add ZIP directory entries. */
export function zipTree(entries: readonly { name: string; size: number }[]): ZipNode[] {
  const root: ZipNode = { path: '', name: '', size: 0, files: [], children: [] };
  for (const entry of entries) {
    const path = safePath(entry.name);
    if (path.endsWith('/')) continue;
    const parts = path.split('/');
    let parent = root;
    for (let i = 0; i < parts.length; i++) {
      const folder = i < parts.length - 1;
      const key = parts.slice(0, i + 1).join('/') + (folder ? '/' : '');
      let node = parent.children!.find(child => child.path === key);
      if (!node) {
        node = { path: key, name: parts[i], size: 0, files: [], ...(folder ? { children: [] } : {}) };
        parent.children!.push(node);
      }
      node.size += entry.size; node.files.push(path); parent = node;
    }
  }
  const foldersFirst = (nodes: ZipNode[]) => {
    nodes.sort((a, b) => Number(!!b.children) - Number(!!a.children));
    for (const node of nodes) if (node.children) foldersFirst(node.children);
  };
  foldersFirst(root.children!);
  return root.children!;
}

export function selectionState(paths: readonly string[], selected: ReadonlySet<string>) {
  const count = paths.filter(path => selected.has(path)).length;
  return { checked: count > 0 && count === paths.length, indeterminate: count > 0 && count < paths.length };
}

export function selectPaths(selected: ReadonlySet<string>, paths: readonly string[], checked: boolean) {
  const next = new Set(selected);
  for (const path of paths) if (checked) next.add(path); else next.delete(path);
  return next;
}
