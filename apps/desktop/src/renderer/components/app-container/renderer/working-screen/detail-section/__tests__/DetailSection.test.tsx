import { describe, expect, jest, test } from '@jest/globals';
import type { ProjectContent } from '@manticore/project/types';
import { render, screen } from '@testing-library/react';

import { AssetType, type ProjectActionHandler } from '../../../../../../../types';
import { ProjectStructureContext } from '../../../../ProjectStructureContext';

import DetailSection from '../DetailSection';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('../ImageDetails', () => ({ ImageDetails: ({ item }: { item: ProjectContent }) => <canvas aria-label="details.imagePreview" data-image-id={item.id} /> }));

const content: ProjectContent[] = [
  { id: 2, name: 'Assets', parentId: 0, type: AssetType.ProjectFolder, version: 0 },
  { id: 3, name: 'Game bundle', parentId: 2, type: AssetType.Bundle, version: 0 },
  { id: 4, name: 'Sprites', parentId: 3, type: AssetType.BundleFolder, version: 0 },
  { id: 5, name: 'Hero', parentId: 4, type: AssetType.Image, version: 0 },
  { id: 6, name: 'Atlas', parentId: 4, type: AssetType.TextureAtlas, version: 0 },
  { id: 7, name: 'Enemy', parentId: 6, type: AssetType.Image, version: 0 },
  { id: 8, name: 'UI font', parentId: 3, type: AssetType.Font, version: 0 },
  { id: 9, name: 'Loose image', parentId: 2, type: AssetType.Image, version: 0 },
  { id: 10, name: 'Empty folder', parentId: 0, type: AssetType.ProjectFolder, version: 0 },
  { id: 11, name: 'Images only', parentId: 0, type: AssetType.ProjectFolder, version: 0 },
  { id: 12, name: 'Logo', parentId: 11, type: AssetType.Image, version: 0 },
  { id: 13, name: 'Empty bundle', parentId: 2, type: AssetType.Bundle, version: 0 }
];
const contentById = Object.fromEntries(content.map((item) => [item.id, item]));
const childrenIdsByParentId: Record<number, number[]> = Object.fromEntries(content.map((item) => [item.id, []]));
for (const item of content) (childrenIdsByParentId[item.parentId] ??= []).push(item.id);

const renderDetailSection = (selection: number[]) => render(
  <ProjectStructureContext.Provider value={{
    childrenIdsByParentId,
    contentById,
    expandedItemIds: new Set(),
    isPasting: false,
    onAction: jest.fn<ProjectActionHandler>(),
    projectName: 'Test project',
    projectPath: '/test',
    selection,
    visibleProjectItems: []
  }}>
    <DetailSection />
  </ProjectStructureContext.Provider>
);

describe('DetailSection', () => {
  test('shows a folder name, type icon, and counts from nested content', () => {
    renderDetailSection([2]);

    const heading = screen.getByRole('heading', { name: 'Assets' });
    expect(heading.parentElement?.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('details.images').parentElement?.parentElement).toHaveTextContent('3');
    expect(screen.getByText('details.textureAtlases').parentElement?.parentElement).toHaveTextContent('1');
    expect(screen.getByText('details.fonts').parentElement?.parentElement).toHaveTextContent('1');
  });

  test('shows counts for a bundle without including sibling files', () => {
    renderDetailSection([3]);

    const heading = screen.getByRole('heading', { name: 'Game bundle' });
    expect(heading.parentElement?.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('details.images').parentElement?.parentElement).toHaveTextContent('2');
    expect(screen.getByText('details.textureAtlases').parentElement?.parentElement).toHaveTextContent('1');
    expect(screen.getByText('details.fonts').parentElement?.parentElement).toHaveTextContent('1');
  });

  test('shows a selected file name and icon without folder counts', () => {
    renderDetailSection([5]);

    const heading = screen.getByRole('heading', { name: 'Hero' });
    expect(heading.parentElement?.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByLabelText('details.imagePreview')).toHaveAttribute('data-image-id', '5');
    expect(screen.queryByText('details.filesByType')).not.toBeInTheDocument();
  });

  test('hides zero counts for an empty folder', () => {
    renderDetailSection([10]);

    expect(screen.getByRole('heading', { name: 'Empty folder' })).toBeInTheDocument();
    expect(screen.getByText('details.folderEmpty')).toBeInTheDocument();
    expect(screen.queryByText('details.filesByType')).not.toBeInTheDocument();
    expect(screen.queryByText('details.images')).not.toBeInTheDocument();
  });

  test('shows the bundle empty message when a bundle has no items', () => {
    renderDetailSection([13]);

    expect(screen.getByRole('heading', { name: 'Empty bundle' })).toBeInTheDocument();
    expect(screen.getByText('details.bundleEmpty')).toBeInTheDocument();
    expect(screen.queryByText('details.filesByType')).not.toBeInTheDocument();
  });

  test('shows only file types with nonzero counts', () => {
    renderDetailSection([11]);

    expect(screen.getByText('details.images').parentElement?.parentElement).toHaveTextContent('1');
    expect(screen.queryByText('details.textureAtlases')).not.toBeInTheDocument();
    expect(screen.queryByText('details.fonts')).not.toBeInTheDocument();
  });
});
