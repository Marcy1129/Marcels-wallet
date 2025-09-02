// =======================
// Marcel's Wallet Script
// =======================

// 🔑 Your Covalent API key
const API_KEY = "cqt_rQWhgH6fCgDdryrFqkFvrTP3jJHM";

// 🪙 Your wallet address
const WALLET_ADDRESS = "0x1985EA6E9c68E1C272d8209f3B478AC2Fdb25c87";

// 🌐 Ethereum Mainnet (chain_id = 1)
// (We can add Base, Polygon, etc later if you want multichain)
const CHAIN_ID = 1;

// Construct API URL
const url = `https://api.covalenthq.com/v1/${CHAIN_ID}/address/${WALLET_ADDRESS}/balances_v2/?key=${API_KEY}`;

// Fetch and render assets
function fetchAssets() {
  fetch(url)
    .then(response => response.json())
    .then(data => {
      console.log("🔍 Raw API Data:", data);

      const assetsDiv = document.getElementById("asset-list");
      assetsDiv.innerHTML = ""; // Clear before rendering

      if (!data || !data.data || !data.data.items) {
        assetsDiv.innerHTML = "<p>No assets found.</p>";
        return;
      }

      data.data.items.forEach(token => {
        if (token.balance > 0) {
          const balance = (token.balance / Math.pow(10, token.contract_decimals)).toFixed(4);

          const card = document.createElement("div");
          card.className = "asset-card";

          const logo = document.createElement("img");
          logo.className = "asset-logo";
          logo.src = token.logo_url || "https://via.placeholder.com/40";
          logo.alt = token.contract_ticker_symbol;

          const info = document.createElement("div");
          info.className = "asset-info";
          info.innerHTML = `
            <div class="asset-name">${token.contract_name} (${token.contract_ticker_symbol})</div>
            <div class="asset-balance">${balance}</div>
          `;

          card.appendChild(logo);
          card.appendChild(info);
          assetsDiv.appendChild(card);
        }
      });
    })
    .catch(error => {
      console.error("❌ Error fetching assets:", error);
      document.getElementById("asset-list").innerHTML =
        "<p style='color:red;'>Error fetching assets. Check console.</p>";
    });
}

// Run automatically when page loads
document.addEventListener("DOMContentLoaded", fetchAssets);
