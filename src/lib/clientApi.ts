export type ApiAccount = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
};

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export type UploadHandle = {
  promise: Promise<{ id: string; name: string; category: string; size: number }>;
  cancel: () => void;
};

export function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (percent: number) => void
): UploadHandle {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<{ id: string; name: string; category: string; size: number }>(
    (resolve, reject) => {
      xhr.open("POST", url);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data.file);
          } else {
            reject(new Error(data.error || `Upload failed (${xhr.status})`));
          }
        } catch {
          reject(new Error("Upload failed: invalid server response."));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload."));
      xhr.onabort = () => reject(new Error("Upload cancelled."));

      xhr.send(formData);
    }
  );

  return { promise, cancel: () => xhr.abort() };
}
