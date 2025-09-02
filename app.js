async function sendTransaction() {
  const recipient = document.getElementById("recipient").value.trim();
  const amount = document.getElementById("amount").value.trim();
  const statusEl = document.getElementById("status");

  if (!recipient || !amount) {
    statusEl.innerText = "⚠️ Please enter recipient and amount.";
    return;
  }

  try {
    if (typeof window.ethereum === "undefined") {
      statusEl.innerText = "⚠️ No wallet provider found (MetaMask / Rainbow).";
      return;
    }

    // Request wallet connection
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // Create provider and signer
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // Send transaction
    const tx = await signer.sendTransaction({
      to: recipient,
      value: ethers.utils.parseEther(amount)
    });

    statusEl.innerText = `✅ Transaction sent!\nHash: ${tx.hash}`;
    console.log("Transaction:", tx);

  } catch (err) {
    console.error(err);
    statusEl.innerText = "❌ Error: " + err.message;
  }
}
