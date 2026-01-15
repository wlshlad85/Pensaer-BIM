/**
 * Pensaer BIM Platform - Properties Panel Component
 *
 * Right-side properties panel matching prototype exactly.
 * Now with inline property editing support.
 */

import { useState, useCallback } from 'react';
import { useModelStore, useSelectionStore, useUIStore, useHistoryStore } from '../../stores';
import type { Element } from '../../types';
import { validateModel, getValidationSummary } from '../../utils/validation';

// Icon mapping for element types
const TYPE_ICONS: Record<string, string> = {
  wall: 'fa-square',
  door: 'fa-door-open',
  window: 'fa-window-maximize',
  room: 'fa-vector-square',
  roof: 'fa-home',
  floor: 'fa-layer-group',
  column: 'fa-grip-lines-vertical',
};

// Color mapping for element types
const TYPE_COLORS: Record<string, string> = {
  wall: 'bg-slate-500/30 text-slate-300',
  door: 'bg-blue-500/30 text-blue-300',
  window: 'bg-cyan-500/30 text-cyan-300',
  room: 'bg-purple-500/30 text-purple-300',
  roof: 'bg-orange-500/30 text-orange-300',
  floor: 'bg-green-500/30 text-green-300',
  column: 'bg-gray-500/30 text-gray-300',
};

