export type DueInType = 'simple' | 'technical' | 'highlyTechnical';
export type StepStatus = 'Pending' | 'Completed' | 'Passed Due';

export const ACTION_REQUIRED_OPTIONS = [
  'For appropriate action',
  'For information/record/file',
  'For evaluation/review',
  'For comment/recommendation',
  'For investigation',
  'As instructed/directed',
  'Please act URGENTLY',
  'For compliance',
  'For implementation',
  'For dissemination',
  'For attendance',
  'For acknowledgement',
  'Please see me about this',
  'Please act within 15 days',
] as const;

export interface EDATStep {
  edatsNumber: string;
  trackingNumber: string;
  stepNumber: number;
  sender: string;
  actionTaken: string;
  actionRequired: string[];
  receiver: string;
  dueIn: DueInType;
  dateForwarded: string; // YYYY-MM-DD
  dateReceived: string | null; // YYYY-MM-DD
  timeReceived: string | null; // HH:MM:SS
  status: StepStatus;
  createdAt: string;
}

export interface EDATLog {
  trackingNumber: string;
  subject: string;
  documentType: string;
  status: string;
  createdAt: string;
  steps: EDATStep[];
}

// Keep EDATEntry for backward compatibility or as a utility type if needed, 
// but we should transition to EDATLog
export interface EDATEntry extends EDATLog {
  id: string; // maps to trackingNumber
}
