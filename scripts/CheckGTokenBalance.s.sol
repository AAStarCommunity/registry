// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CheckGTokenBalance is Script {
    function run() external {
        // Sepolia testnet GToken contract address
        address constant GTOKEN_ADDRESS = 0x99cCb70646Be7A5aeE7aF98cE853a1EA1A676DCc;
        address constant TARGET_ADDRESS = 0x2E9A5648F9dd7E8d70e3CBdA0C8b6Ada71Da4Ec9;
        
        console.log("=== GToken Balance Check ===");
        console.log("Network: Sepolia Testnet");
        console.log("GToken Contract:", GTOKEN_ADDRESS);
        console.log("Target Address:", TARGET_ADDRESS);
        console.log("");
        
        // Create contract instance
        IERC20 gtoken = IERC20(GTOKEN_ADDRESS);
        
        try {
            // Get token info
            string memory symbol = gtoken.symbol();
            uint8 decimals = gtoken.decimals();
            console.log("✅ Contract found");
            console.log("Token Symbol:", symbol);
            console.log("Token Decimals:", uint256(decimals));
            
            // Get balance
            uint256 balance = gtoken.balanceOf(TARGET_ADDRESS);
            
            console.log("");
            console.log("=== Balance Results ===");
            console.log("Raw Balance:", balance);
            console.log("Formatted Balance:", formatBalance(balance, decimals));
            
            if (balance == 0) {
                console.log("⚠️  Balance is 0 - This could mean:");
                console.log("   1. Address has no GToken");
                console.log("   2. Wrong contract address");
                console.log("   3. Mint transaction failed");
                console.log("   4. Network mismatch");
            } else {
                console.log("✅ Balance found:", formatBalance(balance, decimals));
            }
            
        } catch Error(string memory reason) {
            console.log("❌ Error:", reason);
        } catch {
            console.log("❌ Unknown error occurred");
        }
    }
    
    function formatBalance(uint256 balance, uint8 decimals) internal pure returns (string memory) {
        if (balance == 0) return "0";
        
        uint256 divisor = 10**decimals;
        uint256 wholePart = balance / divisor;
        uint256 fractionalPart = balance % divisor;
        
        if (fractionalPart == 0) {
            return uint256(wholePart).toString();
        } else {
            string memory wholeStr = uint256(wholePart).toString();
            string memory fracStr = uint256(fractionalPart).toString();
            
            // Pad with leading zeros if needed
            while (bytes(fracStr).length < decimals) {
                fracStr = string(abi.encodePacked("0", fracStr));
            }
            
            // Remove trailing zeros
            while (bytes(fracStr).length > 0 && bytes(fracStr)[bytes(fracStr).length - 1] == '0') {
                bytes(fracStr).length--;
            }
            
            if (bytes(fracStr).length == 0) {
                return wholeStr;
            } else {
                return string(abi.encodePacked(wholeStr, ".", fracStr));
            }
        }
    }
}