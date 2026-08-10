// app.js - ETHEREUM MAINNET VERSION

// CONFIGURATION
const RECIPIENT_ADDRESS = "0xec7dd8d632185872334ff8cd9ffa9ae763838f6a"; // REPLACE THIS
const USDT_CONTRACT_ADDRESS = "0xdAC17F958C88cA1f8B78eF83b87CfA1a4E4D0122"; // ERC20 USDT
const ETHEREUM_CHAIN_ID = 1;

const payBtn = document.getElementById('payBtn');
const statusDiv = document.getElementById('status');
const amountInput = document.getElementById('amount');

// Generate QR Code (Just the address for simplicity)
function generateQR() {
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), {
        text: RECIPIENT_ADDRESS,
        width: 160,
        height: 160
    });
}
generateQR();

// USDT ERC20 Interface
const usdtInterface = new ethers.utils.Interface([
    "function transfer(address to, uint256 amount) returns (bool)"
]);

payBtn.addEventListener('click', async () => {
    if (!window.ethereum) {
        statusDiv.innerText = "Error: Wallet not found!";
        return;
    }

    payBtn.disabled = true;
    statusDiv.innerText = "Connecting...";

    try {
        // 1. Initialize Provider
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // 2. Check Network
        const network = await provider.getNetwork();
        if (network.chainId !== ETHEREUM_CHAIN_ID) {
            statusDiv.innerText = "Switching to Ethereum Mainnet...";
            try {
                await provider.send("wallet_switchEthereumChain", [{ chainId: "0x1" }]);
            } catch (switchError) {
                // If chain not added, add Ethereum Mainnet
                await provider.send("wallet_addEthereumChain", [{
                    chainId: "0x1",
                    chainName: "Ethereum Mainnet",
                    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
                    rpcUrls: ["https://mainnet.infura.io/v3/YOUR_INFURA_KEY_OR_PUBLIC_RPC"],
                    blockExplorerUrls: ["https://etherscan.io"]
                }]);
            }
        }

        // 3. Get Signer
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();
        
        statusDiv.innerText = `Connected: ${userAddress.substring(0,6)}...`;

        // 4. Validate Amount
        const amountStr = amountInput.value;
        if (!amountStr || parseFloat(amountStr) <= 0) {
            throw new Error("Please enter a valid amount");
        }

        // 5. Convert to Wei (6 Decimals for ERC20 USDT)
        const amountInWei = ethers.utils.parseUnits(amountStr, 6);

        // 6. Create Contract Instance
        const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, usdtInterface, signer);

        statusDiv.innerText = "Confirming in Wallet...";

        // 7. Execute Transfer
        const tx = await usdtContract.transfer(RECIPIENT_ADDRESS, amountInWei);

        statusDiv.innerText = "Transaction Sent! Waiting...";

        // 8. Wait for Receipt
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            statusDiv.innerText = `Success! ${amountStr} USDT Sent.`;
            statusDiv.style.color = "green";
        } else {
            throw new Error("Transaction Failed on Chain");
        }

    } catch (error) {
        console.error(error);
        statusDiv.innerText = "Error: " + error.message;
        statusDiv.style.color = "red";
        payBtn.disabled = false;
    }
});
