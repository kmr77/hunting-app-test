import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const PERMIT_IMAGE_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "renewal-permits",
);
const PERMIT_IMAGE_PUBLIC_DIR = "/uploads/renewal-permits";

function publicStorageKey(fileName: string) {
  return `${PERMIT_IMAGE_PUBLIC_DIR}/${fileName}`;
}

export async function savePermitImage(
  buffer: Buffer,
  fileName: string,
): Promise<{ storageKey: string }> {
  await mkdir(PERMIT_IMAGE_UPLOAD_DIR, { recursive: true });

  const filePath = path.join(PERMIT_IMAGE_UPLOAD_DIR, fileName);
  const storageKey = publicStorageKey(fileName);

  await writeFile(filePath, buffer);

  return { storageKey };
}

export async function deletePermitImage(storageKey: string): Promise<void> {
  if (isLocalStorageKey(storageKey)) {
    await unlink(path.join(process.cwd(), "public", storageKey.slice(1))).catch(
      () => undefined,
    );
  }
}

export function getPublicUrl(storageKey: string): string {
  return storageKey;
}

export function isLocalStorageKey(storageKey: string): boolean {
  return storageKey.startsWith(PERMIT_IMAGE_PUBLIC_DIR);
}