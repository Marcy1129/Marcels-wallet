const address = "0x1985...c87"; // your wallet address
const covalentApiKey = "cqt_xxxxx"; // your Covalent API key
const baseUrl = "https://api.covalenthq.com/v1";

async function fetchAssets() {
  document.getElementById("address").innerText = `Address: ${address}`;
  document.getElementById("balance").innerText = "Balance: Loading...";
  document.getElementById("assets").innerText = "Assets: Loading...";

  try {
    const chains = [1, 8453]; // Ethereum + Base (add more chain IDs as needed)
    let allTokens = [];

    for (let chain of chains) {
      const url = `${baseUrl}/${chain}/address/${address}/balances_v2/?key=${covalentApiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && data.data && data.data.items) {
        allTokens = allTokens.concat(data.data.items);
      }
    }

    // Calculate total balance (in USD if available)
    let balanceText = "Unknown";
    let assetsText = "";

    if (allTokens.length > 0) {
      let totalUsd = 0;
      let tokensList = [];

      allTokens.forEach(token => {
        if (token.quote) totalUsd += token.quote;
        tokensList.push(`${token.contract_ticker_symbol}: ${token.balance / Math.pow(10, token.contract_decimals)}`);
      });

      balanceText = `$${totalUsd.toFixed(2)} (USD)`;
      assetsText = tokensList.join(", ");
    }

    document.getElementById("balance").innerText = `Balance: ${balanceText}`;
    document.getElementById("assets").innerText = `Assets: ${assetsText}`;
  } catch (err) {
    document.getElementById("balance").innerText = "Error fetching balance";
    document.getElementById("assets").innerText = "Error fetching assets";
    console.error(err);
  }
}

function sendTransaction() {
  alert("Send transaction flow... (to be implemented)");
}

function receiveFunds() {
  alert(`Receive funds at address: ${address}`);
}

function refreshAssets() {
  fetchAssets();
}

window.onload = fetchAssets;
