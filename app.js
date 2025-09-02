// ----------------- CONFIG -----------------
const WALLET = "0x1985EA6E9c68E1C272d8209f3B478AC2Fdb25c87"; // your wallet address
const API_KEY = "cqt_rQWhgH6fCgDdryrFqkFvrTP3jJHM"; // CovalentHQ key
const PRIVATE_KEY = "0xYOUR_PRIVATE_KEY"; // 🔑 replace with your wallet private key

// Chains for balances
const CHAINS = {
  "Ethereum": 1,
  "Base": 8453,
  "Polygon": 137
};

// Ethers.js provider
const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// ----------------- Fetch Assets -----------------
async function fetchChain(chainName, chainId) {
  const url = `https://api.covalenthq.com/v1/${chainId}/address/${WALLET}/balances_v2/?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return { chainName, items: data.data?.items || [] };
}

async function fetchAllChains() {
  const section = document.getElementById("assets");
  section.innerHTML = "<p>Loading assets...</p>";

  const results = await Promise.all(
    Object.entries(CHAINS).map(([n, id]) => fetchChain(n, id))
  );

  section.innerHTML = "";

  results.forEach(({ chainName, items }) => {
    const nonZero = items.filter(t => Number(t.balance) > 0);
    if (nonZero.length) {
      const heading = document.createElement("h3");
      heading.textContent = chainName;
      section.appendChild(heading);

      nonZero.forEach(t => {
        const bal = Number(t.balance) / (10 ** t.contract_decimals);
        const div = document.createElement("div");
        div.textContent = `${t.contract_ticker_symbol}: ${bal.toFixed(4)}`;
        section.appendChild(div);
      });
    }
  });

  if (section.innerHTML === "") {
    section.innerHTML = "<p>No assets found across chains.</p>";
  }

  document.getElementById("wallet-address").textContent = WALLET;

  // Generate QR
  document.getElementById("qr").src =
    `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${WALLET}`;
}

// ----------------- Direct Send -----------------
async function sendDirect() {
  const to = document.getElementById("send-to").value;
  const amount = document.getElementById("send-amount").value;

  if (!to || !amount) {
    alert("Enter recipient and amount.");
    return;
  }

  try {
    const tx = await wallet.sendTransaction({
      to: to,
      value: ethers.utils.parseEther(amount)
    });

    alert(`Transaction sent! Hash: ${tx.hash}`);
  } catch (err) {
    console.error(err);
    alert("Transaction failed: " + err.message);
  }
}

// Init
document.addEventListener("DOMContentLoaded", fetchAllChains);
document.getElementById("send-btn").addEventListener("click", sendDirect);
