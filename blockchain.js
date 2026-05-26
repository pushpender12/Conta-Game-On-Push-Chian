// ============================================
// BLOCKCHAIN INTEGRATION
// Push Chain Testnet via MetaMask + ethers.js
// ============================================

// TODO: Replace this with your deployed contract address (Phase 3)
const CONTRACT_ADDRESS = "0x316518a0F8641de50B2584932E6a2C5E535c69F0";

// Contract ABI - tells ethers.js what functions exist on the contract
const CONTRACT_ABI = [
    "function submitScore(uint256 score, uint8 level) external",
    "function getTopScores() external view returns (tuple(address player, uint256 score, uint8 level, uint256 timestamp)[])",
    "function getMyBestScore(address player) external view returns (uint256)"
];

// Push Chain Testnet config
const PUSH_CHAIN_CONFIG = {
    chainId: '0xA455',  // ✅ 42101 ka hex = 0xA455
    chainName: 'Push Chain Donut Testnet',
    rpcUrls: ['https://evm.donut.rpc.push.org/'],
    nativeCurrency: {
        name: 'PC',
        symbol: 'PC',
        decimals: 18
    },
    blockExplorerUrls: ['https://donut.push.network']
};

// Global wallet state
let walletConnected = false;
let userAddress = null;

// ============================================
// CONNECT WALLET
// ============================================

async function connectWallet() {
    try {
        document.getElementById('status').textContent = '⏳ Connecting to MetaMask...';

        // Check if MetaMask is installed
        if (!window.ethereum) {
            alert('MetaMask is not installed!\nPlease visit https://metamask.io');
            return;
        }

        // Request wallet access
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        userAddress = accounts[0];

        // Try switching to Push Chain Testnet
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: PUSH_CHAIN_CONFIG.chainId }]
            });
        } catch (switchError) {
            // Network not found — add it automatically
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [PUSH_CHAIN_CONFIG]
                });
            } else {
                throw switchError;
            }
        }

        // Mark wallet as connected
        walletConnected = true;
        window.walletConnected = true;

        // Update UI
        const shortAddress = userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
        document.getElementById('connectBtn').textContent = `✅ ${shortAddress}`;
        document.getElementById('connectBtn').disabled = true;
        document.getElementById('status').textContent =
            `Connected: ${shortAddress} on Push Chain Testnet`;

        // Load leaderboard after connecting
        loadLeaderboard();

    } catch (error) {
        console.error('Wallet connection error:', error);
        document.getElementById('status').textContent =
            '❌ Connection failed: ' + error.message;
    }
}

// ============================================
// SUBMIT SCORE ON-CHAIN
// ============================================

async function submitScore() {
    // Validation checks
    if (!walletConnected) {
        alert('Please connect MetaMask first!');
        return;
    }

    if (CONTRACT_ADDRESS === "PASTE_YOUR_CONTRACT_ADDRESS_HERE") {
        alert('Contract not deployed yet!\nComplete Phase 3 first.');
        return;
    }

    try {
        document.getElementById('status').textContent =
            '⏳ Submitting score to Push Chain...';
        document.getElementById('submitBtn').disabled = true;

        // Create ethers provider and signer from MetaMask
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Connect to our deployed contract
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        // Send the transaction
        const tx = await contract.submitScore(
            gameState.score,        // Final score
            gameState.level         // Level reached
        );

        document.getElementById('status').textContent =
            '⏳ Waiting for transaction confirmation...';

        // Wait for 1 block confirmation
        const receipt = await tx.wait(1);

        document.getElementById('status').textContent =
            `✅ Score submitted! TX: ${tx.hash.slice(0, 12)}...`;

        console.log('Transaction confirmed:', receipt);

        // Refresh leaderboard
        loadLeaderboard();

    } catch (error) {
        console.error('Score submission error:', error);
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('status').textContent =
            '❌ Submission failed: ' + error.message;
    }
}

// ============================================
// LOAD LEADERBOARD FROM CHAIN
// ============================================

async function loadLeaderboard() {
    const leaderboardDiv = document.getElementById('leaderboardData');

    // Contract not deployed yet
    if (CONTRACT_ADDRESS === "PASTE_YOUR_CONTRACT_ADDRESS_HERE") {
        leaderboardDiv.innerHTML =
            '<span style="color:#666">⚠️ Deploy the contract first (Phase 3)</span>';
        return;
    }

    try {
        // Read-only provider — no wallet needed to read data
        const provider = new ethers.JsonRpcProvider(
            'https://evm.donut.rpc.push.org/'
        );

        const contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            provider
        );

        // Fetch all scores from blockchain
        const scores = await contract.getTopScores();

        if (scores.length === 0) {
            leaderboardDiv.innerHTML =
                '<span style="color:#666">No scores yet. Be the first!</span>';
            return;
        }

        // Sort scores by highest first
        const sorted = [...scores].sort((a, b) =>
            Number(b.score) - Number(a.score)
        );

        // Render top 5
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        let html = '';

        sorted.slice(0, 5).forEach((entry, index) => {
            const shortAddr =
                entry.player.slice(0, 6) + '...' + entry.player.slice(-4);

            const isCurrentUser =
                userAddress &&
                entry.player.toLowerCase() === userAddress.toLowerCase();

            html += `
                <div style="padding: 3px 0; color: ${isCurrentUser ? '#ffff00' : 'white'}">
                    ${medals[index]} ${shortAddr}
                    ${isCurrentUser ? '(You)' : ''}
                    — <strong>${entry.score.toString()}</strong> pts
                    &nbsp;|&nbsp; Level ${entry.level}
                </div>
            `;
        });

        leaderboardDiv.innerHTML = html;

    } catch (error) {
        console.error('Leaderboard error:', error);
        leaderboardDiv.innerHTML =
            '<span style="color:#f88">Failed to load leaderboard</span>';
    }
}