import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ethers } from "ethers";
import { getProvider } from "../../utils/rpc-provider";
import {
  detectPaymasterType,
  PaymasterType,
} from "../../utils/paymaster-detector";
import ManagePaymasterAOA from "./ManagePaymasterAOA";

/**
 * 统一 Paymaster 管理页面入口
 *
 * 自动检测 Paymaster 类型并路由到对应组件：
 * - AOA (PaymasterV4): ManagePaymasterAOA
 * - AOA+ (SuperPaymaster): ManagePaymasterAOAPlus (待实现)
 * - UNKNOWN: 显示错误信息
 */
export default function ManagePaymaster() {
  const [searchParams] = useSearchParams();
  const address = searchParams.get("address");

  const [loading, setLoading] = useState(true);
  const [paymasterType, setPaymasterType] = useState<PaymasterType>(
    PaymasterType.UNKNOWN
  );
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function detectType() {
      if (!address || !ethers.isAddress(address)) {
        setError("无效的 Paymaster 地址");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // 添加已知的 SuperPaymaster 地址（如果有）
        // TODO: 部署后更新此列表
        // addKnownSuperPaymasters([
        //   "0x...", // SuperPaymaster Sepolia 地址
        // ]);

        const provider = await getProvider();
        const info = await detectPaymasterType(address, provider);

        setPaymasterType(info.type);

        if (info.type === PaymasterType.UNKNOWN) {
          setError(
            "无法识别 Paymaster 类型，请确认合约地址是否正确部署"
          );
        }
      } catch (err: any) {
        console.error("Failed to detect paymaster type:", err);
        setError(`检测 Paymaster 类型失败: ${err.message}`);
        setPaymasterType(PaymasterType.UNKNOWN);
      } finally {
        setLoading(false);
      }
    }

    detectType();
  }, [address]);

  // 显示加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在检测 Paymaster 类型...</p>
          <p className="text-sm text-gray-400 mt-2">{address}</p>
        </div>
      </div>
    );
  }

  // 显示错误
  if (error || paymasterType === PaymasterType.UNKNOWN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6 bg-red-50 rounded-lg">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            无法识别 Paymaster
          </h2>
          <p className="text-red-600 mb-4">{error || "未知错误"}</p>
          <p className="text-sm text-gray-600 break-all">{address}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            重新检测
          </button>
        </div>
      </div>
    );
  }

  // 根据类型路由到对应组件
  if (paymasterType === PaymasterType.AOA) {
    // PaymasterV4 - 独立合约，单 operator
    return <ManagePaymasterAOA />;
  }

  if (paymasterType === PaymasterType.AOA_PLUS) {
    // SuperPaymaster - 统一合约，多 operator 账户
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6 bg-yellow-50 rounded-lg">
          <div className="text-yellow-600 text-5xl mb-4">🚧</div>
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            AOA+ 管理功能开发中
          </h2>
          <p className="text-yellow-600 mb-4">
            SuperPaymaster (AOA+) 管理页面即将上线
          </p>
          <p className="text-sm text-gray-600">
            检测到的合约类型: AOA+ (多 operator 账户)
          </p>
          <p className="text-sm text-gray-600 break-all mt-2">{address}</p>
        </div>
      </div>
    );
  }

  return null;
}
