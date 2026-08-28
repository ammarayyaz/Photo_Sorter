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
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900">
              Discovered Individuals ({faceClusters.length} Face Clusters)
            </h2>
            <p className="text-[11px] text-slate-400">
              Faces grouped via local 512-dimensional cosine vector embeddings. Name a person once to route all matching photos to their folder.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-56">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search person..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none w-full"
          />
        </div>
      </div>

      {/* Clusters Grid */}
      {filteredClusters.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center text-slate-400">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-xs font-bold text-slate-700">No Face Clusters Discovered Yet</h3>
          <p className="text-[11px] max-w-sm mt-1">
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
                className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-3 transition-colors hover:border-blue-400"
              >
                {/* Face Thumbnail Representative */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-lg">
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
                        className="w-full bg-slate-50 border border-blue-500 rounded-lg px-2 py-1 text-xs text-slate-900 outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(cluster.clusterId)}
                        className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-900 truncate max-w-[170px]">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Target: /{displayName}/
                      </span>
                    </div>
                  )}

                  {!isEditing && (
                    <button
                      onClick={() => handleStartRename(cluster)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Rename person"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{cluster.associatedImageIds.length} Matches</span>
                  <span className="text-blue-600 font-semibold flex items-center gap-0.5">
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
