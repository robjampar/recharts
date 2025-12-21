import { DataKey, getValueByDataKey } from '../util/ChartUtils';

/**
 * Represents a point with x/y coordinates and optional payload data
 */
export interface AnimatablePoint {
  x: number | null;
  y: number | null;
  payload?: unknown;
}

/**
 * Strategy for matching points during animation transitions.
 *
 * - 'index': Match by array index (current behavior, may cause distortion with sliding windows)
 * - 'x': Match by x-coordinate (ideal for time-series and numeric axes)
 * - DataKey (string): Match by a specific key in the payload data
 * - Function: Custom matching function that returns a unique identifier for each point
 */
export type PointMatchingStrategy<T extends AnimatablePoint = AnimatablePoint> =
  | 'index'
  | 'x'
  | DataKey<T['payload']>
  | ((point: T, index: number) => string | number | null);

/**
 * Result of matching a current point to a previous point
 */
export interface MatchedPoint<T> {
  current: T;
  currentIndex: number;
  previous: T | null;
}

/**
 * Get the matching key for a point based on the strategy
 */
function getPointKey<T extends AnimatablePoint>(
  point: T,
  index: number,
  strategy: PointMatchingStrategy<T>,
): string | number | null {
  if (strategy === 'index') {
    return index;
  }

  if (typeof strategy === 'function') {
    return strategy(point, index);
  }

  // strategy is a DataKey - get value from payload
  if (point.payload != null) {
    const value = getValueByDataKey(point.payload, strategy);
    if (value != null) {
      return typeof value === 'object' ? JSON.stringify(value) : value;
    }
  }

  return null;
}

/**
 * Build a lookup map from previous points based on the matching strategy.
 * Returns a Map where keys are the matching identifiers and values are the points.
 */
function buildPreviousPointsMap<T extends AnimatablePoint>(
  previousPoints: ReadonlyArray<T>,
  strategy: PointMatchingStrategy<T>,
): Map<string | number, T> {
  const map = new Map<string | number, T>();

  for (let i = 0; i < previousPoints.length; i++) {
    const point = previousPoints[i];
    const key = getPointKey(point, i, strategy);
    if (key != null) {
      // For duplicate keys, keep the first occurrence
      if (!map.has(key)) {
        map.set(key, point);
      }
    }
  }

  return map;
}

/**
 * Match current points to previous points based on the specified strategy.
 *
 * This function is used during animation transitions to determine which previous
 * point position each current point should animate from. This enables smooth
 * animations when data is prepended, appended, or shifted (sliding window).
 *
 * @param currentPoints - The new array of points to animate to
 * @param previousPoints - The previous array of points to animate from
 * @param strategy - The matching strategy to use
 * @returns Array of matched points, each containing the current point and its matched previous point (or null if no match)
 *
 * @example
 * // Match by x-coordinate for time-series data
 * const matches = matchPointsByStrategy(newPoints, oldPoints, 'x');
 *
 * @example
 * // Match by a data key in the payload
 * const matches = matchPointsByStrategy(newPoints, oldPoints, 'timestamp');
 *
 * @example
 * // Custom matching function
 * const matches = matchPointsByStrategy(newPoints, oldPoints, (point) => point.payload?.id);
 */
export function matchPointsByStrategy<T extends AnimatablePoint>(
  currentPoints: ReadonlyArray<T>,
  previousPoints: ReadonlyArray<T> | null,
  strategy: PointMatchingStrategy<T>,
): ReadonlyArray<MatchedPoint<T>> {
  // If no previous points, all current points are new
  if (!previousPoints || previousPoints.length === 0) {
    return currentPoints.map((current, currentIndex) => ({
      current,
      currentIndex,
      previous: null,
    }));
  }

  // For 'index' strategy, use the legacy stretching algorithm for backward compatibility.
  // This maps points by ratio rather than exact index, which spreads the previous points
  // across the new points array. This was the original behavior in recharts.
  if (strategy === 'index') {
    const prevPointsDiffFactor = previousPoints.length / currentPoints.length;
    return currentPoints.map((current, currentIndex): MatchedPoint<T> => {
      const prevPointIndex = Math.floor(currentIndex * prevPointsDiffFactor);
      const previous = previousPoints[prevPointIndex] ?? null;
      return {
        current,
        currentIndex,
        previous,
      };
    });
  }

  const previousMap = buildPreviousPointsMap(previousPoints, strategy);

  return currentPoints.map((current, currentIndex): MatchedPoint<T> => {
    const key = getPointKey(current, currentIndex, strategy);
    const previous = key != null ? (previousMap.get(key) ?? null) : null;

    return {
      current,
      currentIndex,
      previous,
    };
  });
}

/**
 * Get a numeric value from a point for comparison, using the strategy to determine which value.
 * For 'index' strategy, returns the point's x pixel coordinate.
 * For DataKey strategies, returns the value from the payload.
 */
function getComparisonValue<T extends AnimatablePoint>(point: T, strategy: PointMatchingStrategy<T>): number | null {
  if (strategy === 'index') {
    return point.x;
  }

  if (typeof strategy === 'function') {
    const key = strategy(point, 0);
    return typeof key === 'number' ? key : null;
  }

  // strategy is a DataKey - get value from payload
  if (point.payload != null) {
    const value = getValueByDataKey(point.payload, strategy);
    if (typeof value === 'number') {
      return value;
    }
  }

  return null;
}

/**
 * Determine the entry direction for a new point that has no previous match.
 * Used to animate new points entering from the appropriate edge of the chart.
 *
 * @param point - The new point
 * @param previousPoints - The previous array of points
 * @param strategy - The matching strategy, used to determine which value to compare
 * @returns 'left' if the point should enter from the left, 'right' if from the right
 */
export function getNewPointEntryDirection<T extends AnimatablePoint>(
  point: T,
  previousPoints: ReadonlyArray<T> | null,
  strategy: PointMatchingStrategy<T> = 'index',
): 'left' | 'right' {
  if (!previousPoints || previousPoints.length === 0) {
    return 'right'; // Default to right entry
  }

  const pointValue = getComparisonValue(point, strategy);
  if (pointValue === null) {
    return 'right'; // Default to right entry if we can't compare
  }

  // Find the min and max values of previous points
  let minValue = Infinity;
  let maxValue = -Infinity;

  for (const prevPoint of previousPoints) {
    const prevValue = getComparisonValue(prevPoint, strategy);
    if (prevValue !== null) {
      minValue = Math.min(minValue, prevValue);
      maxValue = Math.max(maxValue, prevValue);
    }
  }

  // If no valid previous values found, default to right
  if (minValue === Infinity) {
    return 'right';
  }

  // If the new point's value is less than the minimum previous value, it enters from left
  if (pointValue < minValue) {
    return 'left';
  }

  // Otherwise it enters from right
  return 'right';
}
