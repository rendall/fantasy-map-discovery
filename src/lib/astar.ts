import { PackCell } from "./map-types";
const MARINE_BIOME_INDEX = 0
const heuristic = (cellA:PackCell, cellB:PackCell) => {
  const [x1, y1] = cellA.p;
  const [x2, y2] = cellB.p;
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
};

const reconstructPath = (cameFrom: Map<number, PackCell>, current: PackCell) => {
  const path = [current];
  while (cameFrom.has(current.i)) {
    current = cameFrom.get(current.i)!
    path.unshift(current);
  }
  return path;
};


/**
 * Calculates the slope penalty based on the height difference
 * between the current cell and its neighbor. This causes the
 * pathfinder to avoid steep slopes.
 *
 * @param currentHeight - The height of the current cell.
 * @param neighborHeight - The height of the neighboring cell.
 * @param heightExponent - The exponent used to amplify the height difference.
 * @param heightScalingFactor - An optional scaling factor to adjust the impact of the height difference (default: 1).
 * @returns The slope penalty. A higher penalty is applied when moving uphill, and a lower penalty is applied when moving downhill.
 */
const slopePenalty = (currentHeight: number, neighborHeight: number, heightExponent: number, heightScalingFactor:number = 1) => {
  const heightDifference = Math.abs(neighborHeight ** heightExponent - currentHeight ** heightExponent) * heightScalingFactor;
  const isHigherNeighbor = neighborHeight > currentHeight
  return isHigherNeighbor? heightDifference : heightDifference/2 
};

/**
 * Calculate a penalty for moving away from the destination height.
 * The penalty increases as the cell gets closer to the destination.
 * This penalizes unnecessary climbing.
 *
 * @param current - The current cell in the pathfinding process.
 * @param end - The destination cell.
 * @param distanceScalingFactor - A scaling factor to control the penalty increase as the cell gets closer to the destination. Default is 1.
 * @returns The height penalty for the current cell based on its distance to the destination and the difference in heights between the current cell and the destination.
 */
const heightPenalty = (current: PackCell, end: PackCell, distanceScalingFactor: number = 1) => {
  const heightDifference = Math.abs(end.h - current.h);
  const distanceToDestination = heuristic(current, end);
  const normalizedDistance = 1 - (distanceToDestination / (distanceToDestination + distanceScalingFactor));
  
  return heightDifference * normalizedDistance;
};

export const findRouteAStar = (start: PackCell, end: PackCell, cells: PackCell[], biomes: number[], heightExponent:number = 2) => {
  const openSet = new Set([start]);
  const cameFrom = new Map<number, PackCell>();
  const gScore = new Map(cells.map((cell) => [cell.i, Infinity]));
  gScore.set(start.i, 0);
  const fScore = new Map(cells.map((cell) => [cell.i, Infinity]));
  fScore.set(start.i, heuristic(start, end));

  while (openSet.size > 0) {
    const current = [...openSet].reduce((a, b) => (fScore.get(a.i)! < fScore.get(b.i)! ? a : b));

    if (current.i === end.i) {
      return reconstructPath(cameFrom, current);
    }

    openSet.delete(current);
    current.c.forEach((neighborIndex) => {
      const neighbor = cells.find(cell => cell.i === neighborIndex);
      if (!neighbor) throw new Error(`Bad data. cell ${neighborIndex} not found ( from cell ${current.i} neighbors ${current.c} )`)
      // Only enter the Marine biome from towns with water routes
      if (neighbor.biome === MARINE_BIOME_INDEX && current.biome !== MARINE_BIOME_INDEX) {
        if (current.burg === 0 || neighbor.road !== 1 || current.harbor === 0) {
          return; // Skip this neighbor, as it doesn't meet the conditions for entering the Marine biome
        }
      }
      
      // Only leave the Marine biome into towns with water routes
      if (neighbor.biome !== MARINE_BIOME_INDEX && current.biome === MARINE_BIOME_INDEX) {
        if (neighbor.burg === 0) {
          return; // Skip this neighbor, as it doesn't meet the conditions for leaving the Marine biome
        }
      }
      const biomePenalty = biomes[neighbor.biome]
      const preferRoads = neighbor.road? 0.1 : 1
      const terrainCost = biomePenalty  + slopePenalty(current.h, neighbor.h, heightExponent, 1) + heightPenalty(neighbor, end);
      const tentativeGScore = gScore.get(current.i)! + heuristic(current, neighbor) + terrainCost * preferRoads

      if (tentativeGScore < gScore.get(neighbor.i)!) {
        cameFrom.set(neighbor.i, current);
        gScore.set(neighbor.i, tentativeGScore);
        fScore.set(neighbor.i, tentativeGScore + heuristic(neighbor, end));
        if (![...openSet].includes(neighbor)) {
          openSet.add(neighbor);
        }
      }
    });
  }

  return null;
};
