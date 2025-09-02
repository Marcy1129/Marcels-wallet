// app.js
const walletAddress = "0x1985EA6E9c68E1C272d8209f3B478AC2Fdb25c87";
const apiKey = "cqt_rQWhgH6fCgDdryrFqkFvrTP3jJHM";

// Covalent API endpoint for balances on Ethereum mainnet (chain_id = 1)
const covalentUrl = `https://api.covalenthq.com/v1/1/address/${walletAddress}/balances_v2/?key=${apiKey}`;

async function fetchAssets() {
  try {
    const response = await fetch(covalentUrl);
    const data = await response.json();

    if (!data.data || !data.data.items) {
      document.getElementById("assets").innerHTML = "<p>No assets found.</p>";
      return;
    }

    const assets = data.data.items;
    let html = "";

    assets.forEach((asset) => {
      // Skip tokens with zero balance
      if (Number(asset.balance) === 0) return;

      const balance = (Number(asset.balance) / Math.pow(10, asset.contract_decimals)).toFixed(4);
      html += `
        <div class="asset-card">
          <img src="${asset.logo_url || 'https://via.placeholder.com/32'}" alt="${asset.contract_ticker_symbol}" />
          <div>
            <p><strong>${asset.contract_name || "Unknown Token"}</strong> (${asset.contract_ticker_symbol})</p>
            <p>Balance: ${balance}</p>
          </div>
        </div>
      `;
    });

    document.getElementById("assets").innerHTML = html || "<p>No assets with balance.</p>";
  } catch (err) {
    console.error("Error fetching assets:", err);
    document.getElementById("assets").innerHTML = "<p>Failed to load assets.</p>";
  }
}

// Run fetch on page load
window.onload = fetchAssets;
