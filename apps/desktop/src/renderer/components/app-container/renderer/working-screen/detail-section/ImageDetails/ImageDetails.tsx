import type { ProjectContent } from '@manticore/project/types';
import { type FC } from 'react';

import { Box } from '@mui/material';

import { useImageDetails } from './controller';
import ImageActions from './ImageActions';
import { ImageControls } from './ImageControls';
import { ImageMetadata } from './ImageMetadata';
import { ImagePreview } from './ImagePreview';
import { PolygonEditorDialog } from './PolygonEditorDialog';

type ImageDetailsProps = {
  item: ProjectContent;
};

const ImageDetails: FC<ImageDetailsProps> = ({ item }) => {
  const { id } = item;
  const { applying, canApplyPolygonSettings, canGeneratePolygons, canModifyPolygons, controlValues, generatePolygons, handleButtonClick, handleControlChange, metadata, polygonEditorDialog, previewVersion, slice9 } = useImageDetails(item);

  return (
    <Box display="flex" flexDirection="column" gap={2} mt={2}>
      <ImagePreview id={id} metadata={metadata} refreshVersion={previewVersion} slice9={slice9} />
      {metadata && <ImageMetadata metadata={metadata} />}
      <ImageControls canGeneratePolygons={canGeneratePolygons} generatePolygons={generatePolygons} onChange={handleControlChange} sourceHeight={metadata?.croppedHeight ?? 1} sourceWidth={metadata?.croppedWidth ?? 1} values={controlValues} />
      <ImageActions applying={applying} canApplyPolygonSettings={canApplyPolygonSettings} canModifyPolygons={canModifyPolygons} onClick={handleButtonClick} />
      {polygonEditorDialog && <PolygonEditorDialog {...polygonEditorDialog} />}
    </Box>
  );
};

export default ImageDetails;
