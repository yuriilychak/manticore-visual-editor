import { type FC, memo, type ReactNode, type SyntheticEvent, useState } from 'react';

import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';

import { TREE_ACCORDION_SLOT_PROPS, TREE_ACCORDION_SLOTS, TREE_ACCORDION_STYLES } from './constants';
import ProjectItem, { type ProjectItemProps } from './ProjectItem';

type TreeAccordionProps = Omit<ProjectItemProps, 'children' | 'expanded'> & {
  children: ReactNode;
};

const TreeAccordion: FC<TreeAccordionProps> = ({ children, contentType, id, name, onAction }) => {
  const [isExpanded, setExpanded] = useState(false);
  
  const handleChange = (event: SyntheticEvent) => {
    if (event.target instanceof Element && event.target.closest('button, input')) return;

    setExpanded(!isExpanded);
  };

  return (
    <Accordion
      disableGutters
      elevation={0}
      expanded={isExpanded}
      onChange={handleChange}
      slotProps={TREE_ACCORDION_SLOT_PROPS}
      slots={TREE_ACCORDION_SLOTS}
      square
      sx={TREE_ACCORDION_STYLES.root}
    >
      <AccordionSummary
        aria-label={name}
        component="div"
        sx={TREE_ACCORDION_STYLES.summary}
      >
        <ProjectItem
          contentType={contentType}
          expanded={isExpanded}
          id={id}
          name={name}
          onAction={onAction}
        />
      </AccordionSummary>
      <AccordionDetails sx={TREE_ACCORDION_STYLES.details}>{children}</AccordionDetails>
    </Accordion>
  );
};

export default memo(TreeAccordion);
