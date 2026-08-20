import { Tree } from '@nx/devkit';

/**
 * Idempotently ensures `name` is imported from `packageName` in the file at
 * `filePath`: merges into an existing `import { ... } from 'packageName'`
 * statement if one exists, otherwise appends a new import statement after
 * the last existing import. No-op (returns false) if already present.
 * `formatFiles` (run by the generator afterwards) cleans up whitespace, so
 * this only needs to produce syntactically valid output, not pretty output.
 */
export function ensureNamedImport(
  tree: Tree,
  filePath: string,
  name: string,
  packageName: string,
): boolean {
  const content = tree.read(filePath, 'utf-8');
  if (content === null) {
    throw new Error(`Cannot ensure import in missing file "${filePath}".`);
  }

  const existingImportRegex = new RegExp(
    `import\\s*{([^}]*)}\\s*from\\s*'${packageName}';`,
  );
  const match = content.match(existingImportRegex);

  if (match) {
    const names = match[1]
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.includes(name)) {
      return false;
    }
    names.push(name);
    const newImport = `import { ${names.join(', ')} } from '${packageName}';`;
    tree.write(filePath, content.replace(match[0], newImport));
    return true;
  }

  const importedNameRegex = new RegExp(`\\b${name}\\b`);
  if (importedNameRegex.test(content)) {
    return false;
  }

  const lastImportMatch = [...content.matchAll(/^import .*;$/gm)].pop();
  const newImportLine = `import { ${name} } from '${packageName}';`;

  if (lastImportMatch && lastImportMatch.index !== undefined) {
    const insertAt = lastImportMatch.index + lastImportMatch[0].length;
    tree.write(
      filePath,
      content.slice(0, insertAt) +
        '\n' +
        newImportLine +
        content.slice(insertAt),
    );
  } else {
    tree.write(filePath, `${newImportLine}\n${content}`);
  }
  return true;
}
