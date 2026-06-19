// Thin Drive REST client — avoids bundling the full googleapis SDK on frontend.
// All methods take an accessToken directly; token refresh is the caller's job.

const BASE = 'https://www.googleapis.com';

interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}

interface ListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

async function driveRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Drive API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function findOrCreateFolder(
  accessToken: string,
  name = 'AI Hub',
  parentId?: string,
): Promise<string> {
  const q = [
    `name='${name}'`,
    "mimeType='application/vnd.google-apps.folder'",
    'trashed=false',
    parentId ? `'${parentId}' in parents` : "'root' in parents",
  ].join(' and ');

  const list = await driveRequest<ListResponse>(
    `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    accessToken,
  );

  if (list.files.length > 0) return list.files[0]!.id;

  const meta: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId ? { parents: [parentId] } : {}),
  };

  const created = await driveRequest<DriveFile>('/drive/v3/files?fields=id', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });

  return created.id;
}

export async function uploadFile(
  accessToken: string,
  folderId: string,
  name: string,
  content: string,
  existingFileId?: string,
): Promise<string> {
  const metadata = JSON.stringify({ name, parents: existingFileId ? undefined : [folderId] });
  const body = new Blob(
    [
      `--boundary\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
      `--boundary\r\nContent-Type: text/markdown\r\n\r\n${content}\r\n`,
      '--boundary--',
    ],
    { type: 'multipart/related; boundary=boundary' },
  );

  const path = existingFileId
    ? `/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id`
    : '/upload/drive/v3/files?uploadType=multipart&fields=id';

  const method = existingFileId ? 'PATCH' : 'POST';

  const file = await driveRequest<DriveFile>(path, accessToken, {
    method,
    headers: { 'Content-Type': 'multipart/related; boundary=boundary' },
    body,
  });

  return file.id;
}

export async function downloadFile(accessToken: string, fileId: string): Promise<string> {
  const res = await fetch(`${BASE}/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive download ${res.status}`);
  return res.text();
}

export async function listFiles(
  accessToken: string,
  folderId: string,
  pageToken?: string,
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const pt = pageToken ? `&pageToken=${pageToken}` : '';
  return driveRequest<ListResponse>(
    `/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc${pt}`,
    accessToken,
  );
}

export async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  await fetch(`${BASE}/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
