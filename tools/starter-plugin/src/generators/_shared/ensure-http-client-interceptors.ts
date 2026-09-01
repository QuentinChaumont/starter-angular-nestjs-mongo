import { Tree } from '@nx/devkit';

/**
 * Idempotently ensures the app's root config sets up `HttpClient` with the
 * given functional interceptors (by identifier name):
 *
 *   provideHttpClient(withInterceptors([csrfInterceptor, authInterceptor]))
 *
 * - If a `withInterceptors([...])` call already exists, missing names are
 *   appended to it (order preserved — so `authInterceptor` stays before
 *   `httpErrorInterceptor`).
 * - Otherwise a `provideHttpClient(withInterceptors([...]))` entry is added
 *   to the `providers` array.
 *
 * The caller is responsible for the matching `import` statements
 * (`provideHttpClient` / `withInterceptors` from `@angular/common/http`,
 * and each interceptor from its brick).
 */
export function ensureHttpClientInterceptors(
  tree: Tree,
  filePath: string,
  interceptorNames: string[],
): boolean {
  const content = tree.read(filePath, 'utf-8');
  if (content === null) {
    throw new Error(`Cannot wire HttpClient in missing file "${filePath}".`);
  }

  const withInterceptors = content.match(/withInterceptors\(\s*\[([^\]]*)\]/);
  if (withInterceptors) {
    const existing = withInterceptors[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    const missing = interceptorNames.filter((name) => !existing.includes(name));
    if (missing.length === 0) {
      return false;
    }
    const merged = [...existing, ...missing].join(', ');
    tree.write(
      filePath,
      content.replace(withInterceptors[0], `withInterceptors([${merged}]`),
    );
    return true;
  }

  const providers = content.match(/providers\s*:\s*\[/);
  if (!providers || providers.index === undefined) {
    throw new Error(`Could not find the "providers" array in "${filePath}".`);
  }
  const insertAt = providers.index + providers[0].length;
  const entry = `provideHttpClient(withInterceptors([${interceptorNames.join(', ')}])),`;
  tree.write(
    filePath,
    `${content.slice(0, insertAt)}\n    ${entry}${content.slice(insertAt)}`,
  );
  return true;
}
