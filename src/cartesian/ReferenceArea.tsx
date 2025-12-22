import * as React from 'react';
import { ReactElement, useEffect, useId, useRef } from 'react';
import { clsx } from 'clsx';
import { Layer } from '../container/Layer';
import { CartesianLabelContextProvider, CartesianLabelFromLabelProp, ImplicitLabelType } from '../component/Label';
import { createLabeledScales, rectWithPoints } from '../util/CartesianUtils';
import { IfOverflow } from '../util/IfOverflow';
import { isNumOrStr } from '../util/DataUtils';
import { Props as RectangleProps, Rectangle } from '../shape/Rectangle';

import { addArea, ReferenceAreaSettings, removeArea } from '../state/referenceElementsSlice';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { selectAxisScale } from '../state/selectors/axisSelectors';
import { useIsPanorama } from '../context/PanoramaContext';

import { useClipPathId } from '../container/ClipPathProvider';
import { RectanglePosition } from '../util/types';
import { svgPropertiesAndEvents, SVGPropsAndEvents } from '../util/svgPropertiesAndEvents';
import { RequiresDefaultProps, resolveDefaultProps } from '../util/resolveDefaultProps';
import { ZIndexable, ZIndexLayer } from '../zIndex/ZIndexLayer';
import { DefaultZIndexes } from '../zIndex/DefaultZIndexes';
import { RechartsScale } from '../util/scale/RechartsScale';
import { JavascriptAnimate } from '../animation/JavascriptAnimate';

interface ReferenceAreaProps extends ZIndexable {
  /**
   * @defaultValue discard
   */
  ifOverflow?: IfOverflow;
  x1?: number | string;
  x2?: number | string;
  y1?: number | string;
  y2?: number | string;

  className?: number | string;
  /**
   * @defaultValue 0
   */
  yAxisId?: number | string;
  /**
   * @defaultValue 0
   */
  xAxisId?: number | string;
  shape?: ReactElement<SVGElement> | ((props: any) => ReactElement<SVGElement>);
  label?: ImplicitLabelType;
  /**
   * @defaultValue 100
   */
  zIndex?: number;
  children?: React.ReactNode;

  /**
   * Whether to animate the reference area when its position changes.
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

/*
 * Omit width, height, x, y from SVGPropsAndEvents because ReferenceArea receives x1, x2, y1, y2 instead.
 * The position is calculated internally instead.
 */
export type Props = Omit<SVGPropsAndEvents<RectangleProps>, 'width' | 'height' | 'x' | 'y'> & ReferenceAreaProps;

const getRect = (
  hasX1: boolean,
  hasX2: boolean,
  hasY1: boolean,
  hasY2: boolean,
  xAxisScale: RechartsScale | undefined,
  yAxisScale: RechartsScale | undefined,
  props: Props,
): RectanglePosition | null => {
  const { x1: xValue1, x2: xValue2, y1: yValue1, y2: yValue2 } = props;

  if (xAxisScale == null || yAxisScale == null) {
    return null;
  }

  const scales = createLabeledScales({ x: xAxisScale, y: yAxisScale });

  const p1 = {
    x: hasX1 ? scales.x.apply(xValue1, { position: 'start' }) : scales.x.rangeMin,
    y: hasY1 ? scales.y.apply(yValue1, { position: 'start' }) : scales.y.rangeMin,
  };

  const p2 = {
    x: hasX2 ? scales.x.apply(xValue2, { position: 'end' }) : scales.x.rangeMax,
    y: hasY2 ? scales.y.apply(yValue2, { position: 'end' }) : scales.y.rangeMax,
  };

  if (props.ifOverflow === 'discard' && (!scales.isInRange(p1) || !scales.isInRange(p2))) {
    return null;
  }

  return rectWithPoints(p1, p2);
};

const renderRect = (option: ReferenceAreaProps['shape'], props: SVGPropsAndEvents<RectangleProps>) => {
  let rect;

  if (React.isValidElement(option)) {
    // @ts-expect-error element cloning is not typed
    rect = React.cloneElement(option, props);
  } else if (typeof option === 'function') {
    rect = option(props);
  } else {
    rect = <Rectangle {...props} className="recharts-reference-area-rect" />;
  }

  return rect;
};

function ReportReferenceArea(props: ReferenceAreaSettings): null {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(addArea(props));
    return () => {
      dispatch(removeArea(props));
    };
  });
  return null;
}

function interpolate(from: number | undefined, to: number | undefined, t: number): number {
  const fromVal = from ?? 0;
  const toVal = to ?? 0;
  return fromVal + (toVal - fromVal) * t;
}

