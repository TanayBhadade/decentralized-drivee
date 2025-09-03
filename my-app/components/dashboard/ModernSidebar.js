'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ModernSidebar = ({ activeSection, setActiveSection, account, disconnectWallet, onAIChatClick }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', description: 'Overview & stats' },
    { id: 'vault', label: 'My Vault', icon: '🗃️', description: 'File management' },
    { id: 'upload', label: 'Upload Center', icon: '⬆️', description: 'Add new files' },
    { id: 'ai-chat', label: 'AI File Chat', icon: '🤖', description: 'Chat with your files' },
    { id: 'analytics', label: 'Analytics', icon: '📈', description: 'Usage insights' },
    { id: 'settings', label: 'Settings', icon: '⚙️', description: 'Account settings' },
  ];

  const handleLogout = () => {
    disconnectWallet();
    router.push('/auth/login');
  };

  return (
    <div className={`bg-gradient-to-b from-space-indigo/90 to-purple-900/80 backdrop-blur-sm border-r border-electric-cyan/20 transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-80'
    } flex flex-col`}>
      {/* Header */}
      <div className="p-6 border-b border-electric-cyan/20">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-2xl font-bold text-light-silver">Vault</h1>
              <p className="text-light-silver/60 text-sm">Decentralized Storage</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg bg-electric-cyan/10 hover:bg-electric-cyan/20 transition-colors duration-200"
          >
            <span className="text-electric-cyan text-lg">
              {isCollapsed ? '→' : '←'}
            </span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'ai-chat') {
                onAIChatClick?.();
              } else {
                setActiveSection(item.id);
              }
            }}
            className={`w-full flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 ${
              activeSection === item.id
                ? 'bg-electric-cyan/20 border border-electric-cyan/30 text-electric-cyan'
                : 'text-light-silver/80 hover:bg-electric-cyan/10 hover:text-light-silver'
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            {!isCollapsed && (
              <div className="text-left">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs opacity-60">{item.description}</div>
              </div>
            )}
          </button>
        ))}
      </nav>



      {/* User Account */}
      <div className="p-4 border-t border-electric-cyan/20">
        {!isCollapsed && (
          <div className="bg-electric-cyan/10 rounded-xl p-4 mb-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-electric-cyan to-blue-400 rounded-full flex items-center justify-center">
                <span className="text-space-indigo font-bold">W</span>
              </div>
              <div className="flex-1">
                <p className="text-light-silver font-medium text-sm">Wallet Connected</p>
                <p className="text-light-silver/60 text-xs">
                  {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(account)}
                className="flex-1 px-3 py-2 bg-electric-cyan/20 text-electric-cyan text-xs rounded-lg hover:bg-electric-cyan/30 transition-colors duration-200"
              >
                Copy Address
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-3 py-2 bg-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-500/30 transition-colors duration-200"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
        
        {isCollapsed && (
          <button
            onClick={handleLogout}
            className="w-full p-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors duration-200"
            title="Disconnect Wallet"
          >
            <span className="text-lg">🚪</span>
          </button>
        )}
      </div>

      {/* Network Status */}
      {!isCollapsed && (
        <div className="p-4 border-t border-electric-cyan/20">
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-light-silver/80">Network: Polygon Amoy</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernSidebar;