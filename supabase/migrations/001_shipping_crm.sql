-- QUOTES table
create table quotes (
  id                 text primary key,             -- e.g. TBP-2026-001
  customer_name      text not null,
  contact_name       text,
  contact_email      text,
  contact_phone      text,
  po_number          text,
  products           text,
  incoterm           text default 'DDP',
  cargo_ready_date   date,
  status             text default 'Quote Sent',     -- Quote Sent | Booking Confirmed | In Transit | Delivered
  origin_port        text default 'VNHPH',
  dest_port          text not null,
  container_type     text not null,                 -- 20GP | 40GP | 40HC | LCL
  carrier            text,
  bl_number          text,
  etd                date,
  eta                date,
  delivery_address   text,
  delivery_city      text,
  delivery_state     text,
  delivery_zip       text,
  special_remarks    text,
  leg1_cost_vnd      bigint,
  leg2_breakdown     jsonb,                         -- full Freightos response object
  leg2_total_usd     numeric(10,2),
  leg3_estimate_usd  numeric(10,2),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- DOCUMENTS table
create table documents (
  id          uuid primary key default gen_random_uuid(),
  quote_id    text references quotes(id) on delete cascade,
  doc_type    text not null,   -- draft_ci | draft_pl | eec | final_pl | input_invoice | output_invoice | service_invoice | export_decl | etd_confirmed | co | customer_po
  status      text default 'pending',  -- pending | done
  notes       text,
  updated_at  timestamptz default now()
);

-- Auto-create document checklist rows when a quote is inserted
create or replace function create_default_documents()
returns trigger as $$
declare
  doc_types text[] := array[
    'customer_po','draft_ci','draft_pl','eec',
    'final_pl','input_invoice','output_invoice',
    'service_invoice','export_decl','etd_confirmed','co'
  ];
  dt text;
begin
  foreach dt in array doc_types loop
    insert into documents (quote_id, doc_type) values (new.id, dt);
  end loop;
  return new;
end;
$$ language plpgsql;

create trigger on_quote_created
  after insert on quotes
  for each row execute procedure create_default_documents();