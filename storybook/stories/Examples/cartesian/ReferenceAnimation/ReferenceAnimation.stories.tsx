import React, { useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import {
  LineChart,
  Line,
  ReferenceLine,
  ReferenceArea,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from '../../../../../src';

export default {
  title: 'Examples/cartesian/Reference Animation',
  component: LineChart,
};

// Generate sample data: 3 days of 15-minute buckets (288 data points)
const generateTimelineData = () => {
  const data = [];
  const startTime = new Date('2024-01-01T00:00:00');

  for (let i = 0; i < 288; i++) {
    const timestamp = new Date(startTime.getTime() + i * 15 * 60 * 1000);
    data.push({
      timestamp: timestamp.getTime(),
      displayTime: timestamp.toISOString(),
      count: Math.floor(Math.random() * 100) + Math.sin(i / 10) * 30 + 50,
    });
  }
  return data;
};

/**
 * This demo replicates the exact use case from the feature request:
 * A scrollable event timeline with a "visible range" indicator.
 *
 * The chart shows event counts over ~3 days (288 data points at 15-minute intervals).
 * A ReferenceArea highlights which portion of the timeline is currently "visible"
 * (simulating a synchronized scrollable event list below).
 *
 * **Before this feature:** The highlighted region would jump instantly to each new position,
 * creating a jarring, stuttery visual effect.
 *
 * **After this feature:** The highlighted region smoothly slides along the chart,
 * providing a polished user experience.
 */
export const ScrollableTimelineDemo = {
  render: () => {
    const [data] = useState(generateTimelineData);
    const [windowStart, setWindowStart] = useState(100);
    const [windowEnd, setWindowEnd] = useState(120);
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);

    // Simulate continuous scrolling
    React.useEffect(() => {
      if (!isAutoScrolling) return undefined;

      const interval = setInterval(() => {
        setWindowStart(prev => {
          const next = prev + 1;
          return next >= data.length - 30 ? 100 : next;
        });
        setWindowEnd(prev => {
          const next = prev + 1;
          return next >= data.length - 10 ? 120 : next;
        });
      }, 100);

      return () => clearInterval(interval);
    }, [isAutoScrolling, data.length]);

    const startTimestamp = data[windowStart]?.timestamp;
    const endTimestamp = data[windowEnd]?.timestamp;

    const formatTime = (index: number) => {
      const d = new Date(data[index]?.timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
      <div style={{ width: '100%' }}>
        <h2>Scrollable Event Timeline with Visible Range Indicator</h2>
        <p>
          This demo simulates a common pattern: an activity chart with a scrollable event list below it. As the user
          scrolls through events, a highlighted region on the chart indicates which time range is currently visible.
        </p>

        <div
          style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: '#f5f5f5',
            borderRadius: 8,
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
            style={{
              padding: '8px 16px',
              backgroundColor: isAutoScrolling ? '#ef4444' : '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {isAutoScrolling ? 'Stop Auto-Scroll' : 'Start Auto-Scroll'}
          </button>

          <button
            type="button"
            onClick={() => {
              setWindowStart(w => Math.max(0, w - 10));
              setWindowEnd(w => Math.max(20, w - 10));
            }}
            disabled={windowStart <= 0}
            style={{ padding: '8px 16px' }}
          >
            ← Jump Left
          </button>

          <button
            type="button"
            onClick={() => {
              setWindowStart(w => Math.min(data.length - 30, w + 10));
              setWindowEnd(w => Math.min(data.length - 10, w + 10));
            }}
            disabled={windowEnd >= data.length - 10}
            style={{ padding: '8px 16px' }}
          >
            Jump Right →
          </button>

          <span style={{ fontFamily: 'monospace' }}>
            Visible: {formatTime(windowStart)} - {formatTime(windowEnd)} (indices {windowStart}-{windowEnd})
          </span>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={ts => new Date(ts).toLocaleDateString()}
              tick={{ fontSize: 11 }}
            />
            <YAxis domain={[0, 'auto']} tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={ts => new Date(ts).toLocaleString()}
              formatter={(value: number) => [value.toFixed(0), 'Events']}
            />

            {/* The "visible range" indicator - NOW WITH SMOOTH ANIMATION! */}
            <ReferenceArea
              x1={startTimestamp}
              x2={endTimestamp}
              fill="rgba(59, 130, 246, 0.3)"
              stroke="rgb(59, 130, 246)"
              strokeWidth={2}
              isAnimationActive
              animationDuration={150}
              animationEasing="ease-out"
            />

            <Line
              type="monotone"
              dataKey="count"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        <div
          style={{
            marginTop: 16,
            padding: 16,
            backgroundColor: '#f0f9ff',
            borderRadius: 8,
            border: '1px solid #bae6fd',
          }}
        >
          <h4 style={{ margin: '0 0 8px 0' }}>How it works:</h4>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              <code>isAnimationActive=&#123;true&#125;</code> enables smooth position transitions
            </li>
            <li>
              <code>animationDuration=&#123;150&#125;</code> keeps animations snappy for frequent updates
            </li>
            <li>
              <code>animationEasing=&quot;ease-out&quot;</code> gives a natural deceleration feel
            </li>
          </ul>
        </div>
      </div>
    );
  },
};

/**
 * Full Timeline Experience: Sliding Window with All Animations Synchronized
 *
 * This demo showcases the complete timeline feature set:
 * - Line uses `animationMatchBy="timestamp"` to smoothly slide data points
 * - ReferenceArea highlights the "current view" and slides with the data
 * - ReferenceLine marks the "now" indicator and slides with the data
 *
 * All animations are synchronized for a cohesive, polished experience.
 */
export const FullTimelineExperience = {
  render: () => {
    const windowSize = 50; // Show 50 data points at a time
    const [startIndex, setStartIndex] = useState(0);
    const [isStreaming, setIsStreaming] = useState(false);
    const allData = React.useMemo(() => generateTimelineData(), []);

    // Focus area controls - position and size within the visible window
    const [focusOffset, setFocusOffset] = useState(15); // Start position within window (0 to windowSize)
    const [focusSize, setFocusSize] = useState(20); // Size of focus area in data points

    // Anchor mode - when enabled, focus area moves with the stream
    const [anchorMode, setAnchorMode] = useState<'none' | 'forward' | 'backward'>('none');

    // For "Lock to Stream" mode - store actual data indices (absolute position in allData)
    const [lockedDataStart, setLockedDataStart] = useState<number | null>(null);
    const [lockedDataEnd, setLockedDataEnd] = useState<number | null>(null);

    // Get the visible slice of data
    const visibleData = allData.slice(startIndex, startIndex + windowSize);

    // Calculate relative indices for display (always available)
    const focusStartIdx = Math.min(focusOffset, windowSize - focusSize);
    const focusEndIdx = Math.min(focusStartIdx + focusSize, windowSize - 1);

    // Calculate the "focus area" based on mode
    let focusStart: number | undefined, focusEnd: number | undefined, nowMarker: number | undefined;

    if (anchorMode === 'forward' && lockedDataStart !== null && lockedDataEnd !== null) {
      // Use locked absolute timestamps - these stay on the same data points
      focusStart = allData[lockedDataStart]?.timestamp;
      focusEnd = allData[lockedDataEnd]?.timestamp;
      const lockedNowIdx = Math.floor((lockedDataStart + lockedDataEnd) / 2);
      nowMarker = allData[lockedNowIdx]?.timestamp;
    } else {
      // Use relative offset within visible window
      focusStart = visibleData[focusStartIdx]?.timestamp;
      focusEnd = visibleData[focusEndIdx]?.timestamp;
      const nowMarkerIdx = Math.floor((focusStartIdx + focusEndIdx) / 2);
      nowMarker = visibleData[nowMarkerIdx]?.timestamp;
    }

    // Lock to current data points when switching to "forward" mode
    React.useEffect(() => {
      if (anchorMode === 'forward') {
        const computedFocusStart = Math.min(focusOffset, windowSize - focusSize);
        const computedFocusEnd = Math.min(computedFocusStart + focusSize, windowSize - 1);
        setLockedDataStart(startIndex + computedFocusStart);
        setLockedDataEnd(startIndex + computedFocusEnd);
      } else {
        setLockedDataStart(null);
        setLockedDataEnd(null);
      }
    }, [anchorMode, focusOffset, focusSize, startIndex]);

    // Simulate streaming - slide the window forward
    React.useEffect(() => {
      if (!isStreaming) return undefined;

      const interval = setInterval(() => {
        setStartIndex(prev => {
          const next = prev + 1;
          return next >= allData.length - windowSize ? 0 : next;
        });

        // Only adjust offset in "backward" mode (slides left on screen)
        if (anchorMode === 'backward') {
          setFocusOffset(prev => Math.max(0, prev - 1));
        }
        // 'none' = focus area stays at fixed screen position, data slides under it
        // 'forward' = uses locked timestamps, so focus follows data automatically
      }, 500);

      return () => clearInterval(interval);
    }, [isStreaming, allData.length, anchorMode]);

    const formatTimestamp = (ts: number) => {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
      <div style={{ width: '100%' }}>
        <h2>Full Timeline Experience</h2>
        <p>
          This demo shows all animation features working together. The Line uses{' '}
          <code>animationMatchBy=&quot;timestamp&quot;</code> to smoothly slide data, while the ReferenceArea and
          ReferenceLine animate in sync.
        </p>

        {/* Timeline Controls */}
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: '#f5f5f5',
            borderRadius: 8,
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setIsStreaming(!isStreaming)}
            style={{
              padding: '8px 16px',
              backgroundColor: isStreaming ? '#ef4444' : '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {isStreaming ? '⏹ Stop Stream' : '▶ Start Stream'}
          </button>

          <button
            type="button"
            onClick={() => setStartIndex(i => Math.max(0, i - 10))}
            disabled={startIndex <= 0}
            style={{ padding: '8px 16px' }}
          >
            ← Back 10
          </button>

          <button
            type="button"
            onClick={() => setStartIndex(i => Math.min(allData.length - windowSize, i + 10))}
            disabled={startIndex >= allData.length - windowSize}
            style={{ padding: '8px 16px' }}
          >
            Forward 10 →
          </button>

          <button type="button" onClick={() => setStartIndex(0)} style={{ padding: '8px 16px' }}>
            Reset
          </button>

          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
            Window: {startIndex} - {startIndex + windowSize} of {allData.length}
          </span>
        </div>

        {/* Focus Area Controls */}
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: '#ecfdf5',
            borderRadius: 8,
            border: '1px solid #a7f3d0',
            display: 'flex',
            gap: 24,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 'bold', color: '#16a34a', fontSize: 13 }}>Focus Area:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setFocusOffset(o => Math.max(0, o - 5))}
              disabled={focusOffset <= 0}
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              ← Move
            </button>
            <button
              type="button"
              onClick={() => setFocusOffset(o => Math.min(windowSize - focusSize, o + 5))}
              disabled={focusOffset >= windowSize - focusSize}
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              Move →
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setFocusSize(s => Math.max(5, s - 5))}
              disabled={focusSize <= 5}
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              − Shrink
            </button>
            <button
              type="button"
              onClick={() => setFocusSize(s => Math.min(windowSize - 5, s + 5))}
              disabled={focusSize >= windowSize - 5}
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              + Expand
            </button>
          </div>

          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: '1px solid #a7f3d0', paddingLeft: 16 }}
          >
            <span style={{ fontSize: 12, color: '#16a34a' }}>Anchor:</span>
            <select
              value={anchorMode}
              onChange={e => setAnchorMode(e.target.value as 'none' | 'forward' | 'backward')}
              style={{ padding: '4px 8px', fontSize: 12, borderRadius: 4 }}
            >
              <option value="none">None (Fixed)</option>
              <option value="forward">Lock to Stream</option>
              <option value="backward">Slide Back</option>
            </select>
          </div>

          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#16a34a' }}>
            Position: {focusStartIdx}-{focusEndIdx} | Size: {focusSize} points
          </span>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={visibleData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatTimestamp}
              tick={{ fontSize: 10 }}
            />
            <YAxis domain={[0, 150]} tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={ts => new Date(ts).toLocaleString()}
              formatter={(value: number) => [value.toFixed(0), 'Events']}
            />
            <Legend />

            {/* Focus area highlight - when anchored to stream, disable animation so it moves exactly with data */}
            <ReferenceArea
              x1={focusStart}
              x2={focusEnd}
              fill="rgba(34, 197, 94, 0.15)"
              stroke="rgb(34, 197, 94)"
              strokeWidth={1}
              strokeDasharray="4 4"
              isAnimationActive={anchorMode === 'none'}
              animationDuration={300}
              animationEasing="ease-out"
              label={{ value: 'Focus Area', position: 'insideTopLeft', fontSize: 10, fill: '#16a34a' }}
            />

            {/* "Now" marker - when anchored to stream, disable animation so it moves exactly with data */}
            <ReferenceLine
              x={nowMarker}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="6 3"
              isAnimationActive={anchorMode === 'none'}
              animationDuration={300}
              animationEasing="ease-out"
              label={{ value: 'NOW', position: 'top', fontSize: 11, fill: '#ef4444', fontWeight: 'bold' }}
            />

            {/* The data line - uses animationMatchBy for smooth sliding */}
            <Line
              name="Event Count"
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              animationMatchBy="timestamp"
              animationDuration={400}
            />
          </LineChart>
        </ResponsiveContainer>

        <div
          style={{
            marginTop: 16,
            padding: 16,
            backgroundColor: '#faf5ff',
            borderRadius: 8,
            border: '1px solid #e9d5ff',
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', color: '#7c3aed' }}>Animation Props Used:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
            <div>
              <strong>Line:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 20, fontSize: 13 }}>
                <li>
                  <code>animationMatchBy=&quot;timestamp&quot;</code>
                </li>
                <li>
                  <code>animationDuration=&#123;400&#125;</code>
                </li>
              </ul>
            </div>
            <div>
              <strong>ReferenceArea:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 20, fontSize: 13 }}>
                <li>
                  <code>isAnimationActive=&#123;true&#125;</code>
                </li>
                <li>
                  <code>animationDuration=&#123;300&#125;</code>
                </li>
              </ul>
            </div>
            <div>
              <strong>ReferenceLine:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 20, fontSize: 13 }}>
                <li>
                  <code>isAnimationActive=&#123;true&#125;</code>
                </li>
                <li>
                  <code>animationDuration=&#123;300&#125;</code>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

