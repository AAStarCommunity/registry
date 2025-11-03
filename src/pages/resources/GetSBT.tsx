import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { getRpcUrl } from "../../config/rpc";
import { MySBTABI, GTokenStakingABI, RegistryABI, GTokenABI } from "../../config/abis";
import "./GetSBT.css";

export function GetSBT() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const returnUrl = searchParams.get("returnUrl");

  // Get addresses from config
  const networkConfig = getCurrentNetworkConfig();
  const MYSBT_ADDRESS = networkConfig.contracts.mySBT;
  const GTOKEN_STAKING_ADDRESS = networkConfig.contracts.gTokenStaking;
  const GTOKEN_ADDRESS = networkConfig.contracts.gToken;
  const REGISTRY_ADDRESS = networkConfig.contracts.registryV2_1;
  const RPC_URL = getRpcUrl();

  // Wallet state
  const [account, setAccount] = useState<string>("");
  const [stGTokenBalance, setStGTokenBalance] = useState<string>("0");
  const [gTokenBalance, setGTokenBalance] = useState<string>("0");

  // Community selection state
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>("");
  const [communityName, setCommunityName] = useState<string>("");

  // Flow state (idle -> staking -> locking -> minting)
  const [flowStep, setFlowStep] = useState<"select" | "stake" | "lock" | "mint">("select");
  const [stakeAmount, setStakeAmount] = useState<string>("30");
  const [lockAmount, setLockAmount] = useState<string>("0.3");

  // SBT state
  const [existingSBT, setExistingSBT] = useState<string>("");
  const [sbtId, setSbtId] = useState<string>("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isStaking, setIsStaking] = useState(false);

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
      await loadBalances(accounts[0]);
      await loadCommunities();
      await checkExistingSBT(accounts[0]);
    } catch (err: any) {
      console.error(t("getSBT.console.walletConnectionFailed"), err);
      setError(err?.message || t("getSBT.errors.walletConnectionFailed"));
    }
  };

  // Load balances (GToken and stGToken)
  const loadBalances = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);

      // Load stGToken balance
      const stakingContract = new ethers.Contract(
        GTOKEN_STAKING_ADDRESS,
        GTokenStakingABI,
        rpcProvider
      );
      const stGTBalance = await stakingContract.balanceOf(address);
      setStGTokenBalance(ethers.formatEther(stGTBalance));

      // Load GToken balance
      const gTokenContract = new ethers.Contract(
        GTOKEN_ADDRESS,
        GTokenABI,
        rpcProvider
      );
      const gTBalance = await gTokenContract.balanceOf(address);
      setGTokenBalance(ethers.formatEther(gTBalance));
    } catch (err) {
      console.error(t("getSBT.console.failedToLoadBalances"), err);
    }
  };

  // Load list of registered communities
  const loadCommunities = async () => {
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
  };

  // Check if user already has a MySBT
  const checkExistingSBT = async (address: string) => {
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
  };

  // Step 1: Stake GToken
  const handleStakeGToken = async () => {
    setError("");
    setIsStaking(true);

    try {
      if (!window.ethereum) {
        throw new Error(t("getSBT.errors.metamaskNotInstalled"));
      }

      const stakeAmountWei = ethers.parseEther(stakeAmount);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // First approve GToken
      const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTokenABI, signer);
      console.log(t("getSBT.console.approvingGToken"));
      const approveTx = await gToken.approve(GTOKEN_STAKING_ADDRESS, stakeAmountWei);
      await approveTx.wait();

      // Then stake
      const staking = new ethers.Contract(GTOKEN_STAKING_ADDRESS, GTokenStakingABI, signer);
      console.log(t("getSBT.console.stakingGToken"));
      const stakeTx = await staking.stake(stakeAmountWei);
      await stakeTx.wait();

      console.log(t("getSBT.console.stakeSuccess"));
      await loadBalances(account);
      setFlowStep("lock");
    } catch (err: any) {
      console.error(t("getSBT.console.stakeFailed"), err);
      setError(err?.message || t("getSBT.errors.stakeFailed"));
    } finally {
      setIsStaking(false);
    }
  };

  // Step 2: Lock stGToken
  const handleLockStGToken = async () => {
    setError("");

    try {
      if (parseFloat(stGTokenBalance) < parseFloat(lockAmount)) {
        throw new Error(t("getSBT.errors.insufficientLockBalance", { required: lockAmount, current: stGTokenBalance }));
      }

      console.log(t("getSBT.console.stGTokenLocked"));
      setFlowStep("mint");
    } catch (err: any) {
      setError(err?.message || t("getSBT.errors.lockFailed"));
    }
  };

  // Step 3: Select community and Mint MySBT
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
      const signer = await provider.getSigner();
      const mySBT = new ethers.Contract(MYSBT_ADDRESS, MySBTABI, signer);

      console.log(t("getSBT.console.mintingMySBT", { community: selectedCommunity }));
      const tx = await mySBT.userMint(selectedCommunity, "{}");
      setMintTxHash(tx.hash);

      console.log(t("getSBT.console.waitingForConfirmation"));
      await tx.wait();

      console.log(t("getSBT.console.mintSuccess"));

      // Reload SBT info
      await checkExistingSBT(account);

      // Redirect if returnUrl provided
      if (returnUrl) {
        setTimeout(() => navigate(returnUrl), 2000);
      }
    } catch (err: any) {
      console.error(t("getSBT.console.mintFailed"), err);
      setError(err?.message || t("getSBT.errors.mintFailed"));
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
          loadBalances(accounts[0]);
          loadCommunities();
          checkExistingSBT(accounts[0]);
        }
      });
    }
  }, []);

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
        <div className="info-section">
          <h2>{t("getSBT.whatIs.title")}</h2>
          <p>
            {t("getSBT.whatIs.description")}
          </p>
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

              {/* Account Info */}
              <div className="account-info">
                <p className="account-display">
                  {t("getSBT.flow.connectedAccount")}: <span className="mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
                </p>
              </div>

              {/* Balances */}
              <div className="balance-display">
                <div className="balance-item">
                  <span className="label">{t("getSBT.flow.gTokenBalance")}</span>
                  <span className="value">{parseFloat(gTokenBalance).toFixed(2)} GT</span>
                </div>
                <div className="balance-item">
                  <span className="label">{t("getSBT.flow.stGTokenBalance")}</span>
                  <span className="value">{parseFloat(stGTokenBalance).toFixed(2)} stGT</span>
                </div>
              </div>

              {/* Flow Steps */}
              <div className="flow-steps">
                {/* Step 1: Stake */}
                <div className={`flow-step ${flowStep === "select" || flowStep === "stake" || (parseFloat(stGTokenBalance) >= 30) ? "active" : ""}`}>
                  <div className="step-header">
                    <h3>{t("getSBT.steps.step1.title")}</h3>
                    {parseFloat(stGTokenBalance) >= 30 && <span className="step-status">✓ {t("getSBT.steps.completed")}</span>}
                  </div>
                  {flowStep === "select" || flowStep === "stake" ? (
                    <div className="step-content">
                      <p>{t("getSBT.steps.step1.description")}</p>
                      <div className="input-group">
                        <label>{t("getSBT.steps.step1.amountLabel")}</label>
                        <input
                          type="number"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          min="30"
                          disabled={isStaking}
                        />
                      </div>
                      <button
                        className="action-button primary"
                        onClick={handleStakeGToken}
                        disabled={isStaking || parseFloat(gTokenBalance) < 30}
                      >
                        {isStaking ? t("getSBT.steps.step1.staking") : t("getSBT.steps.step1.stakeButton")}
                      </button>
                      {parseFloat(gTokenBalance) < 30 && (
                        <p className="warning-text">{t("getSBT.warnings.insufficientGToken")}</p>
                      )}
                    </div>
                  ) : (
                    <p className="step-status-text">✓ {t("getSBT.steps.step1.success")}</p>
                  )}
                </div>

                {/* Step 2: Lock */}
                <div className={`flow-step ${(flowStep === "lock" || flowStep === "mint") ? "active" : ""}`}>
                  <div className="step-header">
                    <h3>{t("getSBT.steps.step2.title")}</h3>
                    {parseFloat(stGTokenBalance) >= 0.3 && flowStep !== "select" && <span className="step-status">✓ {t("getSBT.steps.completed")}</span>}
                  </div>
                  {flowStep === "lock" || flowStep === "mint" ? (
                    <div className="step-content">
                      <p>{t("getSBT.steps.step2.description", { amount: lockAmount })}</p>
                      <div className="lock-info">
                        <p>{t("getSBT.steps.step2.required")}: <strong>{lockAmount} stGT</strong></p>
                        <p>{t("getSBT.steps.step2.current")}: <strong>{parseFloat(stGTokenBalance).toFixed(2)} stGT</strong></p>
                      </div>
                      <button
                        className="action-button primary"
                        onClick={handleLockStGToken}
                        disabled={parseFloat(stGTokenBalance) < parseFloat(lockAmount)}
                      >
                        {t("getSBT.buttons.confirmLock")}
                      </button>
                      {parseFloat(stGTokenBalance) < parseFloat(lockAmount) && (
                        <p className="warning-text">{t("getSBT.warnings.insufficientStGToken", { required: lockAmount })}</p>
                      )}
                    </div>
                  ) : (
                    <p className="step-status-text">✓ {t("getSBT.steps.step2.success")}</p>
                  )}
                </div>

                {/* Step 3: Choose Community and Mint */}
                <div className={`flow-step ${flowStep === "mint" ? "active" : ""}`}>
                  <div className="step-header">
                    <h3>{t("getSBT.steps.step3.title")}</h3>
                  </div>
                  {flowStep === "mint" ? (
                    <div className="step-content">
                      <p>{t("getSBT.steps.step3.description")}</p>
                      <div className="input-group">
                        <label>{t("getSBT.steps.step3.selectLabel")}</label>
                        <select
                          value={selectedCommunity}
                          onChange={(e) => {
                            const selected = communities.find(c => c.address === e.target.value);
                            setSelectedCommunity(e.target.value);
                            setCommunityName(selected?.name || "");
                          }}
                        >
                          <option value="">{t("getSBT.steps.step3.selectPlaceholder")}</option>
                          {communities.map((community) => (
                            <option key={community.address} value={community.address}>
                              {community.name} ({community.address.slice(0, 6)}...{community.address.slice(-4)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        className="action-button primary mint-button"
                        onClick={handleMintMySBT}
                        disabled={isMinting || !selectedCommunity}
                      >
                        {isMinting ? t("getSBT.steps.step3.minting") : t("getSBT.buttons.mintMySBT")}
                      </button>

                      {mintTxHash && (
                        <div className="tx-success">
                          <p>✓ {t("getSBT.success.txSubmitted")}</p>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${mintTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="explorer-link"
                          >
                            {t("getSBT.links.viewTx")} →
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="step-status-text">{t("getSBT.steps.step3.pending")}</p>
                  )}
                </div>
              </div>
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
              <span className="label">{t("getSBT.contractInfo.network")}</span>
              <span className="value">{t("getSBT.contractInfo.sepolia")}</span>
            </div>
            <div className="info-row">
              <span className="label">{t("getSBT.contractInfo.minLock")}</span>
              <span className="value highlight">0.3 stGT</span>
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
