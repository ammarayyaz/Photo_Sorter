import React, { useState } from 'react';
import {
  Users,
  Edit2,
  Check,
  Sparkles,
  Search
} from 'lucide-react';
import { FaceCluster } from '../../engine/types';

interface FaceClustersViewProps {
  faceClusters: FaceCluster[];
  onRenameCluster: (clusterId: string, newName: string) => void;
}

export const FaceClustersView: React.FC<FaceClustersViewProps> = ({
  faceClusters,
  onRenameCluster,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [filter, setFilter] = useState<string>('');

  const handleStartRename = (cluster: FaceCluster) => {
    setEditingId(cluster.clusterId);
    setEditName(cluster.name || `Person ${cluster.clusterId}`);
  };

  const handleSaveRename = (clusterId: string) => {
    if (editName.trim()) {
      onRenameCluster(clusterId, editName.trim());
    }
    setEditingId(null);
  };

  const filteredClusters = faceClusters.filter((c) =>
    (c.name || `Person ${c.clusterId}`)
      .toLowerCase()
      .includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 max-w-5xl overflow-y-auto pr-2 pb-6 select-none">
      {/* Header Info */}
      <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-4 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#D83C00]/15 text-[#D83C00] flex items-center justify-center font-bold border border-[#D83C00]/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading text-xs font-bold text-[#111827] dark:text-white">
              Discovered Individuals ({faceClusters.length} Face Clusters)
            </h2>
            <p className="font-sans text-xs text-[#4B5563] dark:text-[#A1A1AA]">
              Faces grouped via local 512-dimensional cosine vector embeddings. Name a person once to route all matching photos to their folder.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#F9FAFB] dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] rounded-xl px-3 py-1.5 w-56">
          <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search person..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent font-sans text-xs text-[#111827] dark:text-white placeholder:text-[#9CA3AF] outline-none w-full"
          />
        </div>
      </div>

      {/* Clusters Grid */}
      {filteredClusters.length === 0 ? (
        <div className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-12 text-center flex flex-col items-center justify-center text-[#9CA3AF]">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-[#9CA3AF]" />
          </div>
          <h3 className="font-heading text-xs font-bold text-[#111827] dark:text-white">No Face Clusters Discovered Yet</h3>
          <p className="font-sans text-xs max-w-sm mt-1 text-[#4B5563] dark:text-[#A1A1AA]">
            Run the sorting pipeline on portrait or event photos to extract face embeddings and cluster recurring individuals.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3.5">
          {filteredClusters.map((cluster) => {
            const isEditing = editingId === cluster.clusterId;
            const displayName = cluster.name || `Person ${cluster.clusterId}`;

            return (
              <div
                key={cluster.clusterId}
                className="bg-white dark:bg-[#0E0E0E] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-3.5 flex flex-col gap-3 transition-colors hover:border-[#D83C00]"
              >
                {/* Face Thumbnail Representative */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-[#181818] border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-[#D83C00] text-white flex items-center justify-center font-heading font-extrabold text-lg shadow-none">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-2xs font-mono tabular-nums bg-black/60 text-white backdrop-blur-sm">
                    {cluster.associatedImageIds.length} photos
                  </span>
                </div>

                {/* Name & Rename Action */}
                <div className="flex items-center justify-between">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(cluster.clusterId);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="w-full bg-[#F9FAFB] dark:bg-[#181818] border border-[#D83C00] rounded-lg px-2 py-1 font-sans text-xs text-[#111827] dark:text-white outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(cluster.clusterId)}
                        className="p-1 rounded-lg bg-[#D83C00] text-white hover:bg-[#B83300] transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-heading font-bold text-xs text-[#111827] dark:text-white truncate max-w-[170px]">
                        {displayName}
                      </span>
                      <span className="text-2xs text-[#9CA3AF] font-mono tabular-nums">
                        Target: /{displayName}/
                      </span>
                    </div>
                  )}

                  {!isEditing && (
                    <button
                      onClick={() => handleStartRename(cluster)}
                      className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#D83C00] hover:bg-slate-100 dark:hover:bg-[#181818] transition-colors cursor-pointer"
                      title="Rename person"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between text-2xs text-[#9CA3AF] font-mono tabular-nums">
                  <span>{cluster.associatedImageIds.length} Matches</span>
                  <span className="text-[#D83C00] font-heading font-bold flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    Auto-Routed
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
