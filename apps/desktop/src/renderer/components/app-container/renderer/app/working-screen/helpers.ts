import {
  DEFAULT_PANE_PERCENTAGES,
  DIVIDER_SIZE,
  MIN_PANE_SIZE,
  PANE_PERCENTAGE_KEYS,
  PANE_PERCENTAGES_STORAGE_KEY
} from './constants';
import type { DragState, PanePercentages } from './types';

const getPercentage = (value: number, total: number) => (value / total) * 100;

const getClampedPercentage = (
  value: number,
  containerSize: number,
  dividerMultiplier: number,
  paneMultiplier: number,
  offset: number,
  maximumOffset = 0
) => {
  const availableSize = Math.max(containerSize - DIVIDER_SIZE * dividerMultiplier, MIN_PANE_SIZE * paneMultiplier);
  const minimumPercentage = getPercentage(MIN_PANE_SIZE, availableSize);
  const valuePercentage = getPercentage(value, availableSize) + offset;
  const maximumPercentage = 100 - maximumOffset - minimumPercentage;

  return Math.min(Math.max(valuePercentage, minimumPercentage), maximumPercentage);
};

export const getStoredPanePercentages = (): PanePercentages => {
  try {
    const storedPercentages = JSON.parse(
      window.localStorage.getItem(PANE_PERCENTAGES_STORAGE_KEY) ?? ''
    ) as Partial<PanePercentages>;
    const panePercentages = PANE_PERCENTAGE_KEYS.reduce<PanePercentages>(
      (percentages, direction) => {
        const value = storedPercentages[direction];

        if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 100) {
          percentages[direction] = value;
        }

        return percentages;
      },
      { ...DEFAULT_PANE_PERCENTAGES }
    );

    return panePercentages.left + panePercentages.right >= 100
      ? { ...DEFAULT_PANE_PERCENTAGES, top: panePercentages.top }
      : panePercentages;
  } catch {
    return DEFAULT_PANE_PERCENTAGES;
  }
};

export const getResizedPanePercentages = (
  currentPercentages: PanePercentages,
  { direction, startPercentage, startPosition }: DragState,
  { clientX, clientY }: PointerEvent,
  { height, width }: DOMRect
): PanePercentages => {
  const horizontalMovement = clientX - startPosition;
  const verticalMovement = clientY - startPosition;
  let { left, right, top } = currentPercentages;

  switch (direction) {
    case 'left':
      left = getClampedPercentage(horizontalMovement, width, 2, 3, startPercentage, right);
      break;
    case 'right':
      right = getClampedPercentage(-horizontalMovement, width, 2, 3, startPercentage, left);
      break;
    case 'top':
      top = getClampedPercentage(verticalMovement, height, 1, 2, startPercentage);
      break;
    default:
  }

  return { left, right, top };
};
