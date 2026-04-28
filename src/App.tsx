
import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import QRCode from 'react-qr-code';
import { Modal } from './components/Modal';

interface VpnServer {
  id: number;
  hostName: string;
  ip: string;
  score: number;
  ping: number;
  speed: number;
  country: string;
  users: number;
  configBase64: string;
  localLatency?: number;
}

function App() {
  const [servers, setServers] = useState<VpnServer[]>([]);
  const [connectedIp, setConnectedIp] = useState('未连接');
  const [isConnected, setIsConnected] = useState(false);
  const [qrData, setQrData] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('https://vpn.st098.top/api/vpngate');
      
      // 1. Parse JSON wrapper from API
      const json = await res.json();
      if (!json.data) throw new Error("No data");
      
      const csv = json.data;
      const hash = res.headers.get('X-CSV-Hash') || '';

      // 2. Verify Hash
      const isValid = await invoke('verify_csv_hash', { csv, hash });
      if (!isValid) {
        alert('数据校验失败');
        return;
      }

      parseVpnGateData(csv);
    } catch (e) {
      console.error("API fetch failed", e);
    }
    setLoading(false);
  }, []);

  const parseVpnGateData = (csv: string) => {
    const lines = csv.split('\n');
    const dataStartIndex = lines.findIndex(l => l.includes('*vpn_servers')) + 2;
    const dataLines = lines.slice(dataStartIndex).filter(l => l.trim().length > 0);
    
    const parsed = dataLines.map((line, idx) => {
      const parts = line.split(',');
      if (parts.length < 15) return null;
      
      return {
        id: idx,
        hostName: parts[0],
        ip: parts[1],
        score: parseInt(parts[2]) || 0,
        ping: parseInt(parts[3]) || 0,
        speed: parseInt(parts[4]) || 0,
        country: parts[5],
        users: parseInt(parts[7]) || 0,
        configBase64: parts.slice(14).join(','),
      };
    }).filter(Boolean) as VpnServer[];

    const filtered = parsed.filter(s => s.score > 50 && s.ip && s.configBase64);
    setServers(filtered);
  };

  const measureLatency = async (ip: string): Promise<number> => {
    try {
      return await invoke('ping_host', { host: ip });
    } catch {
      return 9999;
    }
  };

  const runSpeedTest = async () => {
    const topServers = servers.slice(0, 20);
    for (const s of topServers) {
      const lat = await measureLatency(s.ip);
      setServers(prev => prev.map(item => item.id === s.id ? { ...item, localLatency: lat } : item));
    }
  };

  const shareServer = (server: VpnServer) => {
    try {
      const config = atob(server.configBase64);
      setQrData(config);
      setShowQr(true);
    } catch (e) {
      alert('配置解析失败');
    }
  };

  const connect = async (server: VpnServer) => {
    try {
      await invoke('connect_vpn', { configB64: server.configBase64 });
      setIsConnected(true);
      setConnectedIp(server.ip);
    } catch (e) {
      alert('连接失败: ' + e);
    }
  };

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const filteredServers = servers
    .filter(s => s.country.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.localLatency || a.ping) - (b.localLatency || b.ping));

  return (
    <div className="h-screen bg-[#0f172a] text-white flex flex-col">
      <header className="p-4 bg-[#1e293b] flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍃</span>
          <h1 className="text-xl font-bold text-brand">听风 VPN</h1>
        </div>
        <div className="flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-900/50 rounded-full border border-green-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">已连接: {connectedIp}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-900/50 rounded-full border border-red-500">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm">未连接</span>
            </div>
          )}
          <button onClick={runSpeedTest} className="text-sm bg-gray-700 px-3 py-1 rounded hover:bg-gray-600">测速</button>
        </div>
      </header>

      <div className="p-4 bg-[#1e293b] border-b border-gray-700">
        <input 
          type="text" 
          placeholder="搜索国家..." 
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center py-10">加载中...</div>
        ) : (
          <div className="grid gap-3">
            {filteredServers.slice(0, 50).map(server => (
              <div key={server.id} className="bg-[#1e293b] p-4 rounded-lg flex justify-between items-center hover:bg-[#25334d] transition">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">
                    {server.country.includes('Japan') ? '🇯🇵' : 
                     server.country.includes('United States') ? '🇺🇸' : 
                     server.country.includes('Korea') ? '🇰🇷' : '🌍'}
                  </span>
                  <div>
                    <div className="font-bold">{server.country}</div>
                    <div className="text-xs text-gray-400">{server.hostName} • {server.users} 在线</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">延迟</div>
                    <div className={`font-mono font-bold ${server.localLatency ? (server.localLatency < 100 ? 'text-green-400' : 'text-yellow-400') : 'text-gray-500'}`}>
                      {server.localLatency ? `${server.localLatency} ms` : '---'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => shareServer(server)}
                      className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm"
                    >
                      📱
                    </button>
                    <button 
                      onClick={() => connect(server)}
                      className="bg-brand hover:bg-green-600 px-4 py-1 rounded text-sm font-bold shadow-lg shadow-green-900/50"
                    >
                      连接
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showQr && <Modal onClose={() => setShowQr(false)} title="手机扫码连接">
        <div className="bg-white p-4 rounded-lg inline-block">
          <QRCode value={qrData} size={256} />
        </div>
        <p className="text-sm text-gray-400 mt-4 text-center">打开 Shadowrocket 扫码即可</p>
      </Modal>}

      <footer className="p-2 text-center text-gray-500 text-xs border-t border-gray-700 bg-[#1e293b]">
        <a href="#" className="hover:text-brand mr-4">❤️ 赞助开发者</a>
        <span>v1.0.1 (Optimized)</span>
      </footer>
    </div>
  );
}

export default App;