const generateData = (start: number, count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    x: start + i,
    value: Math.floor(Math.random() * 60) + 20,
  }));
};

/**
 * This example demonstrates how to animate ReferenceLine and ReferenceArea
 * components when their positions change dynamically.
 *
 * Use `isAnimationActive={true}` to enable smooth position transitions.
 */
export const AnimatedReferenceLine = {
  render: () => {
    const [position, setPosition] = useState(5);
    const data = generateData(0, 10);

    return (
      <div style={{ width: '100%' }}>
        <h2>Animated ReferenceLine</h2>
        <p>Click the buttons to move the reference line. It will animate smoothly to its new position.</p>

        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <button type="button" onClick={() => setPosition(p => Math.max(0, p - 1))}>
            Move Left
          </button>
          <button type="button" onClick={() => setPosition(p => Math.min(9, p + 1))}>
            Move Right
          </button>
          <span>Current Position: {position}</span>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={[0, 9]} />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            <ReferenceLine
              x={position}
              stroke="red"
              strokeWidth={2}
              label={{ value: `x=${position}`, position: 'top' }}
              isAnimationActive
              animationDuration={300}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  },
};

/**
 * This example shows how ReferenceArea can animate when its x1/x2 boundaries change.
 * Useful for highlighting a sliding window or range selection that follows data.
 */
export const AnimatedReferenceArea = {
  render: () => {
    const [range, setRange] = useState({ start: 2, end: 5 });
    const data = generateData(0, 10);

    return (
      <div style={{ width: '100%' }}>
        <h2>Animated ReferenceArea</h2>
        <p>Click the buttons to slide the highlighted area. It animates smoothly.</p>

        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <button
            type="button"
            onClick={() => setRange(r => ({ start: Math.max(0, r.start - 1), end: Math.max(3, r.end - 1) }))}
          >
            Slide Left
          </button>
          <button
            type="button"
            onClick={() => setRange(r => ({ start: Math.min(6, r.start + 1), end: Math.min(9, r.end + 1) }))}
          >
            Slide Right
          </button>
          <span>
            Range: {range.start} - {range.end}
          </span>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={[0, 9]} />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            <ReferenceArea
              x1={range.start}
              x2={range.end}
              fill="rgba(0, 100, 255, 0.3)"
              stroke="blue"
              strokeOpacity={0.5}
              isAnimationActive
              animationDuration={300}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  },
};

/**
 * This example combines Line's animationMatchBy with animated reference components
 * to create a synchronized sliding window effect - perfect for real-time data visualization
 * where you want to highlight the "visible range" that moves with the data.
 */
export const SlidingWindowWithReferences = {
  render: () => {
    const [windowStart, setWindowStart] = useState(0);
    const windowSize = 10;
    const allData = generateData(0, 20);
    const visibleData = allData.slice(windowStart, windowStart + windowSize);
    const centerPosition = windowStart + windowSize / 2;

    return (
      <div style={{ width: '100%' }}>
        <h2>Sliding Window with Animated References</h2>
        <p>
          This demonstrates a common use case: a scrollable timeline with a &quot;visible range&quot; indicator. The
          Line uses <code>animationMatchBy=&quot;x&quot;</code> and the reference components animate in sync.
        </p>

        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <button type="button" onClick={() => setWindowStart(w => Math.max(0, w - 2))} disabled={windowStart === 0}>
            Scroll Left
          </button>
          <button type="button" onClick={() => setWindowStart(w => Math.min(10, w + 2))} disabled={windowStart >= 10}>
            Scroll Right
          </button>
          <span>
            Showing: {windowStart} - {windowStart + windowSize - 1}
          </span>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={visibleData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line
              name="Value"
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
              animationMatchBy="x"
              animationDuration={300}
            />
            {/* Highlight the center portion of the visible window */}
            <ReferenceArea
              x1={centerPosition - 2}
              x2={centerPosition + 2}
              fill="rgba(136, 132, 216, 0.2)"
              stroke="#8884d8"
              strokeDasharray="3 3"
              isAnimationActive
              animationDuration={300}
              animationEasing="ease-out"
            />
            {/* Center line indicator */}
            <ReferenceLine
              x={centerPosition}
              stroke="#8884d8"
              strokeWidth={2}
              strokeDasharray="5 5"
              isAnimationActive
              animationDuration={300}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  },
};

/**
 * Real-time streaming simulation that shows how all animation features work together.
 */
export const RealTimeStreamingWithReferences = {
  render: () => {
    const [data, setData] = useState(() => generateData(0, 10));
    const [isRunning, setIsRunning] = useState(false);
    const highlightRange = { start: data[data.length - 3]?.x ?? 0, end: data[data.length - 1]?.x ?? 0 };

    React.useEffect(() => {
      if (!isRunning) return undefined;

      const interval = setInterval(() => {
        setData(prev => {
          const lastX = prev[prev.length - 1]?.x ?? 0;
          const newPoint = { x: lastX + 1, value: Math.floor(Math.random() * 60) + 20 };
          return [...prev.slice(-9), newPoint];
        });
      }, 1000);

      return () => clearInterval(interval);
    }, [isRunning]);

    return (
      <div style={{ width: '100%' }}>
        <h2>Real-Time Streaming with Reference Animations</h2>
        <p>
          Watch as new data points stream in. The line animates with <code>animationMatchBy=&quot;x&quot;</code>, and
          the reference area (highlighting the latest 3 points) slides along with it.
        </p>

        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <button type="button" onClick={() => setIsRunning(!isRunning)}>
            {isRunning ? 'Stop' : 'Start'} Streaming
          </button>
          <button type="button" onClick={() => setData(generateData(0, 10))}>
            Reset
          </button>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={{ r: 4 }}
              animationMatchBy="x"
              animationDuration={500}
            />
            {/* Highlight the latest 3 data points */}
            <ReferenceArea
              x1={highlightRange.start}
              x2={highlightRange.end}
              fill="rgba(130, 202, 157, 0.3)"
              stroke="#82ca9d"
              isAnimationActive
              animationDuration={500}
              animationEasing="ease-out"
              label={{ value: 'Latest', position: 'insideTop' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  },
};

// ============================================================================
// OUTERACT-STYLE EVENT STREAM DEMO
// Replicates the exact pattern from outeract-web:
// - VirtuosoMessageList for virtualized event list
// - Activity chart timeline above with synchronized scroll
// - Bi-directional sync: scroll updates chart, chart click jumps to scroll
// ============================================================================

// Generate realistic event/message data spanning multiple days
const generateEventMessages = () => {
  const messages: Array<{
    id: string;
    timestamp: number;
    createdAt: string;
    author: string;
    content: string;
    type: 'message' | 'system' | 'notification';
  }> = [];

  const authors = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
  const messageTemplates = [
    'Hey, just checking in on the project status.',
    'The build passed! Ready for deployment.',
    'Can someone review my PR?',
    'Meeting in 15 minutes.',
    'Updated the documentation.',
    'Found a bug in the login flow.',
    'Fixed the CSS issue.',
    'Pushed the hotfix.',
    'Anyone available for a quick call?',
    'The tests are failing on CI.',
    'Merged the feature branch.',
    'Deployed to staging.',
    'Looking into the performance issues.',
    'New release notes are up.',
    'Customer reported an issue with checkout.',
  ];

  const startTime = new Date('2024-01-01T00:00:00');
  let messageId = 0;

  // Generate messages over 3 days with varying density (like real chat activity)
  for (let day = 0; day < 3; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // More messages during work hours (9-17)
      const isWorkHour = hour >= 9 && hour <= 17;
      const messageCount = isWorkHour ? Math.floor(Math.random() * 8) + 3 : Math.floor(Math.random() * 3);

      for (let m = 0; m < messageCount; m++) {
        const minuteOffset = Math.floor(Math.random() * 60);
        const timestamp = new Date(
          startTime.getTime() + day * 24 * 60 * 60 * 1000 + hour * 60 * 60 * 1000 + minuteOffset * 60 * 1000,
        );

        messages.push({
          id: `msg-${messageId++}`,
          timestamp: timestamp.getTime(),
          createdAt: timestamp.toISOString(),
          author: authors[Math.floor(Math.random() * authors.length)],
          content: messageTemplates[Math.floor(Math.random() * messageTemplates.length)],
          type: (() => {
            const rand = Math.random();
            if (rand > 0.9) return 'system';
            if (rand > 0.85) return 'notification';
            return 'message';
          })(),
        });
      }
    }
  }

  return messages.sort((a, b) => a.timestamp - b.timestamp);
};

// Generate activity stats (15-minute buckets) from messages - matches outeract useSlidingActivityStats
const generateActivityFromMessages = (messages: ReturnType<typeof generateEventMessages>) => {
  const buckets: Map<number, number> = new Map();

  // Create 15-minute buckets (same as outeract)
  const floorTo15Min = (ts: number) => Math.floor(ts / (15 * 60 * 1000)) * (15 * 60 * 1000);

  messages.forEach(msg => {
    const bucket = floorTo15Min(msg.timestamp);
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
  });

  // Fill in empty buckets for continuous chart
  const sortedBuckets = Array.from(buckets.keys()).sort((a, b) => a - b);
  const result: Array<{ timestamp: number; count: number }> = [];

  if (sortedBuckets.length > 0) {
    const minTs = sortedBuckets[0];
    const maxTs = sortedBuckets[sortedBuckets.length - 1];

    for (let ts = minTs; ts <= maxTs; ts += 15 * 60 * 1000) {
      result.push({
        timestamp: ts,
        count: buckets.get(ts) || 0,
      });
    }
  }

  return result;
};

/**
 * Outeract-Style Event Stream Demo
 *
 * This demo replicates the EXACT production pattern from outeract-web:
 * - Uses react-virtuoso for virtualized message list (like VirtuosoMessageList)
 * - Activity chart timeline above showing message density per 15-min bucket
 * - Bi-directional synchronization:
 *   - Scrolling the list updates currentVisibleDate and visibleDateRange
 *   - Clicking/dragging on the chart jumps the list to that timestamp
 *   - ReferenceArea highlights the visible range on the chart
 *
 * This is the production pattern for synchronized timeline + scroller UIs.
 */
export const OuteractEventStreamDemo = {
  render: () => {
    // Generate data once (stable across renders)
    const messages = React.useMemo(() => generateEventMessages(), []);
    const allActivityData = React.useMemo(() => generateActivityFromMessages(messages), [messages]);

    // Sliding window size: 6 hours = 24 data points (15-min buckets)
    const WINDOW_SIZE = 24;

    // Virtuoso ref for programmatic scrolling
    const virtuosoRef = React.useRef<VirtuosoHandle>(null);
    const chartRef = React.useRef<HTMLDivElement>(null);

    // Track visible date range from scroll (like outeract visibleDateRange state)
    const [visibleDateRange, setVisibleDateRange] = React.useState<{ start: Date; end: Date } | null>(null);

    // Track current visible date for chart centering (like outeract currentVisibleDate)
    const [currentVisibleDate, setCurrentVisibleDate] = React.useState<Date | null>(() => {
      // Initialize to last message timestamp
      if (messages.length > 0) {
        return new Date(messages[messages.length - 1].timestamp);
      }
      return null;
    });

    // Sticky date header (like outeract stickyDate)
    const [stickyDate, setStickyDate] = React.useState<string | null>(null);

    // Drag state for chart interaction
    const [isDragging, setIsDragging] = React.useState(false);

    // Sliding window of chart data centered on currentVisibleDate (like outeract useSlidingActivityStats)
    const visibleChartData = React.useMemo(() => {
      if (allActivityData.length === 0 || !currentVisibleDate) {
        return allActivityData.slice(-WINDOW_SIZE);
      }

      const centerTs = currentVisibleDate.getTime();

      // Find the closest data point index to centerTs
      let centerIdx = 0;
      let minDiff = Infinity;
      allActivityData.forEach((point, idx) => {
        const diff = Math.abs(point.timestamp - centerTs);
        if (diff < minDiff) {
          minDiff = diff;
          centerIdx = idx;
        }
      });

      // Calculate window bounds centered on centerIdx
      const halfWindow = Math.floor(WINDOW_SIZE / 2);
      let startIdx = centerIdx - halfWindow;
      let endIdx = centerIdx + halfWindow;

      // Clamp to valid indices
      if (startIdx < 0) {
        startIdx = 0;
        endIdx = Math.min(WINDOW_SIZE, allActivityData.length);
      }
      if (endIdx > allActivityData.length) {
        endIdx = allActivityData.length;
        startIdx = Math.max(0, endIdx - WINDOW_SIZE);
      }

      return allActivityData.slice(startIdx, endIdx);
    }, [allActivityData, currentVisibleDate, WINDOW_SIZE]);

    // Handle items rendered change - update visible range (like outeract handleRenderedDataChange)
    const handleItemsRendered = React.useCallback((items: Array<{ index: number; data: (typeof messages)[0] }>) => {
      if (items.length === 0) return;

      const visibleMessages = items.map(i => i.data).filter(Boolean);
      if (visibleMessages.length === 0) return;

      const firstEvent = visibleMessages[0];
      const lastEvent = visibleMessages[visibleMessages.length - 1];

      // Update visible range for chart highlighting
      setVisibleDateRange({
        start: new Date(firstEvent.timestamp),
        end: new Date(lastEvent.timestamp),
      });

      // Use CENTER of visible range for chart centering - this keeps the ReferenceArea centered on chart
      const centerTimestamp = (firstEvent.timestamp + lastEvent.timestamp) / 2;
      const centerDate = new Date(centerTimestamp);
      setStickyDate(centerDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));

      // Update current visible date for chart centering on EVERY scroll
      setCurrentVisibleDate(centerDate);
    }, []);

    // Convert mouse position to timestamp (like outeract getDateFromMousePosition)
    const getTimestampFromMouse = React.useCallback(
      (clientX: number) => {
        const chart = chartRef.current;
        if (!chart || visibleChartData.length === 0) return null;

        const rect = chart.getBoundingClientRect();
        const chartLeft = rect.left + 8; // margin
        const chartRight = rect.right - 8;
        const chartWidth = chartRight - chartLeft;

        if (clientX < chartLeft || clientX > chartRight) return null;

        const ratio = (clientX - chartLeft) / chartWidth;
        const minTs = visibleChartData[0].timestamp;
        const maxTs = visibleChartData[visibleChartData.length - 1].timestamp;

        return minTs + ratio * (maxTs - minTs);
      },
      [visibleChartData],
    );

    // Jump to timestamp in the message list (like outeract onJumpToDate)
    const jumpToTimestamp = React.useCallback(
      (timestamp: number) => {
        if (!virtuosoRef.current) return;

        // Find the message closest to this timestamp
        let closestIndex = 0;
        let closestDiff = Infinity;

        messages.forEach((msg, idx) => {
          const diff = Math.abs(msg.timestamp - timestamp);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestIndex = idx;
          }
        });

        virtuosoRef.current.scrollToIndex({
          index: closestIndex,
          align: 'center',
          behavior: 'smooth',
        });
      },
      [messages],
    );

    // Chart click handler (like outeract handleClick)
    const handleChartClick = React.useCallback(
      (e: React.MouseEvent) => {
        if (isDragging) return;
        const ts = getTimestampFromMouse(e.clientX);
        if (ts) jumpToTimestamp(ts);
      },
      [getTimestampFromMouse, jumpToTimestamp, isDragging],
    );

    // Chart drag handlers (like outeract handleMouseDown)
    const handleChartMouseDown = React.useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);

        const ts = getTimestampFromMouse(e.clientX);
        if (ts) jumpToTimestamp(ts);
      },
      [getTimestampFromMouse, jumpToTimestamp],
    );

    React.useEffect(() => {
      if (!isDragging) return undefined;

      const handleMouseMove = (e: MouseEvent) => {
        const ts = getTimestampFromMouse(e.clientX);
        if (ts) jumpToTimestamp(ts);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, getTimestampFromMouse, jumpToTimestamp]);

    // Find visible range indices for ReferenceArea (like outeract visibleRangeIndices)
    const visibleRangeIndices = React.useMemo(() => {
      if (!visibleDateRange || visibleChartData.length < 2) {
        return { startIdx: null, endIdx: null };
      }

      const startTime = visibleDateRange.start.getTime();
      const endTime = visibleDateRange.end.getTime();

      let startIdx = 0;
      let minStartDiff = Infinity;
      visibleChartData.forEach((point, idx) => {
        const diff = Math.abs(point.timestamp - startTime);
        if (diff < minStartDiff) {
          minStartDiff = diff;
          startIdx = idx;
        }
      });

      let endIdx = visibleChartData.length - 1;
      let minEndDiff = Infinity;
      visibleChartData.forEach((point, idx) => {
        const diff = Math.abs(point.timestamp - endTime);
        if (diff < minEndDiff) {
          minEndDiff = diff;
          endIdx = idx;
        }
      });

      return { startIdx, endIdx };
    }, [visibleChartData, visibleDateRange]);

    const formatTime = (ts: number) => {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (ts: number) => {
      const d = new Date(ts);
      return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    };

    // Group messages by date for separators
    const getDateGroup = (ts: number) => new Date(ts).toDateString();

    return (
      <div style={{ width: '100%', maxWidth: 800 }}>
        <h2>Outeract-Style Event Stream</h2>
        <p>
          This demo replicates the exact production pattern from <strong>outeract-web</strong>:
          <br />A synchronized activity chart + virtualized message list.
        </p>

        {/* Activity Chart / Timeline - matches EventStreamActivityChart */}
        <div
          ref={chartRef}
          role="slider"
          tabIndex={0}
          aria-label="Activity timeline chart - click or drag to navigate"
          aria-valuemin={visibleChartData.length > 0 ? visibleChartData[0].timestamp : 0}
          aria-valuemax={visibleChartData.length > 0 ? visibleChartData[visibleChartData.length - 1].timestamp : 0}
          aria-valuenow={currentVisibleDate?.getTime()}
          style={{
            marginBottom: 8,
            cursor: isDragging ? 'grabbing' : 'crosshair',
            userSelect: 'none',
            backgroundColor: '#fafafa',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
          }}
          onClick={handleChartClick}
          onMouseDown={handleChartMouseDown}
          onKeyDown={e => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              const step = 15 * 60 * 1000; // 15 minutes
              const direction = e.key === 'ArrowLeft' ? -1 : 1;
              if (currentVisibleDate) {
                jumpToTimestamp(currentVisibleDate.getTime() + direction * step);
              }
            }
          }}
        >
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={visibleChartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              {/* Visible range indicator - transparent box with animation */}
              {visibleRangeIndices.startIdx !== null &&
                visibleRangeIndices.endIdx !== null &&
                visibleChartData[visibleRangeIndices.startIdx] &&
                visibleChartData[visibleRangeIndices.endIdx] && (
                  <ReferenceArea
                    x1={visibleChartData[visibleRangeIndices.startIdx].timestamp}
                    x2={visibleChartData[visibleRangeIndices.endIdx].timestamp}
                    fill="hsl(262, 83%, 58%)"
                    fillOpacity={0.15}
                    isAnimationActive
                    animationDuration={400}
                    animationEasing="ease-out"
                  />
                )}
              <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} hide />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                labelFormatter={ts => formatTime(ts as number)}
                formatter={(value: number) => [`${value} events`, 'Count']}
              />

              {/* Line with animationMatchBy for smooth sliding as data window shifts */}
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(262, 83%, 58%)"
                strokeWidth={2}
                dot={false}
                isAnimationActive
                animationMatchBy="timestamp"
                animationDuration={400}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Time labels row - matches outeract hourlyTicks */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 8px 4px',
              fontSize: 9,
              color: '#9ca3af',
            }}
          >
            <span>{visibleChartData.length > 0 && formatTime(visibleChartData[0].timestamp)}</span>
            <span>
              {visibleDateRange && (
                <>
                  Viewing: {formatTime(visibleDateRange.start.getTime())} - {formatTime(visibleDateRange.end.getTime())}
                </>
              )}
            </span>
            <span>
              {visibleChartData.length > 0 && formatTime(visibleChartData[visibleChartData.length - 1].timestamp)}
            </span>
          </div>
        </div>

        {/* Sticky Date Header - matches outeract stickyDate */}
        <div style={{ position: 'relative' }}>
          {stickyDate && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '4px 12px',
                borderRadius: 16,
                fontSize: 11,
                fontWeight: 500,
                color: '#6b7280',
              }}
            >
              {stickyDate}
            </div>
          )}

          {/* Virtualized Message List - matches VirtuosoMessageList */}
          <Virtuoso
            ref={virtuosoRef}
            style={{
              height: 450,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              backgroundColor: 'white',
            }}
            data={messages}
            itemContent={(index, msg) => {
              // Show date separator when day changes
              const prevMsg = messages[index - 1];
              const showDateSeparator = !prevMsg || getDateGroup(msg.timestamp) !== getDateGroup(prevMsg.timestamp);

              return (
                <>
                  {showDateSeparator && (
                    <div
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#6b7280',
                      }}
                    >
                      {formatDate(msg.timestamp)}
                    </div>
                  )}
                  <div
                    style={{
                      padding: '10px 16px',
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: (() => {
                        if (msg.type === 'system') return '#fef3c7';
                        if (msg.type === 'notification') return '#dbeafe';
                        return 'white';
                      })(),
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>{msg.author}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatTime(msg.timestamp)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#4b5563' }}>{msg.content}</div>
                  </div>
                </>
              );
            }}
            rangeChanged={range => {
              // Extract visible items for range calculation
              const visibleItems = [];
              for (let i = range.startIndex; i <= range.endIndex && i < messages.length; i++) {
                visibleItems.push({ index: i, data: messages[i] });
              }
              handleItemsRendered(visibleItems);
            }}
            initialTopMostItemIndex={messages.length - 1}
          />
        </div>

        {/* Implementation notes */}
        <div
          style={{
            marginTop: 16,
            padding: 16,
            backgroundColor: '#faf5ff',
            borderRadius: 8,
            border: '1px solid #e9d5ff',
            fontSize: 13,
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', color: '#7c3aed' }}>How This Matches outeract-web:</h4>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
            <li>
              <strong>react-virtuoso:</strong> Same virtualized list library for efficient rendering
            </li>
            <li>
              <strong>Sliding window chart:</strong> Shows 6-hour window centered on scroll position - new data slides
              in from left as you scroll up
            </li>
            <li>
              <strong>animationMatchBy=&quot;timestamp&quot;:</strong> Line smoothly slides as window shifts
            </li>
            <li>
              <strong>visibleDateRange:</strong> Tracks first/last visible message timestamps
            </li>
            <li>
              <strong>ReferenceArea:</strong> Highlights visible range on chart (no animation)
            </li>
            <li>
              <strong>Click/drag to seek:</strong> Chart interaction jumps to timestamp in list
            </li>
            <li>
              <strong>Sticky date header:</strong> Shows current date as user scrolls
            </li>
            <li>
              <strong>15-minute buckets:</strong> Activity data aggregated same as outeract
            </li>
          </ul>
        </div>
      </div>
    );
  },
};
