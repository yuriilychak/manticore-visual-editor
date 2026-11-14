import { type FC } from 'react';

import { Box } from '@mui/material';

import useMultipleImageDetails from './controller/useMultipleImageDetails';
import ImageActions from './ImageActions';
import { ImageControls } from './ImageControls';
import { ImagePreview } from './ImagePreview';
import MultipleImageProgressDialog from './MultipleImageProgressDialog';

type MultipleImageDetailsProps = {
  imageIds: readonly number[];
};

const MultipleImageDetails: FC<MultipleImageDetailsProps> = ({ imageIds }) => {
  const { applying, applyPolygonSettings, canApplyPolygonSettings, canGeneratePolygons, controlValues, generatePolygons, handleControlChange, previewImageId, previewMetadata, previewVersion, processedImageCount, sourceHeight, sourceWidth } = useMultipleImageDetails(imageIds);

  return (
    <Box display="flex" flexDirection="column" gap={2} mt={2}>
      <ImagePreview disabled={applying} id={previewImageId} metadata={previewMetadata} refreshVersion={previewVersion} />
      <ImageControls canGeneratePolygons={canGeneratePolygons} disabled={applying} generatePolygons={generatePolygons} onChange={handleControlChange} sourceHeight={sourceHeight} sourceWidth={sourceWidth} values={controlValues} />
      <ImageActions applying={applying} canApplyPolygonSettings={canApplyPolygonSettings} canModifyPolygons={false} onClick={applyPolygonSettings} />
      <MultipleImageProgressDialog open={applying} processedImageCount={processedImageCount} totalImageCount={imageIds.length} />
    </Box>
  );
};

export default MultipleImageDetails;
