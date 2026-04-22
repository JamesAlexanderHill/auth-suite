/**
 * Remap a request to a given base URL
 * 
 * @param input - A Request, URL or string representation of a Url
 * @param baseUrl - What to remap to, 
 * @returns A remapped Request or URL (string get converted to URL)
 */
export default function rewriteUrlWithBase(input: RequestInfo | URL, baseUrl: string): Request | URL {
    if (typeof input === 'string' || input instanceof URL) {
        return new URL(input, baseUrl);
    }

    const url = new URL(input.url, baseUrl);

    // TODO: figure out how to copy values from Request into RequestInit
    return new Request(url, input);
}
