create table stores (
  id text primary key,
  name text not null,
  slug text not null unique,
  monthly_plan text not null,
  created_at timestamptz not null default now()
);

create table store_tables (
  id text primary key,
  store_id text not null references stores(id),
  code text not null,
  seats integer not null default 2,
  qr_url text not null,
  active boolean not null default true
);

create table categories (
  id text primary key,
  store_id text not null references stores(id),
  name text not null,
  sort_order integer not null default 0
);

create table products (
  id text primary key,
  store_id text not null references stores(id),
  category_id text not null references categories(id),
  name text not null,
  description text,
  price numeric(10,2) not null,
  prep_time_minutes integer not null default 5,
  image_url text,
  active boolean not null default true
);

create table orders (
  id text primary key,
  store_id text not null references stores(id),
  table_id text not null references store_tables(id),
  sequence integer not null,
  status text not null,
  source text not null default 'qr_table',
  notes text,
  total numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table order_items (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  product_id text not null references products(id),
  quantity integer not null,
  unit_price numeric(10,2) not null,
  notes text
);
