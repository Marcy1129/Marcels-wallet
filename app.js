// === Marcel's Multi-Chain Wallet ===

const walletAddress = "0x1985EA6E9c68E1C272d8209f3B478AC2Fdb25c87"; 
const apiKey = "cqt_rQWhgH6fCgDdryrFqkFvrTP3jJHM"; // 👈 your Covalent API key

// List of chains we want to check
const chains = {
    "Ethereum": "eth-mainnet",
    "Base": "base-mainnet",
    "Polygon": "matic-mainnet"
};

async function fetchBalances() {
    const balancesDiv = document.getElementById("balances");
    balancesDiv.innerHTML = "Loading...";

    try {
        balancesDiv.innerHTML = "";
        for (const [chainName, chainId] of Object.entries(chains)) {
            const url = `https://api.covalenthq.com/v1/${chainId}/address/${walletAddress}/balances_v2/?key=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();

            // Show chain name
            balancesDiv.innerHTML += `<h3>${chainName}</h3>`;

            if (data.data && data.data.items) {
                data.data.items
                    .filter(token => token.balance > 0) // only show tokens with balance
                    .forEach(token => {
                        let bal = (token.balance / Math.pow(10, token.contract_decimals)).toFixed(4);
                        balancesDiv.innerHTML += `<p>${bal} ${token.contract_ticker_symbol}</p>`;
                    });
            } else {
                balancesDiv.innerHTML += `<p>No assets found</p>`;
            }
        }
    } catch (err) {
        balancesDiv.innerHTML = "Error loading balances.";
        console.error(err);
    }
}

// Run on load
window.onload = fetchBalances;
