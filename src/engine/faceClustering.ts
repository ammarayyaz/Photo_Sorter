import { DetectedFace, FaceCluster } from './types';

/**
 * Computes the cosine distance between two normalized 512-D embedding vectors.
 * Returns value in range [0, 2], where 0 indicates identical orientation.
 */
export function cosineDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 1.0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 1.0;

  const similarity = dotProduct / denominator;
  return Math.max(0, 1 - similarity);
}

/**
 * Simple and efficient DBSCAN clustering on face embeddings.
 */
export function clusterFacesDBSCAN(
  faces: { face: DetectedFace; imageId: string; thumbnailUrl: string }[],
  epsilon: number = 0.38,
  minSamples: number = 1
): FaceCluster[] {
  const n = faces.length;
  if (n === 0) return [];

  const visited = new Array(n).fill(false);
  const clusterAssignments = new Array(n).fill(-1); // -1 = noise
  let clusterIdCounter = 1;

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = true;

    const neighbors = getNeighbors(i, faces, epsilon);

    if (neighbors.length < minSamples) {
      clusterAssignments[i] = -1; // noise or single face
    } else {
      expandCluster(i, neighbors, faces, clusterAssignments, visited, clusterIdCounter, epsilon, minSamples);
      clusterIdCounter++;
    }
  }

  // Group into FaceCluster objects
  const clustersMap = new Map<number, {
    faces: { face: DetectedFace; imageId: string; thumbnailUrl: string }[];
  }>();

  for (let i = 0; i < n; i++) {
    const cId = clusterAssignments[i];
    if (cId === -1) {
      // Create isolated individual cluster for unassigned faces
      const soloClusterId = clusterIdCounter++;
      clustersMap.set(soloClusterId, { faces: [faces[i]] });
    } else {
      if (!clustersMap.has(cId)) {
        clustersMap.set(cId, { faces: [] });
      }
      clustersMap.get(cId)!.faces.push(faces[i]);
    }
  }

  const result: FaceCluster[] = [];
  let displayIndex = 1;

  clustersMap.forEach((data, cId) => {
    const associatedImageIds = Array.from(new Set(data.faces.map((f) => f.imageId)));
    const sampleFace = data.faces[0];
    
    // Compute centroid vector
    const dim = sampleFace.face.embedding.length;
    const centroid = new Array(dim).fill(0);
    for (const item of data.faces) {
      for (let d = 0; d < dim; d++) {
        centroid[d] += item.face.embedding[d] / data.faces.length;
      }
    }

    result.push({
      clusterId: `cluster_${cId.toString().padStart(3, '0')}`,
      name: `Person ${displayIndex++}`,
      sampleAvatarUrl: sampleFace.thumbnailUrl,
      imageCount: associatedImageIds.length,
      associatedImageIds,
      centroid,
    });
  });

  // Sort clusters by frequency of appearance (largest first)
  return result.sort((a, b) => b.imageCount - a.imageCount);
}

function getNeighbors(
  index: number,
  faces: { face: DetectedFace }[],
  epsilon: number
): number[] {
  const neighbors: number[] = [];
  const targetEmb = faces[index].face.embedding;

  for (let j = 0; j < faces.length; j++) {
    const dist = cosineDistance(targetEmb, faces[j].face.embedding);
    if (dist <= epsilon) {
      neighbors.push(j);
    }
  }

  return neighbors;
}

function expandCluster(
  index: number,
  neighbors: number[],
  faces: { face: DetectedFace }[],
  assignments: number[],
  visited: boolean[],
  clusterId: number,
  epsilon: number,
  minSamples: number
) {
  assignments[index] = clusterId;

  let k = 0;
  while (k < neighbors.length) {
    const neighborIdx = neighbors[k];

    if (!visited[neighborIdx]) {
      visited[neighborIdx] = true;
      const neighborNeighbors = getNeighbors(neighborIdx, faces, epsilon);
      if (neighborNeighbors.length >= minSamples) {
        neighbors.push(...neighborNeighbors.filter((n) => !neighbors.includes(n)));
      }
    }

    if (assignments[neighborIdx] === -1 || assignments[neighborIdx] === undefined) {
      assignments[neighborIdx] = clusterId;
    }

    k++;
  }
}
