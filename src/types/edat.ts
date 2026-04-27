export interface EDATRouteStep {
  sender: string;
  receiver: string;
  action: string;
  remarks: string;
}

export interface EDATEntry {
  id: string; // This will map to tracking_number from DB
  trackingNumber: string;
  edatsNumber: string;
  dateForwarded: string; // ISO string or Date string
  sender: string;
  subject: string;
  documentType: string;
  actionRequired: string[];
  dueIn: 'simple' | 'technical' | 'highlyTechnical';
  routeHistory: EDATRouteStep[];
  section: string;
  receiver: string;
  actionTakenReceiver: string;
  timeReceived: string | null;
  dateReceived: string | null; // ISO string or Date string
  status: string;
  completed?: boolean;
}
