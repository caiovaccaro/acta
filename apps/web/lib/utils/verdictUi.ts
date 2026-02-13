import type { VerdictLabel } from '@acta/shared';

export const verdictLabelToPosition = (label: VerdictLabel | undefined): number => {
  switch (label) {
    case 'NoItDoesntSeemSo':
      return 8;
    case 'ProbablyNot':
      return 25;
    case 'Unclear':
      return 50;
    case 'ProbablyYes':
      return 75;
    case 'YesItSeemsSo':
      return 92;
    default:
      return 50;
  }
};

export const getVerdictTextFromLabel = (label: VerdictLabel | undefined): string => {
  if (!label) return 'Unclear.';
  switch (label) {
    case 'YesItSeemsSo':
      return 'Yes, it seems so.';
    case 'ProbablyYes':
      return 'Probably yes.';
    case 'NoItDoesntSeemSo':
      return "No, it doesn't seem so.";
    case 'ProbablyNot':
      return 'Probably not.';
    case 'Unclear':
      return 'Unclear.';
    default:
      return 'Unclear.';
  }
};

export const getVerdictColorClass = (label: VerdictLabel | undefined): string => {
  if (!label) return 'text-verdict-unclear';
  switch (label) {
    case 'YesItSeemsSo':
    case 'ProbablyYes':
      return 'text-verdict-yes';
    case 'NoItDoesntSeemSo':
    case 'ProbablyNot':
      return 'text-verdict-no';
    case 'Unclear':
    default:
      return 'text-verdict-unclear';
  }
};
