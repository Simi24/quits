/** Hands a text file to the browser's downloads. A BOM lets a spreadsheet open a UTF-8 CSV with its accents. */
export function downloadText(filename: string, mime: string, text: string, bom = false): void {
  const blob = new Blob([bom ? "﻿" : "", text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** A file name from a trip name: ASCII letters and digits, hyphens between. */
export const fileSlug = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "viaggio";
