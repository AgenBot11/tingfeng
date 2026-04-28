
export function Modal({ children, title, onClose }: { children: React.ReactNode, title: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-600 max-w-lg w-full text-center" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4 text-white">{title}</h3>
        {children}
        <button onClick={onClose} className="mt-6 bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded text-sm">关闭</button>
      </div>
    </div>
  );
}

