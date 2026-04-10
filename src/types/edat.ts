export interface EDATEntry {
  id: string; // This will map to tracking_number from DB
  trackingNumber: string;
  edatsNumber: string;
  status: string;
  dateSent: string; // ISO string or Date string
  sender: string;
  subject: string;
  actionedBy: string;
  actionTaken: string;
  receiver: string;
  actionTakenReceiver: string;
  dateReceived: string; // ISO string or Date string
}