function ReferenceAreaImpl(props: PropsWithDefaults) {
  const {
    x1,
    x2,
    y1,
    y2,
    className,
    shape,
    xAxisId,
    yAxisId,
    isAnimationActive,
    animationDuration,
    animationEasing,
    animationBegin,
  } = props;

  const animationId = useId();
  const previousRectRef = useRef<RectanglePosition | null>(null);

  const clipPathId = useClipPathId();
  const isPanorama = useIsPanorama();
  const xAxisScale = useAppSelector(state => selectAxisScale(state, 'xAxis', xAxisId, isPanorama));
  const yAxisScale = useAppSelector(state => selectAxisScale(state, 'yAxis', yAxisId, isPanorama));

  if (xAxisScale == null || yAxisScale == null) {
    return null;
  }

  const hasX1 = isNumOrStr(x1);
  const hasX2 = isNumOrStr(x2);
  const hasY1 = isNumOrStr(y1);
  const hasY2 = isNumOrStr(y2);

  if (!hasX1 && !hasX2 && !hasY1 && !hasY2 && !shape) {
    return null;
  }

  const rect = getRect(hasX1, hasX2, hasY1, hasY2, xAxisScale, yAxisScale, props);

  if (!rect && !shape) {
    return null;
  }

  const isOverflowHidden = props.ifOverflow === 'hidden';
  const clipPath = isOverflowHidden ? `url(#${clipPathId})` : undefined;

  // Check if we should animate
  const prevRect = previousRectRef.current;
  const shouldAnimate =
    isAnimationActive &&
    rect != null &&
    prevRect != null &&
    (prevRect.x !== rect.x ||
      prevRect.y !== rect.y ||
      prevRect.width !== rect.width ||
      prevRect.height !== rect.height);

  const renderContent = (animatedRect: RectanglePosition | null) => {
    return (
      <ZIndexLayer zIndex={props.zIndex}>
        <Layer className={clsx('recharts-reference-area', className)}>
          {renderRect(shape, { clipPath, ...svgPropertiesAndEvents(props), ...animatedRect })}
          {animatedRect != null && (
            <CartesianLabelContextProvider
              {...animatedRect}
              lowerWidth={animatedRect.width}
              upperWidth={animatedRect.width}
            >
              <CartesianLabelFromLabelProp label={props.label} />
              {props.children}
            </CartesianLabelContextProvider>
          )}
        </Layer>
      </ZIndexLayer>
    );
  };

  if (shouldAnimate && prevRect && rect) {
    return (
      <JavascriptAnimate
        animationId={`reference-area-${animationId}`}
        duration={animationDuration}
        easing={animationEasing}
        begin={animationBegin}
        isActive
      >
        {(t: number) => {
          const animatedRect: RectanglePosition = {
            x: interpolate(prevRect.x, rect.x, t),
            y: interpolate(prevRect.y, rect.y, t),
            width: interpolate(prevRect.width, rect.width, t),
            height: interpolate(prevRect.height, rect.height, t),
          };

          // Update ref at end of animation
          if (t === 1) {
            previousRectRef.current = rect;
          }

          return renderContent(animatedRect);
        }}
      </JavascriptAnimate>
    );
  }

  // No animation - just render and update ref
  previousRectRef.current = rect;
  return renderContent(rect);
}

export const referenceAreaDefaultProps = {
  ifOverflow: 'discard',
  xAxisId: 0,
  yAxisId: 0,
  radius: 0,
  fill: '#ccc',
  fillOpacity: 0.5,
  stroke: 'none',
  strokeWidth: 1,
  zIndex: DefaultZIndexes.area,
  isAnimationActive: false,
  animationDuration: 300,
  animationEasing: 'ease',
  animationBegin: 0,
} as const satisfies Partial<Props>;

type PropsWithDefaults = RequiresDefaultProps<Props, typeof referenceAreaDefaultProps>;

/**
 * @provides CartesianLabelContext
 */
export function ReferenceArea(outsideProps: Props) {
  const props = resolveDefaultProps(outsideProps, referenceAreaDefaultProps);
  return (
    <>
      <ReportReferenceArea
        yAxisId={props.yAxisId}
        xAxisId={props.xAxisId}
        ifOverflow={props.ifOverflow}
        x1={props.x1}
        x2={props.x2}
        y1={props.y1}
        y2={props.y2}
      />
      <ReferenceAreaImpl {...props} />
    </>
  );
}

ReferenceArea.displayName = 'ReferenceArea';
