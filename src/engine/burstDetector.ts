import { ImageMetadata, BurstGroup, QualityMetrics } from './types';

/**
 * Calculates the Hamming distance between two binary hash strings.
 */
export function calculateHammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) return 64;
  let distance = 0;
  for (let i = 0; i < hashA.length; i++) {
    if (hashA[i] !== hashB[i]) distance++;
  }
  return distance;
}

/**
 * Groups images into burst clusters based on timestamp closeness and perceptual hash similarity.
 */
export function identifyBurstGroups(
  images: ImageMetadata[],
  qualityScores: Map<string, QualityMetrics>,
  timeWindowSec: number = 3.0,
  maxPHashDistance: number = 12
): BurstGroup[] {
  // Sort images chronologically
  const sorted = [...images].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const groups: BurstGroup[] = [];
  let currentGroup: ImageMetadata[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const img = sorted[i];

    if (currentGroup.length === 0) {
      currentGroup.push(img);
      continue;
    }

    const prevImg = currentGroup[currentGroup.length - 1];
    const timeDeltaSec =
      Math.abs(new Date(img.timestamp).getTime() - new Date(prevImg.timestamp).getTime()) / 1000;
    const pHashDist = calculateHammingDistance(img.pHash, prevImg.pHash);

    // If within time window and perceptually similar -> add to current burst group
    if (timeDeltaSec <= timeWindowSec && pHashDist <= maxPHashDistance) {
      currentGroup.push(img);
    } else {
      // Finalize current group
      groups.push(createBurstGroup(currentGroup, qualityScores));
      currentGroup = [img];
    }
  }

  if (currentGroup.length > 0) {
    groups.push(createBurstGroup(currentGroup, qualityScores));
  }

  return groups;
}

function createBurstGroup(
  members: ImageMetadata[],
  qualityScores: Map<string, QualityMetrics>
): BurstGroup {
  const groupId = `burst_${members[0].id.substring(0, 8)}`;
  const imageIds = members.map((m) => m.id);

  if (members.length === 1) {
    return {
      groupId,
      timestampRange: {
        start: members[0].timestamp,
        end: members[0].timestamp,
      },
      imageIds,
      primaryWinnerId: members[0].id,
      rejectedIds: [],
    };
  }

  // Find the member with the highest composite quality score
  let bestId = members[0].id;
  let bestScore = -1;

  for (const member of members) {
    const scoreObj = qualityScores.get(member.id);
    const score = scoreObj ? scoreObj.compositeScore : 50;
    if (score > bestScore) {
      bestScore = score;
      bestId = member.id;
    }
  }

  const rejectedIds = imageIds.filter((id) => id !== bestId);

  return {
    groupId,
    timestampRange: {
      start: members[0].timestamp,
      end: members[members.length - 1].timestamp,
    },
    imageIds,
    primaryWinnerId: bestId,
    rejectedIds,
  };
}
