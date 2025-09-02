// ====== Config ======
const COVALENT_KEY = "cqt_rQWhgH6fCgDdryrFqkFvrTP3jJHM";

// Public RPCs (stable, no key required)
const RPCS = {
  1:    "https://cloudflare-eth.com",   // Ethereum
  8453: "https://mainnet.base.org",     // Base
  137:  "https://polygon-rpc.com"       // Polygon
};

// Common ERC20s on Ethereum mainnet (you can extend per-chain later)
const ERC20 = {
  USDC: { chainId: 1, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  USDT: { chainId: 1, address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
  DAI:  { chainId: 1, address: "0x6B175474E89094C44Da98b954EedeAC495271d0F" },
};
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

// Chains we’ll show in the balances list
const CHAINS = { Ethereum: 1, Base: 8453, Polygon: 137 };

// ====== State ======
let signer = null;        // ethers.Signer (from MetaMask or Wallet)
let provider = null;      // ethers.Provider for current chain
let address = null;       // current connected address
let mode = "direct";      // 'direct' or 'metamask'

// ====== DOM ======
const $ = (id) => document.getElementById(id);

// ====== Helpers ======
function setAddressUI(addr) {
  $("wallet-address").textContent = addr ? addr : "—";
  if (addr) {
    QRCode.toCanvas($("qr"), addr, e => e && console.error(e));
  } else {
    $("qr").src = "";
  }
}

function ethersProvider(chainId) {
  const url = RPCS[chainId];
  return new ethers.providers.JsonRpcProvider(url);
}

// ====== Connect Logic ======
async function connect() {
  mode = $("mode").value;
  const chainId = Number($("chain").value);

  if (mode === "metamask") {
    if (!window.ethereum) { alert("Install MetaMask first."); return; }
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("wallet_switchEthereumChain", [{ chainId: "0x" + chainId.toString(16) }]).catch(() => {});
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    address = await signer.getAddress();
  } else {
    // DIRECT mode (no MetaMask) — use pasted private key locally
    const pk = $("privkey").value.trim();
    if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
      alert("Paste a valid private key starting with 0x...");
      return;
    }
    provider = ethersProvider(chainId);
    signer = new ethers.Wallet(pk, provider);
    address = await signer.getAddress();
  }

  setAddressUI(address);
  await renderBalances(address);

  // Persist nothing sensitive; address only for UX
  sessionStorage.setItem("lastMode", mode);
  sessionStorage.setItem("lastChain", String(chainId));
  sessionStorage.setItem("lastAddr", address);
}

function disconnect() {
  signer = null; provider = null; address = null;
  $("privkey").value = "";
  setAddressUI(null);
  $("assets").innerHTML = `<p class="muted">Disconnected.</p>`;
  sessionStorage.clear();
}

// ====== Balances via Covalent ======
async function fetchChainBalances(chainName, chainId, addr) {
  const url = `https://api.covalenthq.com/v1/${chainId}/address/${addr}/balances_v2/?key=${COVALENT_KEY}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  return { chainName, items: data?.data?.items || [] };
}

async function renderBalances(addr) {
  const container = $("assets");
  container.innerHTML = `<p class="muted">Loading balances...</p>`;

  const results = await Promise.all(
    Object.entries(CHAINS).map(([name, id]) => fetchChainBalances(name, id, addr))
  );

  container.innerHTML = "";

  let any = false;
  for (const { chainName, items } of results) {
    const nonZero = (items || []).filter(t => Number(t.balance) > 0);
    if (!nonZero.length) continue;
    any = true;

    const title = document.createElement("div");
    title.className = "chain-title";
    title.textContent = chainName;
    container.appendChild(title);

    nonZero.forEach(t => {
      const dec = t.contract_decimals || 0;
      const bal = Number(t.balance) / (10 ** dec);
      const row = document.createElement("div");
      row.className = "asset";
      row.innerHTML = `
        <div>
          <span class="pill">${t.contract_ticker_symbol || "UNKNOWN"}</span>
          <span class="muted">${t.contract_name || ""}</span>
        </div>
        <div class="mono">${bal.toFixed(6)}</div>
      `;
      container.appendChild(row);
    });
  }

  if (!any) {
    container.innerHTML = `<p class="muted">No assets found across chains.</p>`;
  }
}

// ====== Send (ETH or ERC20) ======
async function send() {
  if (!signer || !address) { alert("Connect first."); return; }

  const asset = $("token-select").value;
  const to = $("send-to").value.trim();
  const amount = $("send-amount").value.trim();

  if (!to || !amount) { alert("Enter recipient and amount."); return; }

  try {
    if (asset === "ETH") {
      // Native coin on current selected chain
      const tx = await signer.sendTransaction({
        to,
        value: ethers.utils.parseEther(amount)
      });
      alert("Transaction sent: " + tx.hash);
    } else {
      // ERC20 on Ethereum mainnet (extend as needed)
      const { chainId, address: tokenAddr } = ERC20[asset];
      // Ensure signer is on correct chain for token
      if (mode === "metamask" && provider && provider.send) {
        await provider.send("wallet_switchEthereumChain", [{ chainId: "0x" + chainId.toString(16) }]).catch(()=>{});
      } else {
        // Direct mode: rebuild signer with proper chain if needed
        const pk = $("privkey").value.trim();
        if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) throw new Error("Invalid private key");
        const tokenProvider = ethersProvider(chainId);
        signer = new ethers.Wallet(pk, tokenProvider);
      }

      const erc20 = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
      const decimals = await erc20.decimals();
      const amountUnits = ethers.utils.parseUnits(String(amount), decimals);
      const tx = await erc20.transfer(to, amountUnits);
      alert(`${asset} sent: ` + tx.hash);
    }
  } catch (e) {
    console.error(e);
    alert("Send failed: " + (e?.message || e));
  }
}

// ====== Events ======
document.addEventListener("DOMContentLoaded", () => {
  // Restore last selections (non-sensitive)
  const lastMode = sessionStorage.getItem("lastMode");
  const lastChain = sessionStorage.getItem("lastChain");
  if (lastMode) $("mode").value = lastMode;
  if (lastChain) $("chain").value = lastChain;

  $("connect-btn").addEventListener("click", connect);
  $("disconnect-btn").addEventListener("click", disconnect);
  $("refresh-btn").addEventListener("click", async () => {
    if (!address) { alert("Connect first."); return; }
    await renderBalances(address);
  });
  $("send-btn").addEventListener("click", send);
});
