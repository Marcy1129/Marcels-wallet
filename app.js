
'use strict';

const USER_ADDRESS = "0x1985EA6E9c68E1C272d8209f3B478AC2Fdb25c87".toLowerCase();

const CHAINS = {
  base:    { name: "Base",     chainId: 8453,  symbol: "ETH",  nativeId: "ethereum", rpc: "https://mainnet.base.org" },
  ethereum:{ name: "Ethereum", chainId: 1,     symbol: "ETH",  nativeId: "ethereum", rpc: "https://cloudflare-eth.com" },
  bsc:     { name: "BSC",      chainId: 56,    symbol: "BNB",  nativeId: "binancecoin", rpc: "https://bsc-dataseed.binance.org" },
  polygon: { name: "Polygon",  chainId: 137,   symbol: "MATIC",nativeId: "matic-network", rpc: "https://polygon-rpc.com" },
};

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

let priceCache = {};

let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'inline-block';
});
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
}

const fmtUSD = (n) => '$' + (Number(n || 0).toLocaleString(undefined, {maximumFractionDigits: 2}));
const fmtToken = (n, decimals=4) => Number(n || 0).toLocaleString(undefined, {maximumFractionDigits: decimals});

async function fetchNativePrices() {
  try {
    const ids = ['ethereum','binancecoin','matic-network'];
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
    const res = await fetch(url);
    const data = await res.json();
    priceCache['ethereum'] = data['ethereum']?.usd || 0;
    priceCache['binancecoin'] = data['binancecoin']?.usd || 0;
    priceCache['matic-network'] = data['matic-network']?.usd || 0;
  } catch (e) {
    console.warn('Price fetch failed', e);
  }
}

async function loadTokenList(chainKey) {
  const res = await fetch(`./tokenlists/${chainKey}.json`);
  return res.json();
}

async function getProvider(chainKey) {
  const rpc = CHAINS[chainKey].rpc;
  return new ethers.JsonRpcProvider(rpc);
}

async function getNativeBalance(chainKey) {
  const provider = await getProvider(chainKey);
  const bal = await provider.getBalance(USER_ADDRESS);
  return ethers.formatEther(bal);
}

async function getTokenBalance(chainKey, token) {
  try {
    const provider = await getProvider(chainKey);
    const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
    const bal = await contract.balanceOf(USER_ADDRESS);
    const value = ethers.formatUnits(bal, token.decimals);
    return parseFloat(value);
  } catch(e) {
    console.warn('token balance error', chainKey, token.symbol, e);
    return 0;
  }
}

function usdFor(chainKey, symbol, amount) {
  const stable = ['USDC','USDT','DAI'];
  if (stable.includes(symbol)) return amount * 1.0;
  if (symbol === 'ETH') return amount * (priceCache['ethereum'] || 0);
  if (symbol === 'BNB') return amount * (priceCache['binancecoin'] || 0);
  if (symbol === 'MATIC') return amount * (priceCache['matic-network'] || 0);
  return 0;
}

async function renderChain(chainKey, tokensDivId, valueBadgeId) {
  const native = await getNativeBalance(chainKey);
  const nativeSymbol = CHAINS[chainKey].symbol;
  const nativeUsd = usdFor(chainKey, nativeSymbol, parseFloat(native));
  let totalUsd = nativeUsd;

  const tokensDiv = document.getElementById(tokensDivId);
  tokensDiv.innerHTML = '';
  tokensDiv.insertAdjacentHTML('beforeend', `
    <div class="token">
      <div><strong>${nativeSymbol}</strong> <span class="muted small">(${CHAINS[chainKey].name})</span></div>
      <div class="row-center"><div>${fmtToken(native)}</div><div class="badge">${fmtUSD(nativeUsd)}</div></div>
    </div>
  `);

  const list = await loadTokenList(chainKey);
  for (const t of list) {
    const bal = await getTokenBalance(chainKey, t);
    if (bal > 0) {
      const usd = usdFor(chainKey, t.symbol, bal);
      totalUsd += usd;
      tokensDiv.insertAdjacentHTML('beforeend', `
        <div class="token">
          <div><strong>${t.symbol}</strong></div>
          <div class="row-center"><div>${fmtToken(bal)}</div><div class="badge">${fmtUSD(usd)}</div></div>
        </div>
      `);
    }
  }
  document.getElementById(valueBadgeId).textContent = fmtUSD(totalUsd);
  return totalUsd;
}

async function loadAll() {
  document.getElementById('status').textContent = 'Fetching prices…';
  await fetchNativePrices();
  document.getElementById('status').textContent = 'Querying chains…';

  let total = 0;
  total += await renderChain('base', 'baseTokens', 'baseValue');
  total += await renderChain('ethereum', 'ethTokens', 'ethValue');
  total += await renderChain('bsc', 'bscTokens', 'bscValue');
  total += await renderChain('polygon', 'polygonTokens', 'polygonValue');

  document.getElementById('totalValue').textContent = fmtUSD(total);
  document.getElementById('status').textContent = 'Up to date';
}


