create table customers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  address         text,
  city            text,
  state           text,
  zip             text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  usps_validated  boolean default false,
  use_count       int default 0,
  created_at      timestamptz default now()
);

-- Full-text search index on name
create index customers_name_idx on customers using gin(to_tsvector('english', name));