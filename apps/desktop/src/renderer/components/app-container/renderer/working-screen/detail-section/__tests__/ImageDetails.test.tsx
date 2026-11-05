import { expect, jest, test } from '@jest/globals';
import type { ProjectImageMetadata, ProjectImagePolygonSettingsInput } from '@manticore/project';
import type { ProjectContent } from '@manticore/project/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { createTheme, ThemeProvider } from '@mui/material';

import { AssetType, type ProjectActionHandler } from '../../../../../../../types';
import { ProjectStructureContext } from '../../../../ProjectStructureContext';

import ImageDetails from '../ImageDetails/ImageDetails';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const imageItem: ProjectContent = { id: 5, name: 'Image', parentId: 0, type: AssetType.Image, version: 0 };

test('draws a 16px checkerboard and a half-size preview in a full-width 132px frame', async () => {
  const drawImage = jest.fn();
  const fillRect = jest.fn();
  const context = { beginPath: jest.fn(), closePath: jest.fn(), drawImage, fill: jest.fn(), fillRect, lineTo: jest.fn(), moveTo: jest.fn(), setTransform: jest.fn(), stroke: jest.fn() } as unknown as CanvasRenderingContext2D;
  const theme = createTheme({ palette: { error: { main: '#ff0000' } } });
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, value: 300 });
  Object.defineProperty(HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, value: 132 });
  Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: class { observe() {} disconnect() {} } });
  const bitmap = { close: jest.fn(), height: 256, width: 256 };
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: jest.fn(async () => bitmap) });
  const loadImageMetadata = jest.fn<(projectPath: string, id: number) => Promise<ProjectImageMetadata>>().mockResolvedValue({
    binarySize: 1234,
    croppedWidth: 120,
    croppedHeight: 60,
    croppedX: 4,
    croppedY: 2,
    format: 'png',
    hasTransparency: true,
    polygonSettings: { alphaThreshold: 0, crop: { height: 60, width: 120, x: 4, y: 2 }, maxPointCount: 32, minimalDistance: 8, offset: 0, polygons: [{ points: new Uint16Array([4, 2, 124, 2, 124, 62, 4, 62]), triangles: new Uint16Array([34, 67]) }], polygonsApplied: false, source: { format: 'png', height: 64, width: 128 } },
    sourceWidth: 128,
    sourceHeight: 64,
    supportsTransparency: true,
    alphaPolygons: [[4, 2, 124, 2, 124, 62, 4, 62]]
  });
  const applyImagePolygonSettings = jest.fn<(projectPath: string, id: number, settings: ProjectImagePolygonSettingsInput) => Promise<ProjectImageMetadata>>().mockResolvedValue({} as ProjectImageMetadata);
  const loadImageSource = jest.fn<(projectPath: string, id: number) => Promise<ArrayBuffer>>().mockResolvedValue(new ArrayBuffer(0));
  Object.defineProperty(window, 'manticore', { configurable: true, value: { applyImagePolygonSettings, loadImageMetadata, loadImageSource } });

  const { unmount } = render(
    <ThemeProvider theme={theme}>
      <ProjectStructureContext.Provider value={{
        childrenIdsByParentId: {},
        contentById: {},
        expandedItemIds: new Set(),
        isPasting: false,
        onAction: jest.fn<ProjectActionHandler>(),
        projectName: 'Test project',
        projectPath: '/test/project',
        selection: [],
        visibleProjectItems: []
      }}>
        <ImageDetails item={imageItem} />
      </ProjectStructureContext.Provider>
    </ThemeProvider>
  );

  const canvas = screen.getByLabelText('details.imagePreview');
  expect(canvas.parentElement).toHaveStyle({ height: '132px', width: '100%' });
  await waitFor(() => expect(loadImageSource).toHaveBeenCalledWith('/test/project', 5));
  expect(loadImageMetadata).toHaveBeenCalledWith('/test/project', 5);
  await waitFor(() => expect(drawImage).toHaveBeenCalledWith(bitmap, 86, 2, 128, 128));
  expect(screen.getByText('details.binarySize').nextElementSibling).toHaveTextContent('1.21 KB');
  expect(screen.getByText('details.realSize').nextElementSibling).toHaveTextContent('128 × 64 px');
  expect(screen.getByText('details.croppedSize').nextElementSibling).toHaveTextContent('120 × 60 px');
  expect(screen.getByText('details.imageFormat').nextElementSibling).toHaveTextContent('PNG');
  expect(fillRect).toHaveBeenCalledWith(0, 0, 300, 132);
  expect(fillRect).toHaveBeenCalledWith(0, 0, 16, 16);
  expect(fillRect).toHaveBeenCalledWith(16, 16, 16, 16);

  const triangleSwitch = screen.getByRole('switch', { name: 'details.showTriangles' });
  const polygonPreviewSwitch = screen.getByRole('switch', { name: 'details.showPolygon' });
  const polygonSwitch = screen.getByRole('switch', { name: 'details.usePolygonsInsteadOfQuads' });
  expect(triangleSwitch).not.toBeChecked();
  expect(polygonPreviewSwitch).not.toBeChecked();
  expect(polygonSwitch).not.toBeChecked();
  expect(polygonSwitch).toBeEnabled();
  expect(screen.getByRole('slider', { name: 'details.alphaThreshold' })).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByRole('button', { name: 'common.apply' })).toBeDisabled();
  fireEvent.click(triangleSwitch);
  expect(triangleSwitch).toBeChecked();
  fireEvent.click(polygonPreviewSwitch);
  expect(polygonPreviewSwitch).toBeChecked();
  await waitFor(() => expect(fillRect).toHaveBeenCalledWith(87, 33, 6, 6));
  expect(context.lineTo).toHaveBeenCalledWith(210, 96);
  fireEvent.click(polygonSwitch);
  expect(polygonSwitch).toBeChecked();
  expect(screen.getByRole('button', { name: 'common.apply' })).toBeEnabled();
  expect(screen.getByRole('slider', { name: 'details.pointCount' })).toHaveAttribute('aria-valuemin', '5');
  expect(screen.getByRole('slider', { name: 'details.pointCount' })).toHaveAttribute('aria-valuemax', '32');
  expect(screen.getByRole('slider', { name: 'details.pointCount' })).toHaveAttribute('aria-valuenow', '32');
  expect(screen.getByRole('slider', { name: 'details.minimalDistance' })).toHaveAttribute('aria-valuemin', '1');
  expect(screen.getByRole('slider', { name: 'details.minimalDistance' })).toHaveAttribute('aria-valuemax', '255');
  expect(screen.getByRole('slider', { name: 'details.minimalDistance' })).toHaveAttribute('aria-valuenow', '8');
  expect(screen.getByRole('slider', { name: 'details.alphaThreshold' })).toHaveAttribute('aria-valuemax', '254');
  expect(screen.getByRole('slider', { name: 'details.alphaThreshold' })).toHaveAttribute('aria-valuemin', '0');
  expect(screen.getByRole('slider', { name: 'details.alphaThreshold' })).toHaveAttribute('aria-valuenow', '0');
  await waitFor(() => expect(context.lineTo).toHaveBeenCalledWith(210, 36));
  expect(context.strokeStyle).toBe('#ff0000');
  expect(context.lineTo).toHaveBeenCalledWith(210, 96);
  expect(loadImageSource).toHaveBeenCalledTimes(1);
  fireEvent.click(triangleSwitch);
  expect(triangleSwitch).not.toBeChecked();

  unmount();
  expect(bitmap.close).toHaveBeenCalled();
  jest.restoreAllMocks();
});

