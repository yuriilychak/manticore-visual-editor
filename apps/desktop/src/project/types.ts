import { AssetType } from '../types';

export type ProjectContent = {
  data: null;
  id: number;
  name: string;
  parentId: number;
  type: AssetType;
  version: number;
};

export type ProjectConfig = {
  content: ProjectContent[];
  name: string;
  version: number;
};
