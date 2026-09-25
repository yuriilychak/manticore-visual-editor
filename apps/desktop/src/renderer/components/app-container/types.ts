import type { AssetType } from '../../../types';

export type NewContentValues = Record<string, string>;

export interface NewContentValidation {
  readonly fieldKey: string;
  readonly isValid: boolean;
  readonly reason: string;
}

export type NewContentField = {
  key: string;
  selectValue?: () => Promise<string>;
};

export interface NewContentStrategy {
  contentType: AssetType;
  create: (values: NewContentValues) => Promise<void>;
  fields: readonly NewContentField[];
  validate: (values: NewContentValues) => Promise<NewContentValidation>;
}
