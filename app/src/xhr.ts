export type RequestResult = {
  succeeded: boolean;
  status: number;
  durationMs: number;
  nativeError: string | null;
};

const readNativeError = (request: XMLHttpRequest): string | null => {
  try {
    return request.responseText || null;
  } catch {
    return null;
  }
};

export const sendRequest = (
  method: 'GET' | 'POST',
  url: string,
  body?: unknown,
): Promise<RequestResult & { responseText: string }> =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const request = new XMLHttpRequest();

    request.onload = () =>
      resolve({
        succeeded: request.status >= 200 && request.status < 300,
        status: request.status,
        durationMs: Date.now() - startedAt,
        nativeError: null,
        responseText: request.responseText,
      });
    request.onerror = () =>
      resolve({
        succeeded: false,
        status: 0,
        durationMs: Date.now() - startedAt,
        nativeError: readNativeError(request),
        responseText: '',
      });

    request.open(method, url);
    if (body !== undefined) request.setRequestHeader('Content-Type', 'application/json');
    request.send(body === undefined ? undefined : JSON.stringify(body));
  });
