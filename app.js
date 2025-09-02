// Wallet Config
const API_KEY = "cqt_rQWhgH6fCgDdyrFqkFvrTP3jJHM";
const WALLET_ADDRESS = "0x1985E6A6E9c68E1C272d82...";
const CHAINS = [1, 8453, 137, 42161, 56]; 

let provider, signer, connectedAddress;

// Portfolio Fetch
async function fetchPortfolio() {
  let portfolioDiv = document.getElementById("portfolio");
  portfolioDiv.innerHTML = "<p>Loading balances...</p>";

  try {
    let totalUSD = 0;
    let html = `<h3>Portfolio</h3>`;

    for (const chain of CHAINS) {
      const url = `https://api.covalenthq.com/v1/${chain}/address/${WALLET_ADDRESS}/balances_v2/?key=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && data.data && data.data.items) {
        let chainTotal = 0;
        html += `<div class="chain"><h4>${data.data.chain_name}</h4><ul>`;

        data.data.items.forEach(token => {
          if (token.quote > 0.01) {
            chainTotal += token.quote;
            html += `<li>${token.contract_ticker_symbol}: 
              ${(token.balance / (10 ** token.contract_decimals)).toFixed(4)} • 
              US$${token.quote.toFixed(2)}</li>`;
          }
        });

        html += `</ul><b>Chain total: US$${chainTotal.toFixed(2)}</b></div>`;
        totalUSD += chainTotal;
      }
    }

    html += `<h3>Total (all chains): US$${totalUSD.toLocaleString()}</h3>`;
    portfolioDiv.innerHTML = html;

  } catch (err) {
    portfolioDiv.innerHTML = `<p style="color:red;">Error fetching balances</p>`;
    console.error(err);
  }
}

// WalletConnect Integration
async function connectWallet() {
  try {
    const wc = new window.WalletConnect.Client({
      projectId: "your_project_id_here", // from WalletConnect cloud
      relayUrl: "wss://relay.walletconnect.com",
      metadata: {
        name: "OmniWallet Marcel",
        description: "Multi-chain wallet",
        url: "https://yourapp.com",
        icons: ["https://yourapp.com/icon.png"]
      }
    });

    if (!wc.connected) {
      await wc.createSession();
      const uri = wc.uri;
      QRCodeModal.open(uri, () => {
        console.log("QR Code closed");
      });
    }

    wc.on("connect", (error, payload) => {
      if (error) throw error;
      const { accounts } = payload.params[0];
      connectedAddress = accounts[0];
      document.getElementById("connectedWallet").innerText = "Connected: " + connectedAddress;
      QRCodeModal.close();
    });
  } catch (err) {
    console.error("WalletConnect error:", err);
  }
}

// Send Transaction
document.getElementById("sendForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const to = document.getElementById("toAddress").value;
  const amount = document.getElementById("amount").value;
  const token = document.getElementById("tokenSelect").value;
  const status = document.getElementById("status");

  try {
    if (!connectedAddress) {
      status.innerText = "Please connect your wallet first.";
      return;
    }

    if (token === "ETH") {
      status.innerText = `Ready to send ${amount} ETH to ${to}. Sign in your wallet app.`;
      // actual signing handled inside mobile wallet
    } else {
      status.innerText = "Token transfers coming soon.";
    }
  } catch (err) {
    console.error(err);
    status.innerText = "Error sending transaction.";
  }
});

// PWA Install
function installPWA() {
  alert("To install, tap your browser menu > 'Add to Home Screen'.");
}

// Button events
document.getElementById("connectBtn").addEventListener("click", connectWallet);

// Auto fetch
window.onload = fetchPortfolio;
