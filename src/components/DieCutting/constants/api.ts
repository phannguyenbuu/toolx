export const apiUrl = (path: string = ''): string => {
  const cleanPath = String(path).replace(/^\/+/, '');
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
  if (!cleanPath) return publicUrl || '/';
  return publicUrl ? `${publicUrl}/${cleanPath}` : `/${cleanPath}`;
};
