import { type FC, type SyntheticEvent, useState } from 'react';

import { Accordion, AccordionDetails, AccordionSummary, Box } from '@mui/material';

import type { ProjectContent } from '@manticore/project/types';
import { AssetType, type ProjectActionHandler } from '../../../../../../../types';

import ProjectItem, { type ProjectItemType } from './ProjectItem';

type ProjectBundleTreeProps = {
  content: ProjectContent[];
  item: ProjectContent;
  onAction: ProjectActionHandler;
};

const isBundleTreeItem = (item: ProjectContent): item is ProjectContent & { type: AssetType.Bundle | AssetType.BundleFolder } =>
  item.type === AssetType.Bundle || item.type === AssetType.BundleFolder;

const ProjectBundleTree: FC<ProjectBundleTreeProps> = ({ content, item, onAction }) => {
  const [isExpanded, setExpanded] = useState(false);
  const children = content
    .filter((child) => child.parentId === item.id && (child.type === AssetType.BundleFolder || child.type === AssetType.Font || child.type === AssetType.Image || child.type === AssetType.TextureAtlas))
    .map((child) => (
      <Box key={child.id} pl={1}>
        {isBundleTreeItem(child) ? (
          <ProjectBundleTree content={content} item={child} onAction={onAction} />
        ) : (
          <ProjectItem contentType={child.type as ProjectItemType} id={child.id} name={child.name} onAction={onAction} />
        )}
      </Box>
    ));
  const hasChildren = children.length > 0;
  const handleAccordionChange = (event: SyntheticEvent) => {
    if (event.target instanceof Element && event.target.closest('button, input')) return;

    setExpanded(!isExpanded);
  };
  const projectItem = (
    <ProjectItem
      contentType={item.type as ProjectItemType}
      expanded={hasChildren && isExpanded}
      id={item.id}
      name={item.name}
      onAction={onAction}
    />
  );

  if (!hasChildren) return projectItem;

  return (
    <Accordion
      disableGutters
      elevation={0}
      expanded={isExpanded}
      onChange={handleAccordionChange}
      slots={{ heading: 'div' }}
      square
      sx={{ bgcolor: 'transparent', border: 0, '&::before': { display: 'none' } }}
    >
      <AccordionSummary
        aria-label={`${item.name} bundle`}
        component="div"
        sx={{ minHeight: 0, px: 0, '&.Mui-expanded': { minHeight: 0 }, '& .MuiAccordionSummary-content': { my: 0 } }}
      >
        {projectItem}
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
};

export default ProjectBundleTree;
