import { useEffect, useState } from 'react';
import SafeAppsSDK from '@safe-global/safe-apps-sdk';

// Define SafeInfo type based on SDK response
interface SafeInfo {
  safeAddress: string;
  chainId: number;
  threshold: number;
  owners: string[];
  isReadOnly: boolean;
}

interface UseSafeAppReturn {
  sdk: SafeAppsSDK | null;
  safe: SafeInfo | null;
  isLoading: boolean;
  isSafeApp: boolean;
}

/**
 * Hook to detect if running inside a Gnosis Safe App
 * and provide Safe SDK instance and info
 */
export function useSafeApp(): UseSafeAppReturn {
  const [sdk] = useState(() => new SafeAppsSDK());
  const [safe, setSafe] = useState<SafeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSafeApp, setIsSafeApp] = useState(false);

  useEffect(() => {
    const detectSafe = async () => {
      try {
        // Try to get Safe info
        const safeInfo = await Promise.race([
          sdk.safe.getInfo(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 2000)
          )
        ]);

        if (safeInfo && 'safeAddress' in safeInfo) {
          setSafe(safeInfo);
          setIsSafeApp(true);
          console.log('Running in Safe App context:', safeInfo);
        } else {
          setIsSafeApp(false);
        }
      } catch (error) {
        // Not in Safe context or timeout
        setIsSafeApp(false);
        console.log('Not running in Safe App context');
      } finally {
        setIsLoading(false);
      }
    };

    detectSafe();
  }, [sdk]);

  return { sdk: isSafeApp ? sdk : null, safe, isLoading, isSafeApp };
}
