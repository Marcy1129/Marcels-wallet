// 🔑 Your Covalent API Key
const COVALENT_API_KEY = "cqt_rQWhgH6fCgDdryrFqkFvrTP3jJHM";

// Known token addresses (Ethereum mainnet)
const tokenAddresses = {
  "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "DAI": "0x6B175474E89094C44Da98b954EedeAC495271d0F"
};

// Simplified ERC20 ABI
const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

// Start wallet connection + balances
async function initWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask or another Web3 wallet.");
    return;
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  document.getElementById("wallet-address").innerText = address;

  // Generate QR code
  QRCode.toCanvas(document.getElementById("qrcode"), address, function (error) {
    if (error) console.error(error);
  });

  // Fetch balances
  fetchBalances(address, provider);
}

// Fetch ETH + Token balances
async function fetchBalances(address, provider) {
  const balancesEl = document.getElementById("balances");
  balancesEl.innerHTML = "";

  // ETH balance
  const ethBalance = await provider.getBalance(address);
  const ethFormatted = ethers.utils.formatEther(ethBalance);
  const liEth = document.createElement("li");
  liEth.innerText = `ETH: ${ethFormatted}`;
  balancesEl.appendChild(liEth);

  // Tokens (USDC, USDT, DAI)
  for (const [symbol, tokenAddress] of Object.entries(tokenAddresses)) {
    try {
      const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
      const decimals = await token.decimals();
      const rawBal = await token.balanceOf(address);
      const formatted = ethers.utils.formatUnits(rawBal, decimals);

      const li = document.createElement("li");
      li.innerText = `${symbol}: ${formatted}`;
      balancesEl.appendChild(li);
    } catch (err) {
      console.error(`Error fetching ${symbol}:`, err);
    }
  }
}

// Send ETH or Token
document.getElementById("send-btn").addEventListener("click", async () => {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const recipient = document.getElementById("send-to").value.trim();
    const amount = document.getElementById("send-amount").value.trim();
    const token = document.getElementById("token-select").value;

    if (!recipient || !amount) {
      alert("Please enter recipient and amount.");
      return;
    }

    if (token === "ETH") {
      const tx = await signer.sendTransaction({
        to: recipient,
        value: ethers.utils.parseEther(amount)
      });
      alert("ETH Transaction Sent! Hash: " + tx.hash);
    } else {
      const tokenAddress = tokenAddresses[token];
      const erc20 = new ethers.Contract(tokenAddress, erc20Abi, signer);
      const decimals = await erc20.decimals();
      const amountInUnits = ethers.utils.parseUnits(amount, decimals);

      const tx = await erc20.transfer(recipient, amountInUnits);
      alert(`${token} Transaction Sent! Hash: ` + tx.hash);
    }
  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  }
});

// Run wallet on load
initWallet();
