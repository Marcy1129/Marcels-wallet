const API_KEY = "cqt_rQWhgH6fCgDdryrFqkFvrTP3jJHM";
const WALLET_ADDRESS = "0x1985EA6E9c68E1C272d8209f3B478AC2Fdb25c87";

async function fetchWallet() {
  try {
    // Call Covalent API
    const url = `https://api.covalenthq.com/v1/1/address/${WALLET_ADDRESS}/balances_v2/?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    // Show wallet address
    document.getElementById("wallet-address").innerText = WALLET_ADDRESS;

    // Clear assets list
    const assetsList = document.getElementById("assets-list");
    assetsList.innerHTML = "";

    // Loop through assets
    data.data.items.forEach(token => {
      const balance = (token.balance / Math.pow(10, token.contract_decimals)).toFixed(4);
      const li = document.createElement("li");
      li.textContent = `${token.contract_ticker_symbol}: ${balance}`;
      assetsList.appendChild(li);
    });

  } catch (error) {
    console.error("Error fetching wallet:", error);
    document.getElementById("wallet-address").innerText = "Error loading wallet";
    document.getElementById("assets-list").innerHTML = "<li>Error loading assets</li>";
  }
}

// Run on page load
fetchWallet();
