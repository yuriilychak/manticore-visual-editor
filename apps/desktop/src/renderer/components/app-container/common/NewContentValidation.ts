import type { NewContentValidation as NewContentValidationContract } from '../types';

export class NewContentValidation implements NewContentValidationContract {
  constructor(
    readonly fieldKey = '',
    readonly isValid = false,
    readonly reason = ''
  ) {}
}
