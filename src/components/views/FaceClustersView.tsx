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
      <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-4 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F94500]/15 text-[#F94500] flex items-center justify-center font-bold border border-[#F94500]/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">
              Discovered Individuals ({faceClusters.length} Face Clusters)
            </h2>
            <p className="text-[11px] text-[#6B5B7E] dark:text-[#BCACCE]">
              Faces grouped via local 512-dimensional cosine vector embeddings. Name a person once to route all matching photos to their folder.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#FAF8FD] dark:bg-[#2E074E] border border-[#E7E0EE] dark:border-[#4C177D] rounded-xl px-3 py-1.5 w-56">
          <Search className="w-3.5 h-3.5 text-[#BCACCE]" />
          <input
            type="text"
            placeholder="Search person..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent text-xs text-[#23003F] dark:text-white placeholder:text-[#BCACCE] outline-none w-full"
          />
        </div>
      </div>

      {/* Clusters Grid */}
      {filteredClusters.length === 0 ? (
        <div className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-12 text-center flex flex-col items-center justify-center text-[#BCACCE]">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF8FD] dark:bg-[#2A0548] border border-[#E7E0EE] dark:border-[#4C177D] flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-[#BCACCE]" />
          </div>
          <h3 className="text-xs font-bold text-[#23003F] dark:text-[#FFFDB4]">No Face Clusters Discovered Yet</h3>
          <p className="text-[11px] max-w-sm mt-1 text-[#6B5B7E] dark:text-[#BCACCE]">
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
                className="bg-white dark:bg-[#20003A] border border-[#E7E0EE] dark:border-[#4C177D] rounded-2xl p-3.5 flex flex-col gap-3 transition-colors hover:border-[#F94500]"
              >
                {/* Face Thumbnail Representative */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#FAF8FD] dark:bg-[#2A0548] border border-[#E7E0EE] dark:border-[#4C177D] flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#F94500] to-[#23003F] text-[#FFFDB4] flex items-center justify-center font-bold text-lg shadow-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/60 text-white backdrop-blur-sm">
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
                        className="w-full bg-[#FAF8FD] dark:bg-[#2E074E] border border-[#F94500] rounded-lg px-2 py-1 text-xs text-[#23003F] dark:text-white outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(cluster.clusterId)}
                        className="p-1 rounded-lg bg-[#F94500] text-white hover:bg-[#D83C00] transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-[#23003F] dark:text-[#FFFDB4] truncate max-w-[170px]">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-[#BCACCE] font-mono">
                        Target: /{displayName}/
                      </span>
                    </div>
                  )}

                  {!isEditing && (
                    <button
                      onClick={() => handleStartRename(cluster)}
                      className="p-1.5 rounded-lg text-[#BCACCE] hover:text-[#F94500] hover:bg-[#F3EFF9] dark:hover:bg-[#320857] transition-colors cursor-pointer"
                      title="Rename person"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-[#E7E0EE] dark:border-[#4C177D] flex items-center justify-between text-[10px] text-[#BCACCE] font-mono">
                  <span>{cluster.associatedImageIds.length} Matches</span>
                  <span className="text-[#F94500] font-semibold flex items-center gap-0.5">
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
