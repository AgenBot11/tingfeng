
import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import QRCode from 'react-qr-code';
import { Modal } from './components/Modal';

// 定义服务器数据类型
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
  localLatency?: number; // 本地测速结果
}

function App() {
  const [servers, setServers] = useState<VpnServer[]>([]);
  const [connectedIp, setConnectedIp] = useState('未连接');
  const [isConnected, setIsConnected] = useState(false);
  const [qrData, setQrData] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // 拉取数据
  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      // 尝试从 API 获取
      const res = await fetch('https://vpn.st098.top/api/vpngate');
      const json = await res.json();
      
      if (json.status === 'ok' && json.data) {
        parseVpnGateData(json.data);
      }
    } catch (e) {
      console.error("API fetch failed", e);
    }
    setLoading(false);
  }, []);

  // 解析 VPNGate CSV
  const parseVpnGateData = (csv: string) => {
    const lines = csv.split('\n');
    const dataStartIndex = lines.findIndex(l => l.includes('*vpn_servers')) + 2;
    const dataLines = lines.slice(dataStartIndex).filter(l => l.trim().length > 0);
    
    const parsed = dataLines.map((line, idx) => {
      // 处理 CSV，注意最后一项是 Base64，可能包含逗号，需要特殊处理
      // 简单 split(',') 会破坏 Base64，但 VPNGate CSV 格式通常是逗号分隔，最后一项很长
      // 这里假设前 14 项不含逗号，剩下的都是 Base64
      // 更严谨的做法是匹配逗号，但前 14 项确实没有逗号
      
      // 实际上 OpenVPN config 里可能有逗号？不，Base64 不会有逗号。
      // 所以 split(',') 是安全的，除了最后一项。
      // 其实 Base64 字符串里可能有逗号吗？不可能。
      // 但是 CSV 字段本身如果有逗号会被双引号括起来。
      // 简单处理：split(',') 取前 14 个，剩下的合并。
      const parts = line.split(',');
      const base64Part = parts.slice(14).join(','); // 实际上只有 15 列，第 15 列是 base64
      
      return {
        id: idx,
        hostName: parts[0],
        ip: parts[1],
        score: parseInt(parts[2]) || 0,
        ping: parseInt(parts[3]) || 0,
        speed: parseInt(parts[4]) || 0,
        country: parts[5],
        users: parseInt(parts[7]) || 0,
        configBase64: base64Part.trim(),
      };
    });

    // 过滤低分节点
    const filtered = parsed.filter(s => s.score > 50 && s.ip && s.configBase64);
    setServers(filtered);
  };

  // 本地测速 (简单 TCP 连接测试)
  const measureLatency = async (ip: string, port: number): Promise<number> => {
    // 在浏览器环境无法直接 Ping，这里模拟或者用 fetch 测 API 延迟
    // 在 Tauri 中可以通过 Rust 调用系统 ping
    // 简单起见，这里用 fetch 一个极小资源测时间
    const start = performance.now();
    try {
      await fetch(`http://${ip}:${port}`, { mode: 'no-cors', cache: 'no-store' });
    } catch (e) {}
    return Math.round(performance.now() - start);
  };

  // 批量测速（仅对前 20 个节点）
  const runSpeedTest = async () => {
    const topServers = servers.slice(0, 20);
    for (const s of topServers) {
      const lat = await measureLatency(s.ip, 80); // 测 HTTP 端口延迟
      setServers(prev => prev.map(item => item.id === s.id ? { ...item, localLatency: lat } : item));
    }
  };

  // 分享二维码
  const shareServer = (server: VpnServer) => {
    try {
      const config = atob(server.configBase64);
      // 插入用户名密码
      // Shadowrocket 扫码直接认 ovpn 文本
      setQrData(config);
      setShowQr(true);
    } catch (e) {
      alert('配置解析失败');
    }
  };

  // 连接 VPN
  const connect = async (server: VpnServer) => {
    try {
      // 传递 Base64 给 Rust 处理
      await invoke('connect_vpn', { configB64: server.configBase64 });
      setIsConnected(true);
      setConnectedIp(server.ip);
    } catch (e) {
      alert('连接失败: ' + e);
    }
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 300000); // 5 分钟刷新
    return () => clearInterval(interval);
  }, [fetchServers]);

  // 过滤
  const filteredServers = servers
    .filter(s => s.country.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.localLatency || a.ping) - (b.localLatency || b.ping));

  return (
    <div className="h-screen bg-[#0f172a] text-white flex flex-col">
      {/* Header */}
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

      {/* Search */}
      <div className="p-4 bg-[#1e293b] border-b border-gray-700">
        <input 
          type="text" 
          placeholder="搜索国家 (例如: Japan, United States)..." 
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Server List */}
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
                      {server.localLatency ? `${server.localLatency} ms` : `${server.ping} ms`}
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-gray-400">速度</div>
                    <div className="font-mono text-blue-400">{(server.speed / 1000000).toFixed(1)} MB/s</div>
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

      {/* Modal for QR */}
      {showQr && <Modal onClose={() => setShowQr(false)} title="手机扫码连接">
        <div className="bg-white p-4 rounded-lg inline-block">
          <QRCode value={qrData} size={256} />
        </div>
        <p className="text-sm text-gray-400 mt-4 text-center">打开 Shadowrocket 扫码即可</p>
      </Modal>}

      {/* Footer */}
      <footer className="p-2 text-center text-gray-500 text-xs border-t border-gray-700 bg-[#1e293b]">
        <a href="#" className="hover:text-brand mr-4">❤️ 赞助开发者</a>
        <span>v1.0.0</span>
      </footer>
    </div>
  );
}

export default App;

