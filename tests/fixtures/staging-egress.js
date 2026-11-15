// Test-runtime wrapper, not application authorization logic. All application
// HTTP requests must remain on the owned Docker gateway; redirects are refused.
const bf21LocalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, options = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.origin !== 'http://api:8080' || url.username || url.password) {
    throw Error('staging_server_destination_refused');
  }
  return bf21LocalFetch(input, {...options, redirect: 'error'});
};
