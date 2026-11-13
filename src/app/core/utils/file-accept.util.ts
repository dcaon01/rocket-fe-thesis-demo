/**
 * Tells whether a file matches the `accept` list of a file input, which the browser does not apply to dropped files.
 * Each entry is an extension (`.pdf`), a type (`application/pdf`) or a family of types (`image/*`).
 * @param file the file.
 * @param accept the comma-separated list, as in the `accept` attribute.
 * @returns true when the file matches one entry.
 */
export function acceptsFile(file: File, accept: string): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return accept.split(',').map(entry => entry.trim().toLowerCase()).some(entry =>
    entry.startsWith('.') ? name.endsWith(entry)
      : entry.endsWith('/*') ? type.startsWith(entry.slice(0, -1))
        : type === entry
  );
}
