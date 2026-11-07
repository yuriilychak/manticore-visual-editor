import type { Theme } from '@mui/material';

import { CHECKER_SIZE, EDITABLE_POLYGON_COLOR, POINT_SIZE, REFERENCE_POLYGON_COLOR } from './constants';

export type Point = { x: number; y: number };

type ImageBounds = {
  scale: number;
  x: number;
  y: number;
};

type PolygonEditorBuilderProps = {
  allPoints: readonly Uint16Array[];
  bitmap: ImageBitmap;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  points: readonly Point[];
  theme: Theme;
};

class PolygonEditorBuilder {
  private imageBounds: ImageBounds | null = null;

  constructor(private readonly props: PolygonEditorBuilderProps) {}

  draw() {
    return this.drawBackground().drawImage().drawPolygons().drawEditablePolygon();
  }

  private drawBackground() {
    const { canvas, context, theme } = this.props;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = theme.palette.background.default;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = theme.palette.background.paper;
    for (let row = 0; row < canvas.height; row += CHECKER_SIZE) {
      for (let column = (row / CHECKER_SIZE % 2) * CHECKER_SIZE; column < canvas.width; column += CHECKER_SIZE * 2) context.fillRect(column, row, CHECKER_SIZE, CHECKER_SIZE);
    }
    return this;
  }

  private drawImage() {
    const { bitmap, canvas, context } = this.props;
    const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
    const x = (canvas.width - bitmap.width * scale) / 2;
    const y = (canvas.height - bitmap.height * scale) / 2;
    context.drawImage(bitmap, x, y, bitmap.width * scale, bitmap.height * scale);
    this.imageBounds = { scale, x, y };
    return this;
  }

  private drawPolygons() {
    const { allPoints, context } = this.props;
    if (!this.imageBounds) return this;

    const { scale, x, y } = this.imageBounds;
    allPoints.forEach((polygon) => {
      if (!polygon.length) return;
      context.beginPath();
      context.moveTo(x + polygon[0] * scale, y + polygon[1] * scale);
      for (let index = 2; index < polygon.length; index += 2) context.lineTo(x + polygon[index] * scale, y + polygon[index + 1] * scale);
      context.closePath();
      context.strokeStyle = REFERENCE_POLYGON_COLOR;
      context.lineWidth = 1;
      context.stroke();
    });
    return this;
  }

  private drawEditablePolygon() {
    const { context, points } = this.props;
    if (!this.imageBounds || !points.length) return this;

    const { scale, x, y } = this.imageBounds;
    context.beginPath();
    context.moveTo(x + points[0].x * scale, y + points[0].y * scale);
    points.slice(1).forEach((point) => context.lineTo(x + point.x * scale, y + point.y * scale));
    context.closePath();
    context.strokeStyle = EDITABLE_POLYGON_COLOR;
    context.lineWidth = 2;
    context.stroke();
    points.forEach((point) => {
      context.fillStyle = EDITABLE_POLYGON_COLOR;
      context.fillRect(x + point.x * scale - POINT_SIZE / 2, y + point.y * scale - POINT_SIZE / 2, POINT_SIZE, POINT_SIZE);
    });
    return this;
  }
}

export default PolygonEditorBuilder;