export function PropertiesPanel() {
  const elements = useModelStore((s) => s.elements);
  const addElement = useModelStore((s) => s.addElement);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const setSelected = useSelectionStore((s) => s.select);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const addToast = useUIStore((s) => s.addToast);
  const recordAction = useHistoryStore((s) => s.recordAction);

  // Handler for Add Roof button
  const handleAddRoof = useCallback(() => {
    // Get selected walls
    const selectedWalls = elements.filter(
      (el) => selectedIds.includes(el.id) && el.type === 'wall'
    );

    if (selectedWalls.length < 2) {
      addToast('info', 'Select at least 2 walls to create a roof');
      return;
    }

    // Calculate bounding box of selected walls
    const minX = Math.min(...selectedWalls.map((w) => w.x));
    const minY = Math.min(...selectedWalls.map((w) => w.y));
    const maxX = Math.max(...selectedWalls.map((w) => w.x + w.width));
    const maxY = Math.max(...selectedWalls.map((w) => w.y + w.height));

    // Create roof element
    const roofId = `roof-${Date.now()}`;
    const roofName = `Roof-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const newRoof: Element = {
      id: roofId,
      type: 'roof',
      name: roofName,
      x: minX - 10, // Slight overhang
      y: minY - 10,
      width: maxX - minX + 20,
      height: maxY - minY + 20,
      properties: {
        material: 'Metal Standing Seam',
        slope: '4:12',
        insulation: 'R-30',
        level: 'Level 1',
      },
      relationships: {
        supportedBy: selectedWalls.map((w) => w.id),
        covers: [],
      },
      issues: [],
      aiSuggestions: [],
    };

    addElement(newRoof);
    recordAction(`Create ${roofName}`);
    clearSelection();
    setSelected(roofId);
    addToast('success', `Created ${roofName} from ${selectedWalls.length} walls`);
  }, [elements, selectedIds, addElement, recordAction, clearSelection, setSelected, addToast]);

  // Handler for Check/Validate button
  const handleValidate = useCallback(() => {
    const { result, updatedElements } = validateModel(elements);

    // Update all elements with their validation issues
    updatedElements.forEach((el) => {
      const original = elements.find((e) => e.id === el.id);
      if (original && JSON.stringify(original.issues) !== JSON.stringify(el.issues)) {
        // Only update if issues changed
        useModelStore.getState().updateElement(el.id, { issues: el.issues });
      }
    });

    // Show summary toast
    const summary = getValidationSummary(result);
    if (result.totalIssues === 0) {
      addToast('success', summary);
    } else if (result.criticalCount > 0) {
      addToast('error', summary);
    } else if (result.warningCount > 0) {
      addToast('warning', summary);
    } else {
      addToast('info', summary);
    }

    recordAction('Run validation check');
  }, [elements, addToast, recordAction]);

  const selectedElement = selectedIds.length === 1
    ? elements.find((el) => el.id === selectedIds[0])
    : null;

  const issueElements = elements.filter((e) => e.issues.length > 0);

  return (
    <div className="w-72 bg-gray-900/50 border-l border-gray-700/50 flex flex-col overflow-hidden">
      {selectedElement ? (
        <SelectedElementView element={selectedElement} elements={elements} setSelected={setSelected} />
      ) : selectedIds.length > 1 ? (
        <MultiSelectView count={selectedIds.length} elements={elements} selectedIds={selectedIds} />
      ) : (
        <NoSelectionView elements={elements} issueElements={issueElements} setSelected={setSelected} />
      )}

      {/* Quick Actions */}
      <div className="p-3 border-t border-gray-700/50 bg-gray-800/30">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleValidate}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <i className="fa-solid fa-check-circle text-sm"></i>
            <span className="text-[10px]">Check</span>
          </button>
          <button
            onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg hover:text-white hover:bg-gray-800 ${viewMode === '3d' ? 'text-blue-400 bg-blue-500/20' : 'text-gray-400'}`}
          >
            <i className="fa-solid fa-cube text-sm"></i>
            <span className="text-[10px]">{viewMode === '3d' ? '2D View' : '3D View'}</span>
          </button>
          <button
            onClick={handleAddRoof}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <i className="fa-solid fa-home text-sm"></i>
            <span className="text-[10px]">Add Roof</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectedElementView({
  element,
  elements,
  setSelected
}: {
  element: Element;
  elements: Element[];
  setSelected: (id: string) => void;
}) {
  // Per-property inline editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const updateProperties = useModelStore((s) => s.updateProperties);
  const recordAction = useHistoryStore((s) => s.recordAction);
  const addToast = useUIStore((s) => s.addToast);

  // Double-click to start editing a single property
  const handleDoubleClick = useCallback((key: string, value: string | number | boolean) => {
    setEditingKey(key);
    setEditValue(String(value));
  }, []);

  // Save single property on blur or Enter
  const handleSaveProperty = useCallback((key: string) => {
    const originalValue = element.properties[key];
    const newValue = typeof originalValue === 'boolean'
      ? editValue.toLowerCase() === 'true' || editValue === 'yes'
      : typeof originalValue === 'number'
        ? parseFloat(editValue) || 0
        : editValue;

    if (String(newValue) !== String(originalValue)) {
      updateProperties(element.id, { [key]: newValue });
      recordAction(`Edit ${element.name}.${key}`);
      addToast('success', `Updated ${key}`);
    }

    setEditingKey(null);
    setEditValue('');
  }, [element.id, element.name, element.properties, editValue, updateProperties, recordAction, addToast]);

  // Cancel editing on Escape
  const handleKeyDown = useCallback((e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveProperty(key);
    } else if (e.key === 'Escape') {
      setEditingKey(null);
      setEditValue('');
    }
  }, [handleSaveProperty]);

  // Toggle boolean property with single click
  const handleBooleanToggle = useCallback((key: string, currentValue: boolean) => {
    const newValue = !currentValue;
    updateProperties(element.id, { [key]: newValue });
    recordAction(`Toggle ${element.name}.${key}`);
  }, [element.id, element.name, updateProperties, recordAction]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${TYPE_COLORS[element.type] || 'bg-gray-500/30 text-gray-300'}`}>
            <i className={`fa-solid ${TYPE_ICONS[element.type] || 'fa-cube'}`}></i>
          </div>
          <div>
            <div className="font-medium text-white">{element.name}</div>
            <div className="text-xs text-gray-400">
              {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Issues */}
      {element.issues.length > 0 && (
        <div className="px-4 py-3 bg-red-900/20 border-b border-red-900/30">
          <h3 className="text-xs font-medium text-red-400 uppercase mb-2 flex items-center gap-2">
            <i className="fa-solid fa-exclamation-triangle"></i>Issues
          </h3>
          {element.issues.map((issue, i) => (
            <div key={i} className="text-xs text-red-300 mb-1">{issue.message}</div>
          ))}
        </div>
      )}

      {/* Properties */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Properties</h3>
          <span className="text-[10px] text-gray-600">Double-click to edit</span>
        </div>
        <div className="space-y-2 text-sm">
          {Object.entries(element.properties).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center group">
              <span className="text-gray-500 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              {typeof value === 'boolean' ? (
                // Boolean: Single click toggle
                <button
                  onClick={() => handleBooleanToggle(key, value)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    value
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-400'
                  }`}
                  title="Click to toggle"
                >
                  {value ? 'Yes' : 'No'}
                </button>
              ) : editingKey === key ? (
                // Inline editing mode
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleSaveProperty(key)}
                  onKeyDown={(e) => handleKeyDown(e, key)}
                  autoFocus
                  className="w-28 bg-gray-800 border border-blue-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                />
              ) : (
                // Display mode - double-click to edit
                <span
                  onDoubleClick={() => handleDoubleClick(key, value)}
                  className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-gray-700 group-hover:ring-1 group-hover:ring-gray-600 transition-all"
                  title="Double-click to edit"
                >
                  {String(value)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Relationships */}
      {element.relationships && Object.keys(element.relationships).length > 0 && (
        <div className="p-4 border-b border-gray-700/50">
          <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">Relationships</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(element.relationships).map(([key, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;
              return (
                <div key={key}>
                  <span className="text-gray-500 capitalize text-xs">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(Array.isArray(value) ? value : [value]).map((id, i) => {
                      const rel = elements.find((e) => e.id === id);
                      return (
                        <button
                          key={i}
                          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded"
                          onClick={() => setSelected(id)}
                        >
                          {rel?.name || id}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {element.aiSuggestions.length > 0 && (
        <div className="p-4 bg-purple-900/10">
          <h3 className="text-xs font-medium text-purple-400 uppercase mb-3 flex items-center gap-2">
            <i className="fa-solid fa-wand-magic-sparkles"></i>AI Suggestions
          </h3>
          <div className="space-y-2">
            {element.aiSuggestions.map((sug, i) => (
              <button
                key={i}
                className={`w-full text-left p-2 rounded-lg text-xs ${
                  sug.priority === 'high'
                    ? 'bg-orange-900/30 hover:bg-orange-900/50 text-orange-300'
                    : sug.priority === 'medium'
                      ? 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-300'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                }`}
              >
                <i className={`fa-solid ${sug.icon} mr-2`}></i>
                {sug.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MultiSelectView({
  count,
  elements,
  selectedIds
}: {
  count: number;
  elements: Element[];
  selectedIds: string[];
}) {
  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
  const typeCounts = selectedElements.reduce((acc, el) => {
    acc[el.type] = (acc[el.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="text-center py-4">
        <div className="w-12 h-12 mx-auto rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
          <i className="fa-solid fa-object-group text-xl"></i>
        </div>
        <div className="font-medium text-white">{count} elements selected</div>
        <div className="text-xs text-gray-400 mt-1">
          {Object.entries(typeCounts)
            .map(([type, c]) => `${c} ${type}${c > 1 ? 's' : ''}`)
            .join(', ')}
        </div>
      </div>
      <div className="space-y-2 mt-4">
        <button className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
          <i className="fa-solid fa-copy mr-2"></i>Copy all
        </button>
        <button className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
          <i className="fa-solid fa-layer-group mr-2"></i>Copy to other levels
        </button>
        <button className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded-lg">
          <i className="fa-solid fa-trash mr-2"></i>Delete all
        </button>
      </div>
    </div>
  );
}

function NoSelectionView({
  elements,
  issueElements,
  setSelected
}: {
  elements: Element[];
  issueElements: Element[];
  setSelected: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="text-center py-8 text-gray-500">
        <i className="fa-solid fa-mouse-pointer text-3xl mb-3 opacity-50"></i>
        <p className="text-sm">Click an element to see properties</p>
        <p className="text-xs mt-1">Right-click for quick actions</p>
      </div>

      <h3 className="text-xs font-medium text-gray-500 uppercase mt-4 mb-3">Model Summary</h3>
      <div className="space-y-2 text-sm">
        {['wall', 'door', 'window', 'room', 'roof'].map((type) => (
          <div key={type} className="flex justify-between">
            <span className="text-gray-500 capitalize">{type}s</span>
            <span className="text-white">{elements.filter((e) => e.type === type).length}</span>
          </div>
        ))}
      </div>

      {issueElements.length > 0 && (
        <>
          <h3 className="text-xs font-medium text-gray-500 uppercase mt-6 mb-3">
            Issues ({issueElements.reduce((acc, e) => acc + e.issues.length, 0)})
          </h3>
          <div className="space-y-2">
            {issueElements.map((el) =>
              el.issues.map((issue, i) => (
                <button
                  key={`${el.id}-${i}`}
                  className="w-full text-left p-2 bg-red-900/20 hover:bg-red-900/30 rounded-lg text-xs text-red-300"
                  onClick={() => setSelected(el.id)}
                >
                  <div className="font-medium">{el.name}</div>
                  <div className="text-red-400/80 mt-0.5">{issue.message}</div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
