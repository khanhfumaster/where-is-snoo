export function distanceToPoints(distanceInMeters: number) {
  const maxPoints = 5000;

  if (distanceInMeters <= 0) {
    return maxPoints; // Perfect guess
  }

  // Adjust decay by increasing divisor and tweaking the formula
  const points = Math.round(maxPoints * (1 / (1 + distanceInMeters / 2000000)));

  return Math.max(points, 1); // Ensure points do not go below 1
}
