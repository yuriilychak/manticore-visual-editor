export type NewContentValues = Record<string, string>;

export type NewContentValidation = {
  fieldKey: string;
  isValid: boolean;
  reason: string;
};

export type NewContentField = {
  key: string;
  selectValue?: () => Promise<string>;
};

export type NewContentStrategy = {
  contentType: AssetType;
  create: (values: NewContentValues) => Promise<void>;
  fields: readonly NewContentField[];
  validate: (values: NewContentValues) => Promise<NewContentValidation>;
};
import type { AssetType } from '../../../../types';
