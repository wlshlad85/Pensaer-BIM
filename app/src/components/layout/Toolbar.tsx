/**
 * Pensaer BIM Platform - Toolbar Component
 *
 * Vertical toolbar on the left side matching prototype exactly.
 */

import { useUIStore } from '../../stores';
import type { ToolType } from '../../types';

const TOOLS: { id: ToolType; icon: string; label: string }[] = [
  { id: 'select', icon: 'fa-arrow-pointer', label: 'Select (V)' },
  { id: 'wall', icon: 'fa-square', label: 'Wall (W)' },
  { id: 'door', icon: 'fa-door-open', label: 'Door (D)' },
  { id: 'window', icon: 'fa-window-maximize', label: 'Window (N)' },
  { id: 'room', icon: 'fa-vector-square', label: 'Room (M)' },
  { id: 'column', icon: 'fa-grip-lines-vertical', label: 'Column (C)' },
];

export function Toolbar() {
  const activeTool = useUIStore((s) => s.activeTool);
  const setTool = useUIStore((s) => s.setTool);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);

  return (
    <div className="w-12 bg-gray-900/50 border-r border-gray-700/50 flex flex-col items-center py-2 gap-1">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
            activeTool === tool.id
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-gray-500 hover:text-white hover:bg-gray-800'
          }`}
          title={tool.label}
          onClick={() => setTool(tool.id)}
        >
          <i className={`fa-solid ${tool.icon}`}></i>
        </button>
      ))}

      <div className="flex-1" />

      {/* More tools */}
      <button
        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg"
        title="More tools (⌘K)"
        onClick={openCommandPalette}
      >
        <i className="fa-solid fa-ellipsis"></i>
      </button>
    </div>
  );
}
