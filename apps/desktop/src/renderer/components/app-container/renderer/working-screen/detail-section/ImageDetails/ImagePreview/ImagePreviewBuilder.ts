import type { ProjectImageMetadata } from '@manticore/project';

import type { Theme } from '@mui/material';

import { CHECKER_SIZE, PREVIEW_PADDING, PREVIEW_SIZE, type PreviewState, type PreviewToggleId } from './constants';

export type Slice9 = { bottom: number; left: number; right: number; top: number };

type ImageBounds = {
  height: number;
  scale: number;
  width: number;
  x: number;
  y: number;
};

type ImagePreviewBuilderProps = {
  bitmap: ImageBitmap | null;
  canvas: HTMLCanvasElement;
  checkedByToggleId: Record<PreviewToggleId, boolean>;
  context: CanvasRenderingContext2D;
  metadata: ProjectImageMetadata | null;
  slice9?: Slice9;
  theme: Theme;
};

class ImagePreviewBuilder {
  private imageBounds: ImageBounds | null = null;

  constructor(private readonly props: ImagePreviewBuilderProps) {}

  static async loadSource(projectPath: string, id: number, format: string, request: { active: boolean }): Promise<PreviewState | null> {
    try {
      const loadImageSource = window.manticore?.loadImageSource;
      if (!loadImageSource) throw new Error('Image source loading is unavailable');

      const bytes = await loadImageSource(projectPath, id);
      const bitmap = await createImageBitmap(new Blob([bytes], { type: `image/${format}` }));
      if (!request.active) {
        bitmap.close();
        return null;
      }
      return { bitmap, id, isError: false, projectPath };
    } catch {
      return request.active ? { bitmap: null, id, isError: true, projectPath } : null;
    }
  }

  draw() {
    return this.drawBackground().drawImage().drawSlice9().drawPolygons();
  }

  private drawBackground() {
    const { canvas, context, theme } = this.props;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.fillStyle = theme.palette.background.default;
    context.fillRect(0, 0, width, height);
    context.fillStyle = theme.palette.background.paper;
    for (let y = 0; y < height; y += CHECKER_SIZE) {
      for (let x = (y / CHECKER_SIZE % 2) * CHECKER_SIZE; x < width; x += CHECKER_SIZE * 2) {
        context.fillRect(x, y, CHECKER_SIZE, CHECKER_SIZE);
      }
    }
    return this;
  }

  private drawImage() {
    const { bitmap, canvas, context } = this.props;
    if (!bitmap) return this;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const scale = Math.min(width / bitmap.width, (height - PREVIEW_PADDING) / bitmap.height, PREVIEW_SIZE / bitmap.width);
    const imageWidth = bitmap.width * scale;
    const imageHeight = bitmap.height * scale;
    const imageX = (width - imageWidth) / 2;
    const imageY = (height - imageHeight) / 2;
    context.drawImage(bitmap, imageX, imageY, imageWidth, imageHeight);
    this.imageBounds = { height: imageHeight, scale, width: imageWidth, x: imageX, y: imageY };
    return this;
  }

  private drawSlice9() {
    const { checkedByToggleId, context, metadata, slice9, theme } = this.props;
    if (!checkedByToggleId.slice9 || !slice9 || !metadata || !this.imageBounds) return this;

    const { bottom, left, right, top } = slice9;
    const { scale, x: imageX, y: imageY } = this.imageBounds;
    const crop = metadata.polygonSettings.crop;
    context.save();
    context.setLineDash([6, 4]);
    context.strokeStyle = theme.palette.warning.main;
    context.lineWidth = 1;
    const cropX = imageX + crop.x * scale;
    const cropY = imageY + crop.y * scale;
    const cropWidth = crop.width * scale;
    const cropHeight = crop.height * scale;
    [cropX + left * scale, cropX + cropWidth - right * scale].forEach((guideX) => {
      context.beginPath();
      context.moveTo(guideX, cropY);
      context.lineTo(guideX, cropY + cropHeight);
      context.stroke();
    });
    [cropY + top * scale, cropY + cropHeight - bottom * scale].forEach((guideY) => {
      context.beginPath();
      context.moveTo(cropX, guideY);
      context.lineTo(cropX + cropWidth, guideY);
      context.stroke();
    });
    context.restore();
    return this;
  }

  private drawPolygons() {
    const { checkedByToggleId, metadata } = this.props;
    if ((!checkedByToggleId.polygon && !checkedByToggleId.triangles) || !metadata || !metadata.sourceWidth || !metadata.sourceHeight || !this.imageBounds) return this;

    const { height: imageHeight, width: imageWidth, x: imageX, y: imageY } = this.imageBounds;
    const contentScale = Math.min(imageWidth / metadata.sourceWidth, imageHeight / metadata.sourceHeight);
    const contentWidth = metadata.sourceWidth * contentScale;
    const contentHeight = metadata.sourceHeight * contentScale;
    const contentX = imageX + (imageWidth - contentWidth) / 2;
    const contentY = imageY + (imageHeight - contentHeight) / 2;
    for (const { points, triangles } of metadata.polygonSettings.polygons) {
      const pointCount = points.length / 2;
      const pointAt = (index: number) => [contentX + (points[index * 2] - metadata.polygonSettings.offset) * contentScale, contentY + (points[index * 2 + 1] - metadata.polygonSettings.offset) * contentScale] as const;
      if (checkedByToggleId.polygon && pointCount) this.drawPolygon(pointCount, pointAt);
      if (checkedByToggleId.triangles) this.drawTriangles(pointCount, pointAt, triangles);
    }
    return this;
  }

  private drawPolygon(pointCount: number, pointAt: (index: number) => readonly [number, number]) {
    const { context, theme } = this.props;
    const polygonPoints = Array.from({ length: pointCount }, (_, index) => pointAt(index));
    const [firstX, firstY] = polygonPoints[0];
    context.beginPath();
    context.moveTo(firstX, firstY);
    for (const [x, y] of polygonPoints.slice(1)) context.lineTo(x, y);
    context.closePath();
    context.fillStyle = theme.palette.info.main;
    context.globalAlpha = 0.35;
    context.fill();
    context.globalAlpha = 1;
    context.strokeStyle = theme.palette.info.main;
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = theme.palette.info.main;
    for (const [x, y] of polygonPoints) context.fillRect(x - 3, y - 3, 6, 6);
  }

  private drawTriangles(pointCount: number, pointAt: (index: number) => readonly [number, number], triangles: Uint16Array) {
    const { context, theme } = this.props;
    for (const packedTriangle of triangles) {
      const indices = [(packedTriangle >>> 10) & 0b1_1111, (packedTriangle >>> 5) & 0b1_1111, packedTriangle & 0b1_1111];
      if (indices.some((index) => index >= pointCount)) continue;
      const [firstX, firstY] = pointAt(indices[0]);
      context.beginPath();
      context.moveTo(firstX, firstY);
      for (const index of indices.slice(1)) {
        const [x, y] = pointAt(index);
        context.lineTo(x, y);
      }
      context.closePath();
      context.fillStyle = theme.palette.error.main;
      context.globalAlpha = 0.4;
      context.fill();
      context.globalAlpha = 1;
      context.strokeStyle = theme.palette.error.main;
      context.lineWidth = 2;
      context.stroke();
    }
  }
}

export default ImagePreviewBuilder;
