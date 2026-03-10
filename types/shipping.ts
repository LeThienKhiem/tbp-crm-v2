export type QuoteStatus = 'Quote Sent' | 'Booking Confirmed' | 'In Transit' | 'Delivered'
export type ContainerType = '20GP' | '40GP' | '40HC' | 'LCL'
export type Incoterm = 'EXW' | 'FOB' | 'CFR' | 'CIF' | 'DAP' | 'DDP'
export type DocType = 'customer_po' | 'draft_ci' | 'draft_pl' | 'eec' | 'final_pl' |
  'input_invoice' | 'output_invoice' | 'service_invoice' | 'export_decl' | 'etd_confirmed' | 'co'
export type DocStatus = 'pending' | 'done'

export interface Leg2Breakdown {
  carrier: string
  service: string
  transitDays: string
  validUntil: string
  etd: string
  charges: {
    baseFreight: number
    baf: number
    caf: number
    pss: number
    thcOrigin: number
    thcDestination: number
    isps: number
    blFee: number
  }
  total: number
  source: 'freightos_sandbox' | 'freightos_live' | 'simulated'
}

export interface Quote {
  id: string
  customer_name: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  po_number?: string
  products?: string
  incoterm: Incoterm
  cargo_ready_date?: string
  status: QuoteStatus
  origin_port: string
  dest_port: string
  container_type: ContainerType
  carrier?: string
  bl_number?: string
  etd?: string
  eta?: string
  delivery_address?: string
  delivery_city?: string
  delivery_state?: string
  delivery_zip?: string
  special_remarks?: string
  leg1_cost_vnd?: number
  leg2_breakdown?: Leg2Breakdown
  leg2_total_usd?: number
  leg3_estimate_usd?: number
  created_at: string
  updated_at: string
}

export interface ShippingDocument {
  id: string
  quote_id: string
  doc_type: DocType
  status: DocStatus
  notes?: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  zip?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  usps_validated: boolean
  use_count: number
  created_at: string
}