// Check the response before displaying it: some tile services return PNG error pages.
export async function streetTile(url, signal, fetcher = fetch) {
  const response = await fetcher(url, {
    signal, credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin',
  });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png')) {
    throw Error('Street tiles unavailable');
  }
  return response.blob();
}
