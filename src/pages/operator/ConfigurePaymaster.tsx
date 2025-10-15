import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface ConfigurePaymasterProps {
  paymasterAddress: string;
  onComplete: (sbtAddress: string, gasTokenAddress: string) => void;
  onBack: () => void;
}

const PAYMASTER_V4_ABI = [
  'function owner() view returns (address)',
  'function addSBT(address) external',
  'function addGasToken(address) external',
  'function sbtList(uint256) view returns (address)',
  'function gasTokenList(uint256) view returns (address)',
];

export function ConfigurePaymaster({
  paymasterAddress,
  onComplete,
  onBack
}: ConfigurePaymasterProps) {
  const [sbtMode, setSbtMode] = useState<'existing' | 'deploy'>('existing');
  const [sbtAddress, setSbtAddress] = useState('');
  const [gasTokenMode, setGasTokenMode] = useState<'existing' | 'deploy'>('existing');
  const [gasTokenAddress, setGasTokenAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [step, setStep] = useState<'sbt' | 'gastoken' | 'link'>('sbt');

  // Check ownership
  useEffect(() => {
    async function checkOwnership() {
      if (!window.ethereum) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();

        const paymaster = new ethers.Contract(
          paymasterAddress,
          PAYMASTER_V4_ABI,
          provider
        );

        const owner = await paymaster.owner();
        setIsOwner(owner.toLowerCase() === userAddress.toLowerCase());
      } catch (err) {
        console.error('Failed to check ownership:', err);
      }
    }

    checkOwnership();
  }, [paymasterAddress]);

  // Handle SBT setup
  const handleSBTSetup = async () => {
    if (sbtMode === 'existing') {
      if (!ethers.isAddress(sbtAddress)) {
        setError('Invalid SBT address');
        return;
      }
      setStep('gastoken');
    } else {
      // Deploy new SBT
      setLoading(true);
      setError(null);

      try {
        // TODO: Implement SBT factory deployment
        alert('⚠️ SBT Factory deployment not yet implemented\n\nPlease use an existing SBT contract for now.');
        setError('Please select "Use Existing SBT"');
      } catch (err: any) {
        setError('SBT deployment failed: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle GasToken setup
  const handleGasTokenSetup = async () => {
    if (gasTokenMode === 'existing') {
      if (!ethers.isAddress(gasTokenAddress)) {
        setError('Invalid GasToken address');
        return;
      }
      setStep('link');
    } else {
      // Deploy new GasToken
      setLoading(true);
      setError(null);

      try {
        // TODO: Implement GasTokenFactoryV2 deployment
        alert('⚠️ GasToken Factory deployment not yet implemented\n\nPlease use an existing GasToken contract for now.');
        setError('Please select "Use Existing GasToken"');
      } catch (err: any) {
        setError('GasToken deployment failed: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Link SBT and GasToken to Paymaster
  const handleLinkToPaymaster = async () => {
    if (!isOwner) {
      setError('You are not the owner of this Paymaster');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const paymaster = new ethers.Contract(
        paymasterAddress,
        PAYMASTER_V4_ABI,
        signer
      );

      // Add SBT
      console.log('Adding SBT:', sbtAddress);
      const sbtTx = await paymaster.addSBT(sbtAddress);
      await sbtTx.wait();
      console.log('SBT added successfully');

      // Add GasToken
      console.log('Adding GasToken:', gasTokenAddress);
      const tokenTx = await paymaster.addGasToken(gasTokenAddress);
      await tokenTx.wait();
      console.log('GasToken added successfully');

      alert('✅ Configuration complete!\n\nSBT and GasToken have been linked to your Paymaster.');
      onComplete(sbtAddress, gasTokenAddress);

    } catch (err: any) {
      console.error('Link failed:', err);
      setError('Failed to link contracts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner && window.ethereum) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Step 2: Configure Paymaster</h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ⚠️ You are not the owner of this Paymaster contract.
        </div>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-300 rounded-lg">
          Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Step 2: Configure Paymaster</h2>
      <p className="text-gray-600 mb-6">
        Set up SBT (membership verification) and GasToken (payment token) for your Paymaster.
      </p>

      {/* Progress sub-steps */}
      <div className="mb-6 flex items-center gap-4">
        <SubStep label="SBT" active={step === 'sbt'} completed={step !== 'sbt'} />
        <div className="flex-1 h-0.5 bg-gray-300"></div>
        <SubStep label="GasToken" active={step === 'gastoken'} completed={step === 'link'} />
        <div className="flex-1 h-0.5 bg-gray-300"></div>
        <SubStep label="Link" active={step === 'link'} completed={false} />
      </div>

      {/* Step: SBT */}
      {step === 'sbt' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">2.1 Set up SBT Contract</h3>
          <p className="text-gray-600 mb-4">
            SBT (Soulbound Token) is used to verify community membership.
          </p>

          <div className="space-y-4">
            <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                checked={sbtMode === 'existing'}
                onChange={() => setSbtMode('existing')}
                className="mr-3"
              />
              <div>
                <div className="font-semibold">Use Existing SBT Contract</div>
                <div className="text-sm text-gray-600">Enter an existing SBT contract address</div>
              </div>
            </label>

            {sbtMode === 'existing' && (
              <input
                type="text"
                value={sbtAddress}
                onChange={(e) => setSbtAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}

            <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                checked={sbtMode === 'deploy'}
                onChange={() => setSbtMode('deploy')}
                className="mr-3"
              />
              <div>
                <div className="font-semibold">Deploy New SBT</div>
                <div className="text-sm text-gray-600">Use factory contract to deploy (not yet implemented)</div>
              </div>
            </label>
          </div>

          <button
            onClick={handleSBTSetup}
            disabled={loading || (sbtMode === 'existing' && !sbtAddress)}
            className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
          >
            Next: Configure GasToken
          </button>
        </div>
      )}

      {/* Step: GasToken */}
      {step === 'gastoken' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">2.2 Set up GasToken (PNT)</h3>
          <p className="text-gray-600 mb-4">
            GasToken is the ERC20 token users will use to pay for gas.
          </p>

          <div className="space-y-4">
            <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                checked={gasTokenMode === 'existing'}
                onChange={() => setGasTokenMode('existing')}
                className="mr-3"
              />
              <div>
                <div className="font-semibold">Use Existing GasToken Contract</div>
                <div className="text-sm text-gray-600">Enter an existing GasToken address</div>
              </div>
            </label>

            {gasTokenMode === 'existing' && (
              <input
                type="text"
                value={gasTokenAddress}
                onChange={(e) => setGasTokenAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}

            <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                checked={gasTokenMode === 'deploy'}
                onChange={() => setGasTokenMode('deploy')}
                className="mr-3"
              />
              <div>
                <div className="font-semibold">Deploy New GasToken</div>
                <div className="text-sm text-gray-600">Use GasTokenFactoryV2 (not yet implemented)</div>
              </div>
            </label>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => setStep('sbt')}
              className="px-6 py-3 bg-gray-300 rounded-lg hover:bg-gray-400"
            >
              Back
            </button>
            <button
              onClick={handleGasTokenSetup}
              disabled={loading || (gasTokenMode === 'existing' && !gasTokenAddress)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
            >
              Next: Link to Paymaster
            </button>
          </div>
        </div>
      )}

      {/* Step: Link */}
      {step === 'link' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">2.3 Link to Paymaster</h3>
          <p className="text-gray-600 mb-4">
            Connect the SBT and GasToken contracts to your Paymaster.
          </p>

          <div className="space-y-3 mb-6">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">SBT Address:</div>
              <div className="font-mono text-sm">{sbtAddress}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">GasToken Address:</div>
              <div className="font-mono text-sm">{gasTokenAddress}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Paymaster Address:</div>
              <div className="font-mono text-sm">{paymasterAddress}</div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg mb-6">
            <h4 className="font-semibold mb-2">📋 Actions to be performed:</h4>
            <ol className="text-sm text-gray-700 space-y-1">
              <li>1. Call paymaster.addSBT({sbtAddress.slice(0, 10)}...)</li>
              <li>2. Call paymaster.addGasToken({gasTokenAddress.slice(0, 10)}...)</li>
            </ol>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep('gastoken')}
              className="px-6 py-3 bg-gray-300 rounded-lg hover:bg-gray-400"
              disabled={loading}
            >
              Back
            </button>
            <button
              onClick={handleLinkToPaymaster}
              disabled={loading}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300"
            >
              {loading ? 'Linking...' : 'Link to Paymaster'}
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && step !== 'link' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

// Sub-step indicator
function SubStep({
  label,
  active,
  completed
}: {
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className={`
      px-3 py-1 rounded-full text-sm font-semibold
      ${completed ? 'bg-green-500 text-white' : ''}
      ${active && !completed ? 'bg-blue-500 text-white' : ''}
      ${!active && !completed ? 'bg-gray-200 text-gray-500' : ''}
    `}>
      {completed ? '✓ ' : ''}{label}
    </div>
  );
}