// ===== AES-GCM LOCAL STORAGE (passcode-based) =====
const ENC_STORAGE_KEY = 'encKey.v1';

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
function fromB64(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
function toB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
async function deriveKeyFromPasscode(passcode, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passcode), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt','decrypt']
  );
}
async function encryptPrivateKey(priv, passcode) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKeyFromPasscode(passcode, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(priv));
  const payload = { iv: toB64(iv), salt: toB64(salt), ct: toB64(ct) };
  localStorage.setItem(ENC_STORAGE_KEY, JSON.stringify(payload));
  return true;
}
async function decryptPrivateKey(passcode) {
  const payloadStr = localStorage.getItem(ENC_STORAGE_KEY);
  if (!payloadStr) throw new Error('No saved key found');
  const payload = JSON.parse(payloadStr);
  const iv = fromB64(payload.iv);
  const salt = fromB64(payload.salt);
  const ct = fromB64(payload.ct);
  const key = await deriveKeyFromPasscode(passcode, salt);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  const dec = new TextDecoder().decode(pt);
  return dec;
}

// SEND
const sendChainEl = document.getElementById('sendChain');
const sendTokenEl = document.getElementById('sendToken');
const recipientEl = document.getElementById('recipient');
const amountEl = document.getElementById('amount');
const privkeyEl = document.getElementById('privkey');
const sendBtn = document.getElementById('sendBtn');
const sendStatus = document.getElementById('sendStatus');

async function populateSendTokens() {
  const chainKey = sendChainEl.value;
  const list = await loadTokenList(chainKey);
  sendTokenEl.innerHTML = '<option value="native">Native</option>' + list.map(t => `<option value="${t.address}|${t.decimals}|${t.symbol}">${t.symbol}</option>`).join('');
}
sendChainEl.addEventListener('change', populateSendTokens);
populateSendTokens();

async function sendTx() {
  try {
    sendStatus.textContent = 'Preparing transaction…';
    const chainKey = sendChainEl.value;
    const to = recipientEl.value.trim();
    const amount = amountEl.value.trim();
    if (!to || !amount) throw new Error('Recipient and amount are required');
    const provider = await getProvider(chainKey);

    let pk = privkeyEl.value.trim();
    if (!pk && window.__UNLOCKED_PK) { pk = window.__UNLOCKED_PK; }
    if (!pk) throw new Error('No key available. Paste it or unlock saved key.');
    const wallet = new ethers.Wallet(pk, provider);

    const tokenSel = sendTokenEl.value;
    if (tokenSel === 'native') {
      const value = ethers.parseEther(amount);
      const tx = await wallet.sendTransaction({ to, value });
      sendStatus.textContent = 'Broadcasted: ' + tx.hash + ' (waiting…)';
      const receipt = await tx.wait();
      sendStatus.textContent = '✅ Confirmed in block ' + receipt.blockNumber;
    } else {
      const [addr, decimals, symbol] = tokenSel.split('|');
      const contract = new ethers.Contract(addr, ERC20_ABI, wallet);
      const value = ethers.parseUnits(amount, parseInt(decimals));
      const tx = await contract.transfer(to, value);
      sendStatus.textContent = `Broadcasted ${symbol}: ${tx.hash} (waiting…)`;
      const receipt = await tx.wait();
      sendStatus.textContent = '✅ Token transfer confirmed in block ' + receipt.blockNumber;
    }
  } catch (e) {
    console.error(e);
    sendStatus.textContent = '❌ ' + (e.message || e.toString());
  }
}
sendBtn.addEventListener('click', sendTx);

// Copy address
const copyBtn = document.getElementById('copyAddr');
const copyStatus = document.getElementById('copyStatus');
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText("0x1985EA6E9c68E1C272d8209f3B478AC2Fdb25c87");
    copyStatus.textContent = 'Copied!';
    setTimeout(() => copyStatus.textContent = '', 1500);
  } catch (e) {
    copyStatus.textContent = 'Could not copy automatically.';
  }
});


// Save / Unlock key buttons
const saveKeyBtn = document.getElementById('saveKeyBtn');
const unlockBtn = document.getElementById('unlockBtn');
const passcodeEl = document.getElementById('passcode');

saveKeyBtn.addEventListener('click', async () => {
  try {
    const pk = privkeyEl.value.trim();
    const pw = passcodeEl.value.trim();
    if (!pk) throw new Error('Paste a private key to save');
    if (!pw) throw new Error('Enter a passcode');
    sendStatus.textContent = 'Encrypting & saving…';
    await encryptPrivateKey(pk, pw);
    // clear plaintext
    privkeyEl.value = '';
    sendStatus.textContent = '✅ Key encrypted & saved locally';
  } catch (e) {
    sendStatus.textContent = '❌ ' + (e.message || e.toString());
  }
});

unlockBtn.addEventListener('click', async () => {
  try {
    const pw = passcodeEl.value.trim();
    if (!pw) throw new Error('Enter your passcode');
    sendStatus.textContent = 'Unlocking…';
    const pk = await decryptPrivateKey(pw);
    window.__UNLOCKED_PK = pk;
    sendStatus.textContent = '🔓 Key unlocked for this session';
  } catch (e) {
    sendStatus.textContent = '❌ ' + (e.message || e.toString());
  }
});

// Render QR code
function renderQR() {
  const canvas = document.getElementById('qrCanvas');
  if (canvas && window.QRCode) {
    QRCode.toCanvas(canvas, "0x1985EA6E9c68E1C272d8209f3B478AC2Fdb25c87", { errorCorrectionLevel: 'M' }, function (err) {
      if (err) console.error(err);
    });
  }
}

loadAll();
renderQR();
