/**
 * Prepare newsroom images before network transfer.
 * Server-side sharp still validates and normalizes the uploaded image.
 */
export async function prepareEditorialImage(file: File): Promise<File> {
  if (file.size < 350_000 || typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const compressed = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!compressed || compressed.type !== 'image/webp' || compressed.size >= file.size * 0.95) return file;
    return new File([compressed], file.name.replace(/\.[^/.]+$/, '') + '.webp', {
      type: 'image/webp', lastModified: file.lastModified,
    });
  } catch {
    // Do not block reporters when a browser cannot decode the source file.
    return file;
  } finally {
    bitmap?.close();
  }
}

/** The normal Payload /api/media endpoint, with upload progress events. */
export function uploadEditorialImage(
  file: File,
  description: string,
  onProgress: (percent: number) => void,
): Promise<{ id: string | number; [key: string]: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media');
    xhr.withCredentials = true;
    xhr.timeout = 120_000;
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.min(99, Math.round(event.loaded / event.total * 100)));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Try a smaller image or a more stable network.'));
    xhr.onload = () => {
      let result: { doc?: { id?: string | number }; errors?: { message?: string }[]; message?: string; id?: string | number };
      try { result = JSON.parse(xhr.responseText); }
      catch { reject(new Error('The server returned an invalid upload response.')); return; }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(result.errors?.[0]?.message || result.message || 'Image upload failed.'));
        return;
      }
      const item = result.doc || result;
      if (item?.id == null) { reject(new Error('The upload completed without an image ID.')); return; }
      resolve(item as { id: string | number });
    };
    const form = new FormData();
    form.append('file', file);
    form.append('_payload', JSON.stringify({ alt: description.trim() }));
    xhr.send(form);
  });
}
