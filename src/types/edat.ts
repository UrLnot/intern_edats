export interface EDATRouteStep {
  personnel: string;
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
  receiver: string;
  actionTakenReceiver: string;
  timeReceived: string;
  dateReceived: string; // ISO string or Date string
  status: string;
}
