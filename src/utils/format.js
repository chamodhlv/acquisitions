export const formatValidationError = errors => {
  if (!errors || !errors.issues) return 'Validation error';

  if (Array.isArray(errors.issues))
    return errors.issues.map(issue => issue.message).join(', ');

  return 'Validation error';
};
