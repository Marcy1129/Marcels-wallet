// ----------------- CONFIG -----------------
const WALLET = "0x1985EA6E9c68E1C272d8209f3B478AC2Fdb25c87"; // your wallet
const API_KEY = "cqt_rQWhgH6fCgDdryrFqkFvrTP3jJHM";          // CovalentHQ API
const PRIVATE_KEY = "0xYOUR_PRIVATE_KEY";                   // 🔑 replace with real

// Chains
const CHAINS = {
  "Ethereum": { id: 1, rpc: "https://mainnet.infura.io/v3/YOUR_INFURA_ID" },
  "Base":     { id: 8453, rpc: "https://mainnet.base.org" },
  "Polygon":  { id: 137, rpc: "https://polygon-rpc.com" }
};

// ----------------- Providers & Wallet -----------------
function getWallet(chain) {
  const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
  return new ethers.Wallet(PRIVATE_KEY, provider);
}

// ----------------- ERC20 ABI -----------------
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

// ----------------- Fetch Assets -----------------
async function fetchChain(name, chain) {
  const url = `https://api.covalenthq.com/v1/${chain.id}/address/${WALLET}/balances_v2/?key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return { name, items: data.data?.items || [] };
}

async function fetchAllChains() {
  const section = document.getElementById("assets");
  section.innerHTML = "<p>Loading assets...</p>";

  const results = await Promise.all(
    Object.entries(CHAINS).map(([n, chain]) => fetchChain(n, chain))
  );

  section.innerHTML = "";

  results.forEach(({ name, items }) => {
    const nonZero = items.filter(t => Number(t.balance) > 0);
    if (nonZero.length) {
      const heading = document.createElement("h3");
      heading.textContent = name;
      section.appendChild(heading);

      nonZero.forEach(t => {
        const bal = Number(t.balance) / (10 ** t.contract_decimals);
        const div = document.createElement("div");
        div.textContent = `${t.contract_ticker_symbol}: ${bal.toFixed(4)}`;
        div.dataset.contract = t.contract_address;
        div.dataset.chain = name;
        div.dataset.symbol = t.contract_ticker_symbol;

        // Make asset clickable → autofills send form
        div.addEventListener("click", () => {
          document.getElementById("send-token").value = t.contract_address;
          document.getElementById("send-chain").value =
            name.toLowerCase() === "ethereum" ? "ethereum" :
            name.toLowerCase() === "base" ? "base" : "polygon";
        });

        section.appendChild(div);
      });
    }
  });

  if (section.innerHTML === "") {
    section.innerHTML = "<p>No assets found across chains.</p>";
  }

  document.getElementById("wallet-address").textContent = WALLET;

  // QR
  document.getElementById("qr").src =
    `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${WALLET}`;
}

// ----------------- Direct Send (ETH & ERC20) -----------------
async function sendDirect() {
  const to = document.getElementById("send-to").value;
  const amount = document.getElementById("send-amount").value;
  const chainChoice = document.getElementById("send-chain").value;
  const token = document.getElementById("send-token").value;

  if (!to || !amount) {
    alert("Enter recipient and amount.");
    return;
  }

  try {
    const chain =
      chainChoice === "ethereum" ? CHAINS["Ethereum"] :
      chainChoice === "base"     ? CHAINS["Base"]     :
      CHAINS["Polygon"];

    const wallet = getWallet(chain);

    if (token === "ETH") {
      // Native coin
      const tx = await wallet.sendTransaction({
        to: to,
        value: ethers.utils.parseEther(amount)
      });
      alert(`ETH tx sent! Hash: ${tx.hash}`);
    } else {
      // ERC20
      const contract = new ethers.Contract(token, ERC20_ABI, wallet);
      const decimals = await contract.decimals();
      const tx = await contract.transfer(
        to,
        ethers.utils.parseUnits(amount, decimals)
      );
      alert(`${await contract.symbol()} tx sent! Hash: ${tx.hash}`);
    }
  } catch (err) {
    console.error(err);
    alert("Transaction failed: " + err.message);
  }
}

// ----------------- INIT -----------------
document.addEventListener("DOMContentLoaded", async () => {
  await fetchAllChains();

  // Build token dropdown
  const tokenSelect = document.getElementById("send-token");
  tokenSelect.innerHTML = `<option value="ETH">ETH (native)</option>`;

  const results = await Promise.all(
    Object.entries(CHAINS).map(([n, chain]) => fetchChain(n, chain))
  );

  results.forEach(({ name, items }) => {
    items.forEach(t => {
      if (Number(t.balance) > 0 && t.contract_address !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        const option = document.createElement("option");
        option.value = t.contract_address;
        option.textContent = `${t.contract_ticker_symbol} (${name})`;
        tokenSelect.appendChild(option);
      }
    });
  });
});

document.getElementById("send-btn").addEventListener("click", sendDirect);
