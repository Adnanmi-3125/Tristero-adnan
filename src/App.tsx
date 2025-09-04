import { useState } from 'react';

type ViewMode = 'overview' | 'trading' | 'positions' | 'history';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  // Initialize real-time price streaming (disabled for now to avoid errors)
  // const { connectionState, isConnected } = useAutoPriceStream();
  const connectionState = 'disconnected';
  const isConnected = false;

  // Temporarily disable crypto assets data to avoid API issues
  // const { 
  //   data: assets, 
  //   isLoading, 
  //   error, 
  //   isRefetching 
  // } = useCryptoAssets();

  const isLoading = false;
  const error = null;
  const isRefetching = false;


  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'trading', label: 'Trading', icon: '💱' },
    { id: 'positions', label: 'Positions', icon: '📈' },
    { id: 'history', label: 'History', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Crypto Paper Trading</h1>

            {/* Portfolio Selector */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <select
                  disabled
                  className="bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>No Portfolio (Demo Mode)</option>
                </select>
                <button
                  disabled
                  className="px-3 py-2 bg-gray-600 text-gray-400 rounded-md text-sm font-medium cursor-not-allowed"
                >
                  + New
                </button>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Demo Balance</div>
                <div className="text-lg font-bold text-green-400">
                  $100,000.00
                </div>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                <span>WebSocket: {connectionState}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${!isLoading ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                <span>API: {isLoading ? 'Loading' : 'Connected'}</span>
              </div>

              {isRefetching && (
                <span className="text-blue-400">Updating...</span>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setViewMode(item.id as ViewMode)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                >
                  <span>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        {/* Error State */}
        {error && (
          <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-6">
            <h3 className="text-red-300 font-semibold mb-2">API Error</h3>
            <p className="text-red-200">
              {error && typeof error === 'object' && 'message' in error ? (error as Error).message : 'Failed to load market data'}
            </p>
          </div>
        )}

        {/* Demo Mode Message */}
        <div className="bg-blue-900 border border-blue-600 rounded-lg p-6 mb-6">
          <h3 className="text-blue-300 font-semibold mb-2">🚀 Demo Mode Active</h3>
          <p className="text-blue-200">
            This is a simplified demo version of the crypto trading platform. Full functionality will be restored once stability issues are resolved.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading market data...</p>
          </div>
        )}

        {/* Content Views */}
        {!isLoading && (
          <div className="space-y-6">
            {/* Overview Mode */}
            {viewMode === 'overview' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Asset List */}
                <div className="xl:col-span-1">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="text-xl font-semibold mb-2 text-white">Market Assets</h3>
                    <p className="text-gray-400">
                      Asset list will be available here (temporarily disabled)
                    </p>
                  </div>
                </div>

                {/* Positions Summary */}
                <div className="xl:col-span-1">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-4">📈</div>
                    <h3 className="text-xl font-semibold mb-2 text-white">No Positions Yet</h3>
                    <p className="text-gray-400">
                      Your trading positions will appear here once you start trading
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Trading Mode */}
            {viewMode === 'trading' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Asset List */}
                <div className="xl:col-span-1">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="text-xl font-semibold mb-2 text-white">Market Assets</h3>
                    <p className="text-gray-400">
                      Asset selection will be available here (temporarily disabled)
                    </p>
                  </div>
                </div>

                {/* Trading Form */}
                <div className="xl:col-span-1">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-4">💱</div>
                    <h3 className="text-xl font-semibold mb-2 text-white">Trading Form</h3>
                    <p className="text-gray-400">
                      Trading interface will be available here (temporarily disabled)
                    </p>
                  </div>
                </div>

                {/* Recent Positions */}
                <div className="xl:col-span-1">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-4">📈</div>
                    <h3 className="text-xl font-semibold mb-2 text-white">No Positions</h3>
                    <p className="text-gray-400">
                      Positions will appear here once you start trading
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Positions Mode */}
            {viewMode === 'positions' && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-semibold mb-2 text-white">No Positions Yet</h3>
                <p className="text-gray-400 mb-4">
                  Positions table will be available here (temporarily disabled)
                </p>
                <button
                  onClick={() => setViewMode('trading')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Go to Trading
                </button>
              </div>
            )}

            {/* History Mode */}
            {viewMode === 'history' && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-xl font-semibold mb-2 text-white">Transaction History</h3>
                <p className="text-gray-400">
                  Transaction history will be available here (temporarily disabled)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p>Paper Trading Platform • Real-time data provided by Hyperliquid API</p>
          <p className="mt-2">
            This is a simulated trading environment. No real money is involved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App
