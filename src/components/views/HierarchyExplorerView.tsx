import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileImage,
  ChevronRight,
  ChevronDown,
  Compass,
  ExternalLink
} from 'lucide-react';
import { ProcessedItem } from '../../engine/types';

interface HierarchyExplorerViewProps {
  items: ProcessedItem[];
  destinationDirectory: string;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  item?: ProcessedItem;
  children?: TreeNode[];
}

export const HierarchyExplorerView: React.FC<HierarchyExplorerViewProps> = ({
  items,
  destinationDirectory,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    root: true,
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const buildTree = (): TreeNode => {
    const root: TreeNode = {
      name: destinationDirectory.split('/').pop() || 'Organized_Output',
      path: 'root',
      isFolder: true,
      children: [],
    };

    items.forEach((item) => {
      const parts = item.targetPath.split('/').filter(Boolean);
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const currentPath = `${current.path}/${part}`;

        if (isLast) {
          if (!current.children) current.children = [];
          current.children.push({
            name: part,
            path: currentPath,
            isFolder: false,
            item,
          });
        } else {
          if (!current.children) current.children = [];
          let folder = current.children.find((c) => c.name === part && c.isFolder);
          if (!folder) {
            folder = {
              name: part,
              path: currentPath,
              isFolder: true,
              children: [],
            };
            current.children.push(folder);
          }
          current = folder;
        }
      }
    });

    return root;
  };

  const tree = buildTree();

  const renderTree = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders[node.path] ?? true;

    if (node.isFolder) {
      return (
        <div key={node.path} className="flex flex-col">
          <div
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft: `${depth * 18 + 8}px` }}
            className="flex items-center gap-2 py-1.5 px-2 hover:bg-slate-100 dark:hover:bg-[#181818] rounded-lg cursor-pointer transition-colors text-xs font-semibold text-[#111827] dark:text-white"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-[#4D694E]" />
            ) : (
              <Folder className="w-4 h-4 text-[#4D694E]" />
            )}
            <span className="truncate">{node.name}</span>
            {node.children && (
              <span className="text-2xs text-[#9CA3AF] font-mono">
                ({node.children.length})
              </span>
            )}
          </div>

          {isExpanded && node.children && (
            <div className="flex flex-col">
              {node.children.map((child) => renderTree(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        style={{ paddingLeft: `${depth * 18 + 24}px` }}
        className="flex items-center justify-between py-1 px-2 hover:bg-slate-50 dark:hover:bg-[#181818] rounded-lg text-xs text-[#111827] dark:text-white font-medium"
      >
        <div className="flex items-center gap-2 truncate">
          <FileImage className="w-3.5 h-3.5 text-[#4D694E] flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </div>

        {node.item && (
          <div className="flex items-center gap-2 text-2xs font-mono text-[#9CA3AF]">
            {node.item.geometry.correctedAngleDeg !== 0 && (
              <span className="text-[#4D694E] bg-[#4D694E]/10 px-1 rounded flex items-center gap-0.5 font-bold">
                <Compass className="w-2.5 h-2.5" />
                {node.item.geometry.correctedAngleDeg > 0 ? '+' : ''}
                {node.item.geometry.correctedAngleDeg.toFixed(1)}°
              </span>
            )}
            <span>{(node.item.metadata.fileSize / 1000000).toFixed(1)} MB</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl overflow-y-auto pr-2 pb-6 select-none">
      {/* Header Info */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-[#111827] dark:text-white">
            Target Folder Hierarchy Preview
          </h2>
          <p className="text-2xs text-[#9CA3AF] font-mono">
            {destinationDirectory}
          </p>
        </div>

        <button
          onClick={() => alert(`Opening OS directory: ${destinationDirectory}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#181818] hover:bg-slate-100 dark:hover:bg-[#222222] border border-[#E5E7EB] dark:border-[#27272A] text-xs font-semibold text-[#111827] dark:text-white transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open Explorer</span>
        </button>
      </div>

      {/* Tree Content */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 min-h-[350px]">
        {items.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-[#9CA3AF]">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-center mb-3">
              <Folder className="w-6 h-6 text-[#9CA3AF]" />
            </div>
            <h3 className="text-xs font-bold text-[#111827] dark:text-white">No Organized Hierarchy Generated Yet</h3>
            <p className="text-xs max-w-sm mt-1 text-[#4B5563] dark:text-[#A1A1AA]">
              Start the sorting pipeline to categorize photos by date, occasion, and detected people.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 font-mono text-xs">
            {renderTree(tree)}
          </div>
        )}
      </div>
    </div>
  );
};
