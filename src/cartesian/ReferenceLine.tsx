/**
 * @fileOverview Reference Line
 */
import * as React from 'react';
import { ReactElement, SVGProps, useEffect, useId, useRef } from 'react';
import { clsx } from 'clsx';
import { Layer } from '../container/Layer';
import { CartesianLabelContextProvider, CartesianLabelFromLabelProp, ImplicitLabelType } from '../component/Label';
import { IfOverflow } from '../util/IfOverflow';
import { isNan, isNumOrStr } from '../util/DataUtils';
import { createLabeledScales, rectWithCoords } from '../util/CartesianUtils';
import { CartesianViewBoxRequired } from '../util/types';
import { useViewBox } from '../context/chartLayoutContext';
import { addLine, ReferenceLineSettings, removeLine } from '../state/referenceElementsSlice';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { selectAxisScale, selectXAxisSettings, selectYAxisSettings } from '../state/selectors/axisSelectors';
import { useIsPanorama } from '../context/PanoramaContext';

import { useClipPathId } from '../container/ClipPathProvider';
import { svgPropertiesAndEvents } from '../util/svgPropertiesAndEvents';
import { RequiresDefaultProps, resolveDefaultProps } from '../util/resolveDefaultProps';
import { ZIndexable, ZIndexLayer } from '../zIndex/ZIndexLayer';
import { DefaultZIndexes } from '../zIndex/DefaultZIndexes';
import { isWellBehavedNumber } from '../util/isWellBehavedNumber';
import { JavascriptAnimate } from '../animation/JavascriptAnimate';

/**
 * Single point that defines one end of a segment.
 * These coordinates are in data space, meaning that you should provide
 * values that correspond to the data domain of the axes.
 * So you would provide a value of `Page A` to indicate the data value `Page A`
 * and then recharts will convert that to pixels.
 *
 * Likewise for numbers. If your x-axis goes from 0 to 100,
 * and you want the line to end at 50, you would provide `50` here.
 */
export type ReferenceLineSegment = readonly [
  {
    x?: number | string;
    y?: number | string;
  },
  {
    x?: number | string;
    y?: number | string;
  },
];

export type ReferenceLinePosition = 'middle' | 'start' | 'end';

interface ReferenceLineProps extends ZIndexable {
  ifOverflow?: IfOverflow;

  /**
   * The y-coordinate of the reference line in data space.
   * This value is used when you want to draw a horizontal reference line.
   *
   * You should provide a value that corresponds to the data domain of the y-axis.
   * So you would provide a value of `100` to indicate the data value `100`
   * and then recharts will convert that to pixels.
   *
   * If you provide this prop, then the `x` and `segment` props will be ignored.
   */
  y?: number | string;

  /**
   * The x-coordinate of the reference line in data space.
   * This value is used when you want to draw a vertical reference line.
   *
   * You should provide a value that corresponds to the data domain of the x-axis.
   * So you would provide a value of `Page A` to indicate the data value `Page A`
   * and then recharts will convert that to pixels.
   *
   * This prop is ignored if the `y` prop is provided.
   * If you provide this prop, then the `segment` prop will be ignored.
   */
  x?: number | string;

  /**
   * An array of two points that define the start and end of a line segment.
   * Each point is an object with `x` and `y` properties.
   * If this array has other than two points, it will be ignored.
   *
   * These coordinates are in data space, meaning that you should provide
   * values that correspond to the data domain of the axes.
   * So you would provide a value of `Page A` to indicate the data value `Page A`
   * and then recharts will convert that to pixels.
   *
   * Likewise for numbers. If your x-axis goes from 0 to 100,
   * and you want the line to end at 50, you would provide `50` here.
   *
   * This prop is only used if both `x` and `y` props are undefined.
   */
  segment?: ReferenceLineSegment;

  /**
   * The position of the reference line when the axis has bandwidth
   * (e.g., a band scale). This determines where within the band
   * the line is drawn.
   * @defaultValue 'middle'
   */
  position?: ReferenceLinePosition;

  className?: number | string;
  yAxisId?: number | string;
  xAxisId?: number | string;
  shape?: ReactElement<SVGElement> | ((props: any) => ReactElement<SVGElement>);
  label?: ImplicitLabelType;
  /**
   * @defaultValue 400
   */
  zIndex?: number;

  /**
   * Whether to animate the reference line when its position changes.
   * @defaultValue false
   */
  isAnimationActive?: boolean;

  /**
   * The duration of the animation in milliseconds.
   * @defaultValue 300
   */
  animationDuration?: number;

  /**
   * The easing function for the animation.
   * @defaultValue 'ease'
   */
  animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';

