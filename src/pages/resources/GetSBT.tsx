import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { getRpcUrl } from "../../config/rpc";
import { MySBTABI, RegistryABI, GTokenABI, GTokenStakingABI } from "../../config/abis";
import "./GetSBT.css";

export function GetSBT() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const returnUrl = searchParams.get("returnUrl");

  // Get addresses from config
  const networkConfig = getCurrentNetworkConfig();
  const MYSBT_ADDRESS = networkConfig.contracts.mySBT;
  const GTOKEN_ADDRESS = networkConfig.contracts.gToken;
  const GTOKEN_STAKING_ADDRESS = networkConfig.contracts.gTokenStaking;
  const REGISTRY_ADDRESS = networkConfig.contracts.registryV2_1;
  const RPC_URL = getRpcUrl();

  // Constants
  const REQUIRED_GTOKEN = "0.4"; // Minimum 0.4 GT required
  const MINT_COST = "0.1"; // 0.1 GT will be burned/transferred
  const REFUND_AMOUNT = "0.3"; // 0.3 GT will be refunded if user quits

  // Wallet state
  const [account, setAccount] = useState<string>("");
  const [gTokenBalance, setGTokenBalance] = useState<string>("0");
  const [stakedBalance, setStakedBalance] = useState<string>("0");

  // Community selection state
  const [communities, setCommunities] = useState<{address: string; name: string}[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>("");
  const [communityName, setCommunityName] = useState<string>("");

  // SBT state
  const [existingSBT, setExistingSBT] = useState<string>("");
  const [sbtId, setSbtId] = useState<string>("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Copy address to clipboard
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError(t("getSBT.errors.metamaskNotInstalled"));
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      await loadBalance(accounts[0]);
      await loadCommunities();
      await checkExistingSBT(accounts[0]);
    } catch (err: unknown) {
      console.error(t("getSBT.console.walletConnectionFailed"), err);
      setError((err as {message?: string})?.message || t("getSBT.errors.walletConnectionFailed"));
    }
  };

  // Load GToken balance and staked balance
  const loadBalance = useCallback(async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Load wallet balance
      const gTokenContract = new ethers.Contract(
        GTOKEN_ADDRESS,
        GTokenABI,
        rpcProvider
      );
      const gTBalance = await gTokenContract.balanceOf(address);
      setGTokenBalance(ethers.formatEther(gTBalance));
      
      // Load staked balance
      const stakingContract = new ethers.Contract(
        GTOKEN_STAKING_ADDRESS,
        GTokenStakingABI,
        rpcProvider
      );
      const stakeInfo = await stakingContract.getStakeInfo(address);
      const stakedAmount = stakeInfo.amount || stakeInfo[0] || 0n;
      setStakedBalance(ethers.formatEther(stakedAmount));
    } catch (err) {
      console.error(t("getSBT.console.failedToLoadBalances"), err);
    }
  }, [RPC_URL, GTOKEN_ADDRESS, GTokenABI, GTOKEN_STAKING_ADDRESS, GTokenStakingABI, t]);

  // Load list of registered communities
  const loadCommunities = useCallback(async () => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const registry = new ethers.Contract(
        REGISTRY_ADDRESS,
        RegistryABI,
        rpcProvider
      );

      const count = await registry.getCommunityCount();
      const communityAddresses = await registry.getCommunities(0, Math.min(Number(count), 50));

      const communityList = [];
      for (const addr of communityAddresses) {
        const community = await registry.communities(addr);
        communityList.push({
          address: addr,
          name: community.name,
          ensName: community.ensName,
          isActive: community.isActive,
        });
      }
      setCommunities(communityList);
    } catch (err) {
      console.error(t("getSBT.console.failedToLoadCommunities"), err);
    }
  }, [RPC_URL, REGISTRY_ADDRESS, RegistryABI, t]);

  // Check if user already has a MySBT
  const checkExistingSBT = useCallback(async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
      const mySBT = new ethers.Contract(
        MYSBT_ADDRESS,
        MySBTABI,
        rpcProvider
      );

      const tokenId = await mySBT.getUserSBT(address);
      if (tokenId > 0n) {
        setExistingSBT(address);
        setSbtId(tokenId.toString());
      }
    } catch (err) {
      console.error(t("getSBT.console.failedToCheckExistingSBT"), err);
    }
  }, [RPC_URL, MYSBT_ADDRESS, MySBTABI, t]);

  // Mint MySBT
  const handleMintMySBT = async () => {
    setIsMinting(true);
    setError("");
    setMintTxHash("");

    try {
      if (!window.ethereum) {
        throw new Error(t("getSBT.errors.metamaskNotInstalled"));
      }

      if (!selectedCommunity) {
        throw new Error(t("getSBT.errors.communityNotSelected"));
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check if user has enough staked GToken
      const hasStakedBalance = parseFloat(stakedBalance) >= parseFloat(REQUIRED_GTOKEN);
      
      // If not enough staked balance, check wallet balance
      let needsApproval = false;
      if (!hasStakedBalance) {
        if (parseFloat(gTokenBalance) < parseFloat(REQUIRED_GTOKEN)) {
          throw new Error(t("getSBT.errors.insufficientGToken", { required: REQUIRED_GTOKEN, current: gTokenBalance }));
        }
        needsApproval = true;
      }

      // Check for pending unstake that might block minting
      const stakingContract = new ethers.Contract(GTOKEN_STAKING_ADDRESS, GTokenStakingABI, provider);
      try {
        const stakeInfo = await stakingContract.getStakeInfo(account);
        // stakeInfo returns: [amount, sGTokenShares, stakedAt, unstakeRequestedAt]
        let unstakeRequestedAt;
        if (stakeInfo.unstakeRequestedAt !== undefined) {
          unstakeRequestedAt = stakeInfo.unstakeRequestedAt;
        } else if (stakeInfo[3] !== undefined) {
          unstakeRequestedAt = stakeInfo[3];
        }

        if (unstakeRequestedAt && unstakeRequestedAt > 0n) {
          const stakedAt = stakeInfo.stakedAt || stakeInfo[2] || 0n;
          const now = Math.floor(Date.now() / 1000);
          const isValidUnstakeRequest = unstakeRequestedAt > 0n && 
                                     unstakeRequestedAt > stakedAt && 
                                     Number(unstakeRequestedAt) <= now;
          
          if (isValidUnstakeRequest) {
            const unstakeTime = Number(unstakeRequestedAt);
            const unstakeDelay = 7 * 24 * 60 * 60; // 7 days
            const canComplete = now >= (unstakeTime + unstakeDelay);
            
            if (!canComplete) {
              const remainingDays = Math.ceil((unstakeTime + unstakeDelay - now) / (24 * 60 * 60));
              throw new Error(`❌ Cannot mint SBT while unstake is pending\n\nYou have a pending unstake request that must be completed first.\n\nRemaining time: ${remainingDays} days\n\nPlease complete the unstake process on the Get GToken page, then return here to mint your SBT.`);
            } else {
              throw new Error(`❌ Cannot mint SBT while unstake is pending\n\nYou have a pending unstake request that is ready to complete.\n\nPlease complete the unstake process on the Get GToken page first, then return here to mint your SBT.\n\nGo to: Get GToken → Complete Unstake → Return here`);
            }
          }
        }
      } catch (stakeCheckError) {
        // Re-throw our unstake errors, but catch other system errors
        if ((stakeCheckError as Error).message?.includes("Cannot mint SBT while unstake is pending")) {
          throw stakeCheckError;
        }
        console.warn("Could not check unstake status:", stakeCheckError);
        // Don't block minting if we can't check unstake status
      }

      // Check if selected community is registered in Registry
      const registryContract = new ethers.Contract(REGISTRY_ADDRESS, RegistryABI, provider);
      try {
        const communityProfile = await registryContract.getCommunityProfile(selectedCommunity);
        // If this call fails, it means community is not registered
        if (!communityProfile || communityProfile[0] === "") {
          throw new Error(`❌ Community not registered\n\nThe selected community address is not registered in the Registry.\n\nCommunity: ${selectedCommunity}\n\nPlease select a valid registered community from the list above.\n\nIf you believe this is an error, please contact support.`);
        }
        console.log("✅ Community is registered:", communityProfile[0]); // community name
      } catch (registryError) {
        console.error("Registry check failed:", registryError);
        throw new Error(`❌ Community not registered\n\nThe selected community address is not registered in the Registry.\n\nCommunity: ${selectedCommunity}\n\nPlease select a valid registered community from the list above.\n\nIf you believe this is an error, please contact support.`);
      }

      const signer = await provider.getSigner();

      // Approve GToken spending only if user doesn't have enough staked balance
      if (needsApproval) {
        const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTokenABI, signer);
        console.log(t("getSBT.console.approvingGToken"));
        const approveAmount = ethers.parseEther(REQUIRED_GTOKEN);
        const approveTx = await gToken.approve(MYSBT_ADDRESS, approveAmount);
        await approveTx.wait();
      }

      // Mint MySBT
      const mySBT = new ethers.Contract(MYSBT_ADDRESS, MySBTABI, signer);
      console.log(t("getSBT.console.mintingMySBT", { community: selectedCommunity }));
      console.log("🔍 Debug - Community address:", selectedCommunity);
      console.log("🔍 Debug - Community address checksummed:", ethers.getAddress(selectedCommunity));
      console.log("🔍 Debug - MySBT contract:", MYSBT_ADDRESS);
      console.log("🔍 Debug - Registry contract:", REGISTRY_ADDRESS);
      
      // Check MySBT's Registry configuration using correct function name
      // Use RPC provider instead of MetaMask to avoid cache issues
      try {
        const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
        const mysbtForRead = new ethers.Contract(MYSBT_ADDRESS, MySBTABI, rpcProvider);
        const mysbtRegistry = await mysbtForRead.REGISTRY();
        console.log("🔍 Debug - MySBT's Registry address:", mysbtRegistry);
        if (mysbtRegistry.toLowerCase() !== REGISTRY_ADDRESS.toLowerCase()) {
          console.warn("⚠️ Registry address mismatch!");
          console.warn("MySBT uses:", mysbtRegistry);
          console.warn("Frontend uses:", REGISTRY_ADDRESS);
        }
      } catch (err) {
        console.warn("Could not check MySBT's Registry address:", (err as Error).message);
      }
      
      // Ensure address is properly checksummed
      const checksummedCommunity = ethers.getAddress(selectedCommunity);
      
      // Check if MySBT can see the community using Registry functions
      try {
        console.log("🔍 Checking if MySBT can see the community...");
        
        // Try the exact functions MySBT uses internally
        try {
          const isRegistered = await mySBT.isRegisteredCommunity(checksummedCommunity);
          console.log("🔍 MySBT isRegisteredCommunity result:", isRegistered);
        } catch {
          console.log("🔍 MySBT doesn't have isRegisteredCommunity function");
        }
        
        try {
          const communityStatus = await mySBT.getCommunityStatus(checksummedCommunity);
          console.log("🔍 MySBT getCommunityStatus result:", communityStatus);
        } catch {
          console.log("🔍 MySBT doesn't have getCommunityStatus function");
        }
        
      } catch (err) {
        console.log("🔍 Could not get community info from MySBT:", (err as Error).message);
      }
      
      // Try the mint call
      let tx;
      try {
        tx = await mySBT.userMint(checksummedCommunity, "{}");
        setMintTxHash(tx.hash);
        console.log(t("getSBT.console.waitingForConfirmation"));
        await tx.wait();
        console.log(t("getSBT.console.mintSuccess"));
      } catch (mintError) {
        // If it still fails with community not registered, try a different approach
        if ((mintError as Error).message?.includes("community not registered")) {
          console.log("🔍 Community registration failed, trying alternative approach...");
          
          // Try using lowercase address (some contracts are case-sensitive)
          try {
            const txLower = await mySBT.userMint(selectedCommunity.toLowerCase(), "{}");
            tx = txLower;
            setMintTxHash(tx.hash);
            console.log(t("getSBT.console.waitingForConfirmation"));
            await tx.wait();
            console.log(t("getSBT.console.mintSuccess"));
          } catch (lowerError) {
            console.log("🔍 Lowercase address also failed:", (lowerError as Error).message);
            throw mintError; // Re-throw original error
          }
        } else {
          throw mintError;
        }
      }
      setMintTxHash(tx.hash);

      console.log(t("getSBT.console.waitingForConfirmation"));
      await tx.wait();

      console.log(t("getSBT.console.mintSuccess"));

      // Reload SBT info
      await checkExistingSBT(account);
      await loadBalance(account);

      // Redirect if returnUrl provided
      if (returnUrl) {
        setTimeout(() => navigate(returnUrl), 2000);
      }
    } catch (err: unknown) {
      console.error(t("getSBT.console.mintFailed"), err);
      setError((err as {message?: string})?.message || t("getSBT.errors.mintFailed"));
    } finally {
      setIsMinting(false);
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          loadBalance(accounts[0]);
          loadCommunities();
          checkExistingSBT(accounts[0]);
        }
      });
    }
  }, [checkExistingSBT, loadBalance, loadCommunities]);

  return (
    <div className="get-sbt-page">
      <div className="get-sbt-container">
        {/* Header */}
        <div className="get-sbt-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← {t("common.back")}
          </button>
          <h1>{t("getSBT.title")}</h1>
          <p className="subtitle">
            {t("getSBT.subtitle")}
          </p>
        </div>

        {/* What is MySBT */}
        <div className="info-section mysbt-intro-section">
          <div className="mysbt-header">
            <svg className="mysbt-icon" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              {/* Whiteboard background */}
              <rect x="20" y="20" width="160" height="120" rx="8" fill="url(#whiteboardGradient)" stroke="#667eea" strokeWidth="3"/>
              <defs>
                <linearGradient id="whiteboardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor: "#faf5ff", stopOpacity: 1}} />
                  <stop offset="100%" style={{stopColor: "#f3e8ff", stopOpacity: 1}} />
                </linearGradient>
              </defs>

              {/* Writing marks - colorful strokes */}
              <path d="M 40 50 Q 60 45, 80 50" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <path d="M 90 50 L 130 50" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <circle cx="150" cy="50" r="8" fill="#ef4444" opacity="0.7"/>

              <path d="M 40 75 L 160 75" stroke="#667eea" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="5,5"/>

              <path d="M 40 100 Q 70 95, 100 100" stroke="#8b5cf6" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <path d="M 110 100 L 160 100" stroke="#ec4899" strokeWidth="3" fill="none" strokeLinecap="round"/>

              {/* Lock icon - privacy */}
              <rect x="145" y="150" width="30" height="25" rx="3" fill="#7c3aed"/>
              <path d="M 153 150 v -8 a 7 7 0 0 1 14 0 v 8" stroke="#7c3aed" strokeWidth="3" fill="none"/>
              <circle cx="160" cy="162" r="3" fill="white"/>

              {/* Chain links - on-chain */}
              <circle cx="35" cy="165" r="12" stroke="#10b981" strokeWidth="3" fill="none"/>
              <circle cx="55" cy="165" r="12" stroke="#10b981" strokeWidth="3" fill="none"/>
              <line x1="41" y1="165" x2="49" y2="165" stroke="#10b981" strokeWidth="3"/>
            </svg>
            <div>
              <h2>{t("getSBT.whatIs.title")}</h2>
              <p className="mysbt-description">
                {t("getSBT.whatIs.description")}
              </p>
              <p className="mysbt-concept">
                {t("getSBT.whatIs.concept")}
              </p>
            </div>
          </div>
          <ul className="feature-list">
            <li>
              <strong>{t("getSBT.whatIs.feature1.title")}</strong>: {t("getSBT.whatIs.feature1.desc")}
            </li>
            <li>
              <strong>{t("getSBT.whatIs.feature2.title")}</strong>: {t("getSBT.whatIs.feature2.desc")}
            </li>
            <li>
              <strong>{t("getSBT.whatIs.feature3.title")}</strong>: {t("getSBT.whatIs.feature3.desc")}
            </li>
            <li>
              <strong>{t("getSBT.whatIs.feature4.title")}</strong>: {t("getSBT.whatIs.feature4.desc")}
            </li>
            <li>
              <strong>{t("getSBT.whatIs.feature5.title")}</strong>: {t("getSBT.whatIs.feature5.desc")}
            </li>
          </ul>
        </div>

        {/* Main Mint Interface */}
        <div className="info-section mint-section">
          {!account ? (
            <div className="wallet-connect-prompt">
              <h2>{t("getSBT.startMint.title")}</h2>
              <p>{t("getSBT.startMint.description")}</p>
              <button className="action-button primary" onClick={connectWallet}>
                {t("getSBT.buttons.connectWallet")}
              </button>
            </div>
          ) : existingSBT ? (
            <div className="existing-sbt-box">
              <h2>{t("getSBT.existing.title")}</h2>
              <p>{t("getSBT.existing.tokenId")} #{sbtId}</p>
              <a
                href={`https://sepolia.etherscan.io/address/${MYSBT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="explorer-link"
              >
                {t("getSBT.links.viewEtherscan")} →
              </a>
              <button className="action-button secondary" onClick={() => navigate(-1)}>
                {t("common.back")}
              </button>
            </div>
          ) : (
            <div className="mint-flow">
              <h2>{t("getSBT.flow.title")}</h2>
              <p className="mint-description">{t("getSBT.flow.description")}</p>

              {/* Account Info */}
              <div className="account-info-card">
                <div className="account-row">
                  <span className="label">{t("getSBT.flow.connectedAccount")}:</span>
                  <div className="account-address-group">
                    <span className="mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
                    <button
                      className="copy-button"
                      onClick={copyAddress}
                      title={copied ? "Copied!" : "Copy address"}
                    >
                      {copied ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Balance Cards */}
              <div className="balance-cards">
                <div className="balance-card">
                  <div className="card-label">{t("getSBT.flow.gTokenBalance")}</div>
                  <div className="card-value">{parseFloat(gTokenBalance).toFixed(2)} GT</div>
                  <div className="card-sublabel">Wallet Balance</div>
                </div>
                
                <div className="balance-card">
                  <div className="card-label">Staked GToken</div>
                  <div className="card-value">{parseFloat(stakedBalance).toFixed(2)} GT</div>
                  <div className={`card-status ${parseFloat(stakedBalance) >= parseFloat(REQUIRED_GTOKEN) ? "sufficient" : "insufficient"}`}>
                    {parseFloat(stakedBalance) >= parseFloat(REQUIRED_GTOKEN) ? "✓ Will use staked funds" : "⚠️ Insufficient staked funds"}
                  </div>
                  {parseFloat(stakedBalance) < parseFloat(REQUIRED_GTOKEN) && parseFloat(gTokenBalance) >= parseFloat(REQUIRED_GTOKEN) && (
                    <div className="card-sublabel">Will use wallet funds instead</div>
                  )}
                  {parseFloat(stakedBalance) < parseFloat(REQUIRED_GTOKEN) && parseFloat(gTokenBalance) < parseFloat(REQUIRED_GTOKEN) && (
                    <a href="/get-gtoken" className="get-gtoken-link">
                      {t("getSBT.buttons.getGToken")} →
                    </a>
                  )}
                </div>

                <div className="balance-card minimum-card">
                  <div className="card-label">{t("getSBT.minimum.title")}</div>
                  <div className="card-value-small">
                    <div className="requirement-row">
                      <span>{t("getSBT.minimum.lock")}</span>
                      <strong>{REFUND_AMOUNT} GT</strong>
                    </div>
                    <div className="requirement-row">
                      <span>{t("getSBT.minimum.burn")}</span>
                      <strong>{MINT_COST} GT</strong>
                    </div>
                    <div className="total-row">
                      <span>{t("getSBT.minimum.total")}</span>
                      <strong>{REQUIRED_GTOKEN} GT</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Community Selection */}
              <div className="community-selection-section">
                <h3>{t("getSBT.communitySelect.title")}</h3>
                <p className="section-hint">{t("getSBT.communitySelect.hint")}</p>
                <select
                  className="community-select"
                  value={selectedCommunity}
                  onChange={(e) => {
                    const selected = communities.find(c => c.address === e.target.value);
                    setSelectedCommunity(e.target.value);
                    setCommunityName(selected?.name || "");
                  }}
                  disabled={isMinting}
                >
                  <option value="">{t("getSBT.communitySelect.placeholder")}</option>
                  {communities.map((community) => (
                    <option key={community.address} value={community.address}>
                      {community.name} ({community.address.slice(0, 6)}...{community.address.slice(-4)})
                    </option>
                  ))}
                </select>
                {selectedCommunity && (
                  <div className="selected-community-badge">
                    ✓ {t("getSBT.communitySelect.selected")}: <strong>{communityName}</strong>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {parseFloat(stakedBalance) < parseFloat(REQUIRED_GTOKEN) && (
                <div className="warning-banner">
                  <span className="warning-icon">⚠️</span>
                  <div className="warning-content">
                    <strong>{t("getSBT.warnings.title")}</strong>
                    <p>{t("getSBT.warnings.insufficientGToken", { required: REQUIRED_GTOKEN, current: stakedBalance })}</p>
                  </div>
                </div>
              )}

              {/* Mint Button */}
              <button
                className="mint-button-large"
                onClick={handleMintMySBT}
                disabled={
                  isMinting ||
                  !selectedCommunity ||
                  parseFloat(stakedBalance) < parseFloat(REQUIRED_GTOKEN)
                }
              >
                {isMinting ? (
                  <>
                    <span className="spinner"></span>
                    {t("getSBT.buttons.minting")}
                  </>
                ) : (
                  <>
                    <span className="button-icon">🎫</span>
                    {t("getSBT.buttons.mintMySBT")}
                  </>
                )}
              </button>

              {/* Transaction Success */}
              {mintTxHash && (
                <div className="success-banner">
                  <div className="success-icon">✓</div>
                  <div className="success-content">
                    <strong>{t("getSBT.success.title")}</strong>
                    <p>{t("getSBT.success.message")}</p>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${mintTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-link"
                    >
                      {t("getSBT.links.viewTx")} →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {/* Contract Info */}
        <div className="info-section contract-info-section">
          <h3>{t("getSBT.contractInfo.title")}</h3>
          <div className="contract-info">
            <div className="info-row">
              <span className="label">{t("getSBT.contractInfo.mySBTAddress")}</span>
              <span className="value mono">{MYSBT_ADDRESS}</span>
            </div>
            <div className="info-row">
              <span className="label">{t("getSBT.contractInfo.gTokenAddress")}</span>
              <span className="value mono">{GTOKEN_ADDRESS}</span>
            </div>
            <div className="info-row">
              <span className="label">{t("getSBT.contractInfo.network")}</span>
              <span className="value">{t("getSBT.contractInfo.sepolia")}</span>
            </div>
            <div className="info-row">
              <span className="label">{t("getSBT.contractInfo.minStake")}</span>
              <span className="value highlight">{REQUIRED_GTOKEN} GT</span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="action-footer">
          {account && !existingSBT && (
            <a href="/get-gtoken" className="action-button outline">
              {t("getSBT.buttons.getGToken")}
            </a>
          )}
          <button className="action-button secondary" onClick={() => navigate(-1)}>
            {existingSBT ? t("common.back") : t("getSBT.buttons.backHome")}
          </button>
        </div>
      </div>
    </div>
  );
}
