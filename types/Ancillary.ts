export interface AncillaryRow {
  id: string;
  title: string;
  details: string;
  amount: number;
  currency: string;
  passengerId: string;   // pas_…
  passengerName?: string; // Resolved name
  segmentIds: string[];  // seg_…
  segmentInfo?: string;  // Resolved segment info
  type?: string;         // Type of ancillary (e.g., 'baggage', 'seat', 'cancel-for-any-reason')
  quantity?: number;     // Quantity of the ancillary (e.g., number of bags)
}

export interface AncillaryState {
  rows: AncillaryRow[];
  total: number;
  currency: string;
}