  /**
   * The delay before the animation starts in milliseconds.
   * @defaultValue 0
   */
  animationBegin?: number;
}

/**
 * This excludes `viewBox` prop from svg for two reasons:
 * 1. The components wants viewBox of object type, and svg wants string
 *    - so there's a conflict, and the component will throw if it gets string
 * 2. Internally the component calls `svgPropertiesNoEvents` which filters the viewBox away anyway
 */
export type Props = Omit<SVGProps<SVGLineElement>, 'viewBox'> & ReferenceLineProps;

const renderLine = (option: ReferenceLineProps['shape'], props: SVGProps<SVGLineElement>) => {
  let line;

  if (React.isValidElement(option)) {
    // @ts-expect-error element cloning is not typed
    line = React.cloneElement(option, props);
  } else if (typeof option === 'function') {
    line = option(props);
  } else {
    if (
      !isWellBehavedNumber(props.x1) ||
      !isWellBehavedNumber(props.y1) ||
      !isWellBehavedNumber(props.x2) ||
      !isWellBehavedNumber(props.y2)
    ) {
      return null;
    }
    line = <line {...props} className="recharts-reference-line-line" />;
  }

  return line;
};

type EndPointsPropsSubset = Pick<PropsWithDefaults, 'y' | 'x' | 'segment' | 'ifOverflow'>;

const getHorizontalLineEndPoints = (
  yCoord: number | string,
  ifOverflow: IfOverflow,
  position: Props['position'],
  yAxisOrientation: Props['orientation'],
  scales: any,
  viewBox: CartesianViewBoxRequired,
) => {
  const { x, width } = viewBox;
  const coord = scales.y.apply(yCoord, { position });
  // don't render the line if the scale can't compute a result that makes sense
  if (isNan(coord)) return null;

  if (ifOverflow === 'discard' && !scales.y.isInRange(coord)) {
    return null;
  }

  const points = [
    { x: x + width, y: coord },
    { x, y: coord },
  ];
  return yAxisOrientation === 'left' ? points.reverse() : points;
};

const getVerticalLineEndPoints = (
  xCoord: number | string,
  ifOverflow: IfOverflow,
  position: Props['position'],
  xAxisOrientation: Props['orientation'],
  scales: any,
  viewBox: CartesianViewBoxRequired,
) => {
  const { y, height } = viewBox;
  const coord = scales.x.apply(xCoord, { position });
  // don't render the line if the scale can't compute a result that makes sense
  if (isNan(coord)) return null;

  if (ifOverflow === 'discard' && !scales.x.isInRange(coord)) {
    return null;
  }

  const points = [
    { x: coord, y: y + height },
    { x: coord, y },
  ];
  return xAxisOrientation === 'top' ? points.reverse() : points;
};

const getSegmentLineEndPoints = (
  segment: ReferenceLineSegment,
  ifOverflow: IfOverflow,
  position: Props['position'],
  scales: any,
) => {
  const points = segment.map(p => scales.apply(p, { position }));

  if (ifOverflow === 'discard' && points.some(p => !scales.isInRange(p))) {
    return null;
  }

  return points;
};

export const getEndPoints = (
  scales: any,
  viewBox: CartesianViewBoxRequired,
  position: Props['position'],
  xAxisOrientation: Props['orientation'],
  yAxisOrientation: Props['orientation'],
  props: EndPointsPropsSubset,
) => {
  const { x: xCoord, y: yCoord, segment, ifOverflow } = props;
  const isFixedX = isNumOrStr(xCoord);
  const isFixedY = isNumOrStr(yCoord);

  if (isFixedY) {
    return getHorizontalLineEndPoints(yCoord, ifOverflow, position, yAxisOrientation, scales, viewBox);
  }
  if (isFixedX) {
    return getVerticalLineEndPoints(xCoord, ifOverflow, position, xAxisOrientation, scales, viewBox);
  }
  if (segment != null && segment.length === 2) {
    return getSegmentLineEndPoints(segment, ifOverflow, position, scales);
  }

  return null;
};

function ReportReferenceLine(props: ReferenceLineSettings): null {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(addLine(props));
    return () => {
      dispatch(removeLine(props));
    };
  });
  return null;
}

type LineEndPoints = { x1: number; y1: number; x2: number; y2: number };

function interpolate(from: number | null | undefined, to: number | null | undefined, t: number): number {
  const fromVal = from ?? 0;
  const toVal = to ?? 0;
  return fromVal + (toVal - fromVal) * t;
}

