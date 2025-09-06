// Set your defaults here. App also saves to localStorage.
window.MARCEL = {
  // TODO: Paste YOUR wallet address below (0x...)
  DEFAULT_ADDRESS: "0x0000000000000000000000000000000000000000",
  // Optional: set in Settings → Secrets → Actions as COVALYE_API_KEY, or hardcode here for local tests
  COVALYE_API_KEY: "",
  // Password gate: default is "marcel123" (SHA-256)
  PASSWORD_SHA256: "b3f4f3cdf8aeabf56d2e392f1bf62b219c34130ed5e2c47842d756efbc7c2a26"
};
// To change the password:
// 1) Visit https://passwordsgenerator.net/sha256-hash-generator/ (or run crypto.subtle in browser)
// 2) Replace PASSWORD_SHA256 with the SHA-256 of your new password
