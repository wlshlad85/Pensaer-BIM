/**
 * Pensaer Command Registry
 *
 * Centralized command definitions for the command palette.
 * Commands are registered here and can be filtered/searched.
 */

import type { CommandCategory } from '../types';

/**
 * Command definition without action (actions are bound at runtime)
 */
export interface CommandDefinition {
  id: string;
  icon: string;
  label: string;
  shortcut?: string;
  category: CommandCategory;
  description: string;
  keywords?: string[]; // Additional search terms
}

/**
 * All available commands in the system
 */
export const commandDefinitions: CommandDefinition[] = [
  // Tools
  {
    id: 'tool.select',
    icon: 'fa-arrow-pointer',
    label: 'Select tool',
    shortcut: 'V',
    category: 'Tools',
    description: 'Select and modify elements',
    keywords: ['pointer', 'cursor', 'pick'],
  },
  {
    id: 'tool.wall',
    icon: 'fa-square',
    label: 'Wall tool',
    shortcut: 'W',
    category: 'Modeling',
    description: 'Draw walls',
    keywords: ['draw', 'create'],
  },
  {
    id: 'tool.door',
    icon: 'fa-door-open',
    label: 'Door tool',
    shortcut: 'D',
    category: 'Modeling',
    description: 'Place doors in walls',
    keywords: ['opening', 'entrance'],
  },
  {
    id: 'tool.window',
    icon: 'fa-window-maximize',
    label: 'Window tool',
    shortcut: 'N',
    category: 'Modeling',
    description: 'Place windows in walls',
    keywords: ['opening', 'glazing'],
  },
  {
    id: 'tool.room',
    icon: 'fa-vector-square',
    label: 'Room tool',
    shortcut: 'M',
    category: 'Spaces',
    description: 'Define room boundaries',
    keywords: ['space', 'area', 'zone'],
  },
  {
    id: 'tool.floor',
    icon: 'fa-square-full',
    label: 'Floor tool',
    shortcut: 'F',
    category: 'Modeling',
    description: 'Create floor slabs',
    keywords: ['slab', 'ground'],
  },
  {
    id: 'tool.roof',
    icon: 'fa-home',
    label: 'Roof tool',
    shortcut: 'R',
    category: 'Modeling',
    description: 'Create roof elements',
    keywords: ['cover', 'top'],
  },
  {
    id: 'tool.column',
    icon: 'fa-grip-lines-vertical',
    label: 'Column tool',
    shortcut: 'C',
    category: 'Structure',
    description: 'Place structural columns',
    keywords: ['pillar', 'post', 'structural'],
  },

  // Views
  {
    id: 'view.2d',
    icon: 'fa-table-cells',
    label: '2D Plan View',
    shortcut: '2',
    category: 'Views',
    description: 'Switch to 2D floor plan view',
    keywords: ['plan', 'flat', 'top'],
  },
  {
    id: 'view.3d',
    icon: 'fa-cube',
    label: '3D View',
    shortcut: '3',
    category: 'Views',
    description: 'Switch to 3D perspective view',
    keywords: ['perspective', 'orbit', 'model'],
  },
  {
    id: 'view.zoomIn',
    icon: 'fa-magnifying-glass-plus',
    label: 'Zoom In',
    shortcut: '⌘+',
    category: 'Views',
    description: 'Zoom in on canvas',
    keywords: ['magnify', 'enlarge'],
  },
  {
    id: 'view.zoomOut',
    icon: 'fa-magnifying-glass-minus',
    label: 'Zoom Out',
    shortcut: '⌘-',
    category: 'Views',
    description: 'Zoom out on canvas',
    keywords: ['shrink', 'reduce'],
  },
  {
    id: 'view.zoomFit',
    icon: 'fa-expand',
    label: 'Zoom to Fit',
    shortcut: '⌘0',
    category: 'Views',
    description: 'Fit all elements in view',
    keywords: ['reset', 'all', 'extent'],
  },

  // Edit
  {
    id: 'edit.undo',
    icon: 'fa-rotate-left',
    label: 'Undo',
    shortcut: '⌘Z',
    category: 'Edit',
    description: 'Undo last action',
    keywords: ['revert', 'back'],
  },
  {
    id: 'edit.redo',
    icon: 'fa-rotate-right',
    label: 'Redo',
    shortcut: '⌘⇧Z',
    category: 'Edit',
    description: 'Redo last undone action',
    keywords: ['forward'],
  },
  {
    id: 'edit.delete',
    icon: 'fa-trash',
    label: 'Delete Selected',
    shortcut: '⌫',
    category: 'Edit',
    description: 'Delete selected elements',
    keywords: ['remove', 'erase'],
  },
  {
    id: 'edit.selectAll',
    icon: 'fa-object-group',
    label: 'Select All',
    shortcut: '⌘A',
    category: 'Selection',
    description: 'Select all elements',
    keywords: ['all', 'everything'],
  },
  {
    id: 'edit.deselectAll',
    icon: 'fa-object-ungroup',
    label: 'Deselect All',
    shortcut: 'Esc',
    category: 'Selection',
    description: 'Clear selection',
    keywords: ['none', 'clear'],
  },

  // Analysis
  {
    id: 'analysis.validate',
    icon: 'fa-check-circle',
    label: 'Run Validation',
    shortcut: '⌘⇧V',
    category: 'Analysis',
    description: 'Check model for issues',
    keywords: ['check', 'errors', 'compliance'],
  },
  {
    id: 'analysis.clashDetection',
    icon: 'fa-burst',
    label: 'Clash Detection',
    category: 'Analysis',
    description: 'Find overlapping elements',
    keywords: ['collision', 'overlap', 'conflict'],
  },

  // Documentation
  {
    id: 'docs.doorSchedule',
    icon: 'fa-table-list',
    label: 'Door Schedule',
    category: 'Documentation',
    description: 'Generate door schedule',
    keywords: ['table', 'list', 'report'],
  },
  {
    id: 'docs.roomSchedule',
    icon: 'fa-list-check',
    label: 'Room Schedule',
    category: 'Documentation',
    description: 'Generate room schedule with areas',
    keywords: ['table', 'list', 'area'],
  },

  // System
  {
    id: 'system.settings',
    icon: 'fa-gear',
    label: 'Settings',
    shortcut: '⌘,',
    category: 'System',
    description: 'Open application settings',
    keywords: ['preferences', 'options', 'config'],
  },
  {
    id: 'system.help',
    icon: 'fa-circle-question',
    label: 'Help',
    shortcut: '?',
    category: 'System',
    description: 'Show keyboard shortcuts and help',
    keywords: ['shortcuts', 'documentation'],
  },
];

/**
 * Get commands grouped by category
 */
export function getCommandsByCategory(): Map<CommandCategory, CommandDefinition[]> {
  const grouped = new Map<CommandCategory, CommandDefinition[]>();

  for (const cmd of commandDefinitions) {
    const existing = grouped.get(cmd.category) || [];
    existing.push(cmd);
    grouped.set(cmd.category, existing);
  }

  return grouped;
}

/**
 * Get a specific command by ID
 */
export function getCommandById(id: string): CommandDefinition | undefined {
  return commandDefinitions.find((cmd) => cmd.id === id);
}
