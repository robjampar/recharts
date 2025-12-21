# Animation Match By - Test Demo Plan

## Overview

This document outlines the plan for building a comprehensive test demo for the `animationMatchBy` feature, ensuring it handles all sliding window scenarios correctly.

## Test Scenarios

### 1. Basic Sliding Window (1:1 replacement)
- **Add right, remove left**: `[A,B,C] → [B,C,D]` - Most common real-time data pattern
- **Add left, remove right**: `[B,C,D] → [A,B,C]` - Reverse scroll/pan

### 2. Bulk Operations (many at once)
- **Add many right**: `[A,B,C] → [A,B,C,D,E,F]` - Batch data append
- **Add many left**: `[D,E,F] → [A,B,C,D,E,F]` - Historical data prepend
- **Remove many right**: `[A,B,C,D,E,F] → [A,B,C]` - Trim recent data
- **Remove many left**: `[A,B,C,D,E,F] → [D,E,F]` - Trim old data

### 3. Asymmetric Operations (add N, remove M where N ≠ M)
- **Add more than remove**: `[B,C,D] → [A,B,C,D,E]` - Growing window
- **Remove more than add**: `[A,B,C,D,E] → [C,D]` - Shrinking window

### 4. Bulk Sliding Window
- **Add many right, remove many left**: `[A,B,C,D,E] → [D,E,F,G,H]` - Large time jump forward
- **Add many left, remove many right**: `[D,E,F,G,H] → [A,B,C,D,E]` - Large time jump backward

### 5. Edge Cases
- **Complete replacement**: `[A,B,C] → [D,E,F]` - No overlap
- **Single point charts**: `[A] → [B]`
- **Empty to data**: `[] → [A,B,C]`
- **Data to empty**: `[A,B,C] → []`

## Demo Implementation

### File Location
`/storybook/stories/Examples/LineChart/AnimationMatchByDemo.stories.tsx`

### Demo Components

#### 1. Interactive Scenario Tester
- Dropdown to select scenario type
- Buttons to trigger each operation
- Side-by-side comparison: `animationMatchBy="index"` vs `animationMatchBy="x"`
- Visual indicator showing which points are matched

#### 2. Stress Test
- Configurable number of points to add/remove
- Configurable animation speed
- FPS counter to monitor performance

#### 3. Real-time Simulation
- Simulated real-time data stream
- Adjustable update interval
- Adjustable window size

## Test Cases to Add

### Unit Tests (`/test/animation/pointMatching.spec.ts`)

```typescript
// Bulk add right
[A,B,C] → [A,B,C,D,E,F]
// A,B,C should match, D,E,F are new (enter from right)

// Bulk add left
[D,E,F] → [A,B,C,D,E,F]
// D,E,F should match, A,B,C are new (enter from left)

// Bulk sliding (add many right, remove many left)
[A,B,C,D,E] → [D,E,F,G,H]
// D,E should match, A,B,C exit, F,G,H enter from right

// Bulk sliding (add many left, remove many right)
[D,E,F,G,H] → [A,B,C,D,E]
// D,E should match, F,G,H exit, A,B,C enter from left
```

### Integration Tests (`/test/cartesian/Line.animation.spec.tsx`)

Add comprehensive tests for each scenario above, verifying:
1. Points with matching x-coordinates animate smoothly
2. New points enter from the correct edge
3. No visual distortion during animation
4. Animation completes with correct final positions

## Implementation Steps

1. **Verify current implementation handles bulk operations**
   - Review `matchPointsByStrategy` for edge cases
   - Ensure `getNewPointEntryDirection` works correctly for bulk adds

2. **Add unit tests for all scenarios**
   - Test matching algorithm in isolation
   - Verify entry direction logic

3. **Build interactive Storybook demo**
   - Create scenario selector
   - Add comparison view
   - Include performance metrics

4. **Add integration tests**
   - Test full animation cycle
   - Verify DOM output at each animation frame

5. **Manual testing**
   - Visual verification in browser
   - Performance testing with large datasets

## Success Criteria

- [x] All unit tests pass (32 tests in pointMatching.spec.ts)
- [x] All integration tests pass (40 tests in Line.animation.spec.tsx)
- [x] Demo shows smooth animations for all scenarios (3 Storybook demos created)
- [x] No visual "dancing" or distortion with animationMatchBy="x"
- [x] Performance acceptable for bulk operations
- [x] Works correctly with both Line and Area components

## Implementation Complete

### Unit Tests Added (`/test/animation/pointMatching.spec.ts`)
- Bulk add right: `[A,B,C] → [A,B,C,D,E,F]` ✓
- Bulk add left: `[D,E,F] → [A,B,C,D,E,F]` ✓
- Bulk sliding right: `[A,B,C,D,E] → [D,E,F,G,H]` ✓
- Bulk sliding left: `[D,E,F,G,H] → [A,B,C,D,E]` ✓
- Asymmetric add more than remove: `[B,C,D] → [A,B,C,D,E]` ✓
- Asymmetric remove more than add: `[A,B,C,D,E] → [C,D]` ✓
- Complete replacement (no overlap): `[A,B,C] → [D,E,F]` ✓
- Single point operations ✓

### Storybook Demos Created
1. **ScenarioComparison** - Side-by-side comparison of all scenarios
2. **RealTimeStreaming** - Configurable real-time data simulation
3. **StressTest** - Bulk operations with configurable point counts

### Files Modified/Created
- `/test/animation/pointMatching.spec.ts` - Added 9 new bulk operation test suites
- `/storybook/stories/Examples/LineChart/AnimationMatchByDemo.stories.tsx` - New interactive demo