test('disables the polygon toggle for opaque images and formats without transparency support', async () => {
  const context = { fillRect: jest.fn(), setTransform: jest.fn() } as unknown as CanvasRenderingContext2D;
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: class { observe() {} disconnect() {} } });
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: jest.fn(async () => ({ close: jest.fn(), height: 1, width: 1 })) });
  const loadImageMetadata = jest.fn<(projectPath: string, id: number) => Promise<ProjectImageMetadata>>().mockResolvedValue({ alphaPolygons: [], binarySize: 1, croppedHeight: 1, croppedWidth: 1, croppedX: 0, croppedY: 0, format: 'jpeg', hasTransparency: false, polygonSettings: { alphaThreshold: 0, crop: { height: 1, width: 1, x: 0, y: 0 }, maxPointCount: 32, minimalDistance: 8, offset: 0, polygons: [], polygonsApplied: false, source: { format: 'jpeg', height: 1, width: 1 } }, sourceHeight: 1, sourceWidth: 1, supportsTransparency: false });
  Object.defineProperty(window, 'manticore', { configurable: true, value: { loadImageMetadata } });

  render(
    <ThemeProvider theme={createTheme()}>
      <ProjectStructureContext.Provider value={{ childrenIdsByParentId: {}, contentById: {}, expandedItemIds: new Set(), isPasting: false, onAction: jest.fn<ProjectActionHandler>(), projectName: 'Test project', projectPath: '/test/project', selection: [], visibleProjectItems: [] }}>
        <ImageDetails item={imageItem} />
      </ProjectStructureContext.Provider>
    </ThemeProvider>
  );

  await waitFor(() => expect(screen.getByRole('switch', { name: 'details.usePolygonsInsteadOfQuads' })).toBeDisabled());
  expect(screen.queryByRole('slider', { name: 'details.alphaThreshold' })).not.toBeInTheDocument();
  jest.restoreAllMocks();
});