function ReferenceLineImpl(props: PropsWithDefaults) {
  const {
    xAxisId,
    yAxisId,
    shape,
    className,
    ifOverflow,
    isAnimationActive,
    animationDuration,
    animationEasing,
    animationBegin,
  } = props;

  const animationId = useId();
  const previousEndPointsRef = useRef<LineEndPoints | null>(null);

  const isPanorama = useIsPanorama();
  const clipPathId = useClipPathId();
  const xAxis = useAppSelector(state => selectXAxisSettings(state, xAxisId));
  const yAxis = useAppSelector(state => selectYAxisSettings(state, yAxisId));
  const xAxisScale = useAppSelector(state => selectAxisScale(state, 'xAxis', xAxisId, isPanorama));
  const yAxisScale = useAppSelector(state => selectAxisScale(state, 'yAxis', yAxisId, isPanorama));

  const viewBox = useViewBox();

  if (!clipPathId || !viewBox || xAxis == null || yAxis == null || xAxisScale == null || yAxisScale == null) {
    return null;
  }

  const scales = createLabeledScales({ x: xAxisScale, y: yAxisScale });

  const endPoints = getEndPoints(scales, viewBox, props.position, xAxis.orientation, yAxis.orientation, props);
  if (!endPoints) {
    return null;
  }

  const [{ x: x1, y: y1 }, { x: x2, y: y2 }] = endPoints;
  const currentEndPoints: LineEndPoints = { x1, y1, x2, y2 };

  const clipPath = ifOverflow === 'hidden' ? `url(#${clipPathId})` : undefined;

  // Check if we should animate
  const prevEndPoints = previousEndPointsRef.current;
  const shouldAnimate =
    isAnimationActive &&
    prevEndPoints != null &&
    (prevEndPoints.x1 !== x1 || prevEndPoints.y1 !== y1 || prevEndPoints.x2 !== x2 || prevEndPoints.y2 !== y2);

  const renderContent = (animatedEndPoints: LineEndPoints) => {
    const lineProps: SVGProps<SVGLineElement> = {
      clipPath,
      ...svgPropertiesAndEvents(props),
      x1: animatedEndPoints.x1,
      y1: animatedEndPoints.y1,
      x2: animatedEndPoints.x2,
      y2: animatedEndPoints.y2,
    };

    const rect = rectWithCoords(animatedEndPoints);

    return (
      <ZIndexLayer zIndex={props.zIndex}>
        <Layer className={clsx('recharts-reference-line', className)}>
          {renderLine(shape, lineProps)}
          <CartesianLabelContextProvider {...rect} lowerWidth={rect.width} upperWidth={rect.width}>
            <CartesianLabelFromLabelProp label={props.label} />
            {props.children}
          </CartesianLabelContextProvider>
        </Layer>
      </ZIndexLayer>
    );
  };

  if (shouldAnimate && prevEndPoints) {
    return (
      <JavascriptAnimate
        animationId={`reference-line-${animationId}`}
        duration={animationDuration}
        easing={animationEasing}
        begin={animationBegin}
        isActive
      >
        {(t: number) => {
          const animatedEndPoints: LineEndPoints = {
            x1: interpolate(prevEndPoints.x1, x1, t),
            y1: interpolate(prevEndPoints.y1, y1, t),
            x2: interpolate(prevEndPoints.x2, x2, t),
            y2: interpolate(prevEndPoints.y2, y2, t),
          };

          // Update ref at end of animation
          if (t === 1) {
            previousEndPointsRef.current = currentEndPoints;
          }

          return renderContent(animatedEndPoints);
        }}
      </JavascriptAnimate>
    );
  }

  // No animation - just render and update ref
  previousEndPointsRef.current = currentEndPoints;
  return renderContent(currentEndPoints);
}

export const referenceLineDefaultProps = {
  ifOverflow: 'discard',
  xAxisId: 0,
  yAxisId: 0,
  fill: 'none',
  stroke: '#ccc',
  fillOpacity: 1,
  strokeWidth: 1,
  position: 'middle',
  zIndex: DefaultZIndexes.line,
  isAnimationActive: false,
  animationDuration: 300,
  animationEasing: 'ease',
  animationBegin: 0,
} as const satisfies Partial<Props>;

type PropsWithDefaults = RequiresDefaultProps<Props, typeof referenceLineDefaultProps>;

/**
 * @provides CartesianLabelContext
 */
export function ReferenceLine(outsideProps: Props) {
  const props: PropsWithDefaults = resolveDefaultProps(outsideProps, referenceLineDefaultProps);
  return (
    <>
      <ReportReferenceLine
        yAxisId={props.yAxisId}
        xAxisId={props.xAxisId}
        ifOverflow={props.ifOverflow}
        x={props.x}
        y={props.y}
        segment={props.segment}
      />
      <ReferenceLineImpl {...props} />
    </>
  );
}

ReferenceLine.displayName = 'ReferenceLine';
