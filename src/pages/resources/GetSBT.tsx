import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ethers } from "ethers";
import { getCurrentNetworkConfig } from "../../config/networkConfig";
import { getRpcUrl } from "../../config/rpc";
import { MySBTABI, RegistryABI, GTokenABI } from "../../config/abis";
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
  const REGISTRY_ADDRESS = networkConfig.contracts.registryV2_1;
  const RPC_URL = getRpcUrl();

  // Constants
  const REQUIRED_GTOKEN = "0.4"; // Minimum 0.4 GT required
  const MINT_COST = "0.1"; // 0.1 GT will be burned/transferred
  const REFUND_AMOUNT = "0.3"; // 0.3 GT will be refunded if user quits

  // Wallet state
  const [account, setAccount] = useState<string>("");
  const [gTokenBalance, setGTokenBalance] = useState<string>("0");

  // Community selection state
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>("");
  const [communityName, setCommunityName] = useState<string>("");

  // SBT state
  const [existingSBT, setExistingSBT] = useState<string>("");
  const [sbtId, setSbtId] = useState<string>("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");

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
    } catch (err: any) {
      console.error(t("getSBT.console.walletConnectionFailed"), err);
      setError(err?.message || t("getSBT.errors.walletConnectionFailed"));
    }
  };

  // Load GToken balance
  const loadBalance = async (address: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
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

      // Check GToken balance
      if (parseFloat(gTokenBalance) < parseFloat(REQUIRED_GTOKEN)) {
        throw new Error(t("getSBT.errors.insufficientGToken", { required: REQUIRED_GTOKEN, current: gTokenBalance }));
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Approve GToken spending
      const gToken = new ethers.Contract(GTOKEN_ADDRESS, GTokenABI, signer);
      console.log(t("getSBT.console.approvingGToken"));
      const approveAmount = ethers.parseEther(REQUIRED_GTOKEN);
      const approveTx = await gToken.approve(MYSBT_ADDRESS, approveAmount);
      await approveTx.wait();

      // Mint MySBT
      const mySBT = new ethers.Contract(MYSBT_ADDRESS, MySBTABI, signer);
      console.log(t("getSBT.console.mintingMySBT", { community: selectedCommunity }));
      const tx = await mySBT.userMint(selectedCommunity, "{}");
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
          loadBalance(accounts[0]);
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
              <p className="mint-description">{t("getSBT.flow.description")}</p>

              {/* Account Info */}
              <div className="account-info-card">
                <div className="account-row">
                  <span className="label">{t("getSBT.flow.connectedAccount")}:</span>
                  <span className="mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
                </div>
              </div>

              {/* Balance Cards */}
              <div className="balance-cards">
                <div className="balance-card">
                  <div className="card-label">{t("getSBT.flow.gTokenBalance")}</div>
                  <div className="card-value">{parseFloat(gTokenBalance).toFixed(2)} GT</div>
                  <div className={`card-status ${parseFloat(gTokenBalance) >= parseFloat(REQUIRED_GTOKEN) ? "sufficient" : "insufficient"}`}>
                    {parseFloat(gTokenBalance) >= parseFloat(REQUIRED_GTOKEN) ? "✓ " + t("getSBT.balance.sufficient") : "⚠️ " + t("getSBT.balance.insufficient")}
                  </div>
                  {parseFloat(gTokenBalance) < parseFloat(REQUIRED_GTOKEN) && (
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
              {parseFloat(gTokenBalance) < parseFloat(REQUIRED_GTOKEN) && (
                <div className="warning-banner">
                  <span className="warning-icon">⚠️</span>
                  <div className="warning-content">
                    <strong>{t("getSBT.warnings.title")}</strong>
                    <p>{t("getSBT.warnings.insufficientGToken", { required: REQUIRED_GTOKEN, current: gTokenBalance })}</p>
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
                  parseFloat(gTokenBalance) < parseFloat(REQUIRED_GTOKEN)
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
