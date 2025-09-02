// ===== Utilities =====
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function fmtAddr(addr){
  return addr ? addr.slice(0,6) + "..." + addr.slice(-4) : "";
}

function fmtAmt(val, dec=18){
  if(!val) return "0";
  const bn = BigInt(val);
  const whole = bn / (10n**BigInt(dec));
  const frac = bn % (10n**BigInt(dec));
  return whole.toString() + "." + frac.toString().slice(0,4);
}

// ===== Global state =====
const state = {
  evm: { privKey:null, address:null },
  sol: { secret:null, address:null },
  network: null,
  balances: {},
  assets: [],
  history: []
};

// ===== Key derivation =====
function deriveAddressesFromBuiltIns(){
  try{
    if(localStorage.privKey){
      const wallet = new ethers.Wallet(localStorage.privKey);
      state.evm.privKey = localStorage.privKey;
      state.evm.address = wallet.address;
    }
  }catch(e){ console.error("EVM key fail", e); }
  try{
    if(localStorage.solSecret){
      const secret = JSON.parse(localStorage.solSecret);
      const kp = solanaWeb3.Keypair.fromSecretKey(Uint8Array.from(secret));
      state.sol.secret = secret;
      state.sol.address = kp.publicKey.toBase58();
    }
  }catch(e){ console.error("Sol key fail", e); }
}

// ===== Providers =====
function getProvider(){
  if(state.network === "solana"){
    return new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("mainnet-beta"));
  } else {
    return new ethers.providers.JsonRpcProvider("https://cloudflare-eth.com");
  }
}

// ===== Balances =====
async function loadSelectedBalance(){
  const net = state.network;
  if(net === "solana" && state.sol.address){
    const c = getProvider();
    const bal = await c.getBalance(new solanaWeb3.PublicKey(state.sol.address));
    document.getElementById("balance").innerText = "Balance: " + (bal/1e9) + " SOL";
  }
  if(net !== "solana" && state.evm.address){
    const p = getProvider();
    const bal = await p.getBalance(state.evm.address);
    document.getElementById("balance").innerText = "Balance: " + ethers.utils.formatEther(bal) + " ETH";
  }
}

// ===== Asset scan (ERC20/SPL) =====
async function scanAssets(){
  const net = state.network;
  let out = [];
  if(net === "solana" && state.sol.address){
    out = ["SOL"];
  } else if(net !== "solana" && state.evm.address){
    out = ["ETH"]; // extendable
  }
  state.assets = out;
  const sel = document.getElementById("token");
  sel.innerHTML = "";
  for(const a of out){
    const o = document.createElement("option");
    o.value = a; o.textContent = a;
    sel.appendChild(o);
  }
  document.getElementById("assets").innerText = "Assets: " + out.join(", ");
}

// ===== Transaction send =====
async function send(){
  const net = state.network;
  const recv = document.getElementById("toAddr").value.trim();
  const amt = document.getElementById("amt").value.trim();
  if(net === "solana"){
    const conn = getProvider();
    const kp = solanaWeb3.Keypair.fromSecretKey(Uint8Array.from(state.sol.secret));
    const tx = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: kp.publicKey,
        toPubkey: new solanaWeb3.PublicKey(recv),
        lamports: amt * 1e9
      })
    );
    const sig = await solanaWeb3.sendAndConfirmTransaction(conn, tx, [kp]);
    alert("Sent tx: "+sig);
  } else {
    const w = new ethers.Wallet(state.evm.privKey, getProvider());
    const tx = await w.sendTransaction({
      to: recv,
      value: ethers.utils.parseEther(amt)
    });
    alert("Sent tx: "+tx.hash);
  }
}

// ===== History loader (simple stub) =====
async function loadHistory(clear){
  const list = document.getElementById("history");
  if(clear) list.innerHTML = "";
  const li = document.createElement("li");
  li.textContent = "Tx stub - replace with scan API integration";
  list.appendChild(li);
}

// ===== UI hooks =====
function hookUI(){
  document.getElementById("network").addEventListener("change", async (e)=>{
    setNetwork(e.target.value);
    await loadSelectedBalance();
    await scanAssets();
    await loadHistory(true);
  });
  document.getElementById("token").addEventListener("change", loadSelectedBalance);
  document.getElementById("refresh").addEventListener("click", async ()=>{
    await loadSelectedBalance(); await scanAssets();
  });
  document.getElementById("sendBtn").addEventListener("click", send);
  document.getElementById("moreBtn").addEventListener("click", ()=>loadHistory(false));
  document.getElementById("txFilter").addEventListener("change", ()=>loadHistory(true));
  document.getElementById("copyAddr").addEventListener("click", ()=>{
    const a = document.getElementById("addrFull").textContent;
    navigator.clipboard.writeText(a); 
  });
  document.getElementById("copyRecv").addEventListener("click", ()=>{
    const a = document.getElementById("recvAddrText").textContent;
    navigator.clipboard.writeText(a);
  });
}

function setNetwork(net){
  state.network = net;
  const addr = (net === "solana") ? state.sol.address : state.evm.address;
  document.getElementById("address").innerText = "Address: "+fmtAddr(addr);
  document.getElementById("addrFull").innerText = addr || "";
  document.getElementById("recvAddrText").innerText = addr || "";
}

// ===== Boot =====
async function boot(){
  deriveAddressesFromBuiltIns();  

  setupSelectors();

  state.network = state.evm.address ? "ethereum" : "solana";
  document.getElementById("network").value = state.network;

  setNetwork(state.network);

  await loadSelectedBalance();
  await scanAssets();
  await loadHistory(true);
}

function setupSelectors(){
  const nets = ["ethereum","solana"];
  const sel = document.getElementById("network");
  sel.innerHTML = "";
  for(const n of nets){
    const o = document.createElement("option");
    o.value = n; o.textContent = n;
    sel.appendChild(o);
  }
}

window.addEventListener("load", ()=>{
  hookUI();
  boot();
});
