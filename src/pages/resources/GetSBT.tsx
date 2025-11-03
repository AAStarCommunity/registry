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
  const REQUIRED_GTOKEN = "0.3"; // Minimum 0.3 GT required
  const MINT_COST = "0.1"; // 0.1 GT will be burned/transferred
  const REFUND_AMOUNT = "0.2"; // 0.2 GT will be refunded if user quits

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

              {/* Account Info */}
              <div className="account-info">
                <p className="account-display">
                  {t("getSBT.flow.connectedAccount")}: <span className="mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
                </p>
              </div>

              {/* Balance */}
              <div className="balance-display">
                <div className="balance-item">
                  <span className="label">{t("getSBT.flow.gTokenBalance")}</span>
                  <span className="value">{parseFloat(gTokenBalance).toFixed(2)} GT</span>
                </div>
              </div>

              {/* Mint Requirements */}
              <div className="mint-requirements">
                <h3>{t("getSBT.requirements.title")}</h3>
                <ul className="requirements-list">
                  <li className={parseFloat(gTokenBalance) >= parseFloat(REQUIRED_GTOKEN) ? "met" : "unmet"}>
                    {parseFloat(gTokenBalance) >= parseFloat(REQUIRED_GTOKEN) ? "✓" : "○"} {t("getSBT.requirements.minBalance", { amount: REQUIRED_GTOKEN })}
                  </li>
                  <li className={selectedCommunity ? "met" : "unmet"}>
                    {selectedCommunity ? "✓" : "○"} {t("getSBT.requirements.selectCommunity")}
                  </li>
                </ul>

                <div className="cost-breakdown">
                  <h4>{t("getSBT.costBreakdown.title")}</h4>
                  <div className="cost-item">
                    <span>{t("getSBT.costBreakdown.stakingRequired")}</span>
                    <strong>{REQUIRED_GTOKEN} GT</strong>
                  </div>
                  <div className="cost-item">
                    <span>{t("getSBT.costBreakdown.mintCost")}</span>
                    <strong>{MINT_COST} GT</strong>
                  </div>
                  <div className="cost-item refund">
                    <span>{t("getSBT.costBreakdown.refundOnQuit")}</span>
                    <strong>{REFUND_AMOUNT} GT</strong>
                  </div>
                  <div className="cost-explanation">
                    <p>{t("getSBT.costBreakdown.explanation")}</p>
                  </div>
                </div>
              </div>

              {/* Community Selection */}
              <div className="community-selection">
                <label>{t("getSBT.communitySelect.label")}</label>
                <select
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
                  <p className="selected-community-info">
                    {t("getSBT.communitySelect.selected")}: <strong>{communityName}</strong>
                  </p>
                )}
              </div>

              {/* Warnings */}
              {parseFloat(gTokenBalance) < parseFloat(REQUIRED_GTOKEN) && (
                <div className="warning-box">
                  <p>⚠️ {t("getSBT.warnings.insufficientGToken", { required: REQUIRED_GTOKEN, current: gTokenBalance })}</p>
                </div>
              )}

              {/* Mint Button */}
              <button
                className="action-button primary mint-button"
                onClick={handleMintMySBT}
                disabled={
                  isMinting ||
                  !selectedCommunity ||
                  parseFloat(gTokenBalance) < parseFloat(REQUIRED_GTOKEN)
                }
              >
                {isMinting ? t("getSBT.buttons.minting") : t("getSBT.buttons.mintMySBT")}
              </button>

              {/* Transaction Success */}
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
