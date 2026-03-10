-- Base rates per port + container type
create table trucking_rates (
  id             uuid primary key default gen_random_uuid(),
  port_code      text not null,
  container_type text not null,
  base_low       numeric not null,
  base_mid       numeric not null,
  base_high      numeric not null,
  updated_at     timestamptz default now(),
  unique(port_code, container_type)
);

-- Distance zone multipliers
create table trucking_zones (
  id           uuid primary key default gen_random_uuid(),
  zone         int not null unique,  -- 1,2,3,4,5
  miles_from   int not null,
  miles_to     int not null,
  multiplier   numeric not null
);

-- Popular ZIP suggestions per port (seeded, admin can add more)
create table port_zip_suggestions (
  id         uuid primary key default gen_random_uuid(),
  port_code  text not null,
  zip_code   text not null,
  city       text not null,
  state      text not null,
  lat        numeric not null,
  lng        numeric not null,
  label      text,
  unique(port_code, zip_code)
);

-- Seed: trucking_rates base prices
insert into trucking_rates (port_code, container_type, base_low, base_mid, base_high) values
  ('USLAX','20GP',300,420,600), ('USLAX','40GP',380,500,720), ('USLAX','40HC',400,550,800),
  ('USLGB','20GP',300,420,600), ('USLGB','40GP',380,500,720), ('USLGB','40HC',400,550,800),
  ('USNYC','20GP',480,620,900), ('USNYC','40GP',600,780,1100),('USNYC','40HC',650,850,1200),
  ('USSEA','20GP',340,460,650), ('USSEA','40GP',420,560,780), ('USSEA','40HC',450,600,860),
  ('USHOU','20GP',370,490,700), ('USHOU','40GP',460,600,850), ('USHOU','40HC',490,650,920),
  ('USSAV','20GP',340,450,650), ('USSAV','40GP',420,550,780), ('USSAV','40HC',450,600,850),
  ('USBAL','20GP',400,520,750), ('USBAL','40GP',500,650,920), ('USBAL','40HC',530,700,980),
  ('USORF','20GP',380,500,720), ('USORF','40GP',480,620,880), ('USORF','40HC',510,670,940),
  ('USCHA','20GP',330,440,630), ('USCHA','40GP',410,535,760), ('USCHA','40HC',440,580,820),
  ('USMIA','20GP',390,510,730), ('USMIA','40GP',480,620,880), ('USMIA','40HC',510,670,950),
  ('USOAK','20GP',300,420,600), ('USOAK','40GP',380,500,720), ('USOAK','40HC',400,550,800);

-- Seed: distance zone multipliers
insert into trucking_zones (zone, miles_from, miles_to, multiplier) values
  (1,   0,  50, 1.0),
  (2,  51, 100, 1.3),
  (3, 101, 200, 1.7),
  (4, 201, 400, 2.2),
  (5, 401, 9999, 3.0);

-- Seed: port coordinates + ZIP suggestions
-- Port lat/lng used for Haversine calculation
-- USLAX: 33.7395° N, 118.2482° W
insert into port_zip_suggestions (port_code, zip_code, city, state, lat, lng, label) values
  ('USLAX','90744','Wilmington','CA',33.7866,-118.2630,'Wilmington Industrial'),
  ('USLAX','90058','Vernon','CA',33.9878,-118.2168,'Vernon Warehouse District'),
  ('USLAX','90220','Compton','CA',33.8958,-118.2201,'Compton Logistics'),
  ('USLAX','90670','Santa Fe Springs','CA',33.9425,-118.0750,'Santa Fe Springs'),
  ('USLAX','91761','Ontario','CA',34.0509,-117.6009,'Ontario – Inland Empire'),
  ('USLAX','92408','San Bernardino','CA',34.0922,-117.2772,'San Bernardino'),
  ('USLAX','93308','Bakersfield','CA',35.4394,-119.0186,'Bakersfield'),
  ('USLAX','85001','Phoenix','AZ',33.4484,-112.0740,'Phoenix – Long Haul'),
-- USNYC: 40.6840° N, 74.0440° W
  ('USNYC','10001','New York','NY',40.7484,-73.9967,'Manhattan / Midtown'),
  ('USNYC','11201','Brooklyn','NY',40.6928,-73.9903,'Brooklyn Warehouse'),
  ('USNYC','07030','Hoboken','NJ',40.7440,-74.0324,'Hoboken / NJ'),
  ('USNYC','07114','Newark','NJ',40.7218,-74.1765,'Newark – Port Newark'),
  ('USNYC','11729','Deer Park','NY',40.7626,-73.3218,'Deer Park – Long Island'),
  ('USNYC','06902','Stamford','CT',41.0534,-73.5387,'Stamford – CT'),
  ('USNYC','19104','Philadelphia','PA',39.9526,-75.1652,'Philadelphia – PA'),
  ('USNYC','10701','Yonkers','NY',40.9312,-73.8988,'Yonkers – Westchester'),
-- USSEA: 47.6162° N, 122.3485° W
  ('USSEA','98108','Seattle','WA',47.5479,-122.3053,'Seattle South Industrial'),
  ('USSEA','98188','Tukwila','WA',47.4668,-122.2567,'Tukwila Warehouse'),
  ('USSEA','98032','Kent','WA',47.3809,-122.2348,'Kent Valley Logistics'),
  ('USSEA','98001','Auburn','WA',47.3073,-122.2285,'Auburn Distribution'),
  ('USSEA','98003','Federal Way','WA',47.3223,-122.3126,'Federal Way'),
  ('USSEA','98387','Spanaway','WA',47.1040,-122.4371,'Tacoma / Spanaway'),
  ('USSEA','97201','Portland','OR',45.5051,-122.6750,'Portland – OR'),
  ('USSEA','98902','Yakima','WA',46.6021,-120.5059,'Yakima – Inland WA'),
-- USHOU: 29.7253° N, 95.2811° W
  ('USHOU','77029','Houston','TX',29.7400,-95.2679,'Houston East Industrial'),
  ('USHOU','77015','Houston','TX',29.7355,-95.1791,'Channel View Area'),
  ('USHOU','77049','Houston','TX',29.8191,-95.1716,'Sheldon / Crosby'),
  ('USHOU','77032','Humble','TX',29.9988,-95.2266,'Humble – North Houston'),
  ('USHOU','77571','La Porte','TX',29.6658,-95.0219,'La Porte Distribution'),
  ('USHOU','77041','Houston NW','TX',29.8683,-95.5449,'NW Houston Logistics'),
  ('USHOU','78201','San Antonio','TX',29.4241,-98.4936,'San Antonio – Long Haul'),
  ('USHOU','75001','Dallas','TX',32.9762,-96.8303,'Dallas – Long Haul'),
-- USSAV: 32.0835° N, 81.0998° W
  ('USSAV','31408','Savannah','GA',32.0462,-81.1557,'Savannah Port Area'),
  ('USSAV','31322','Pooler','GA',32.1154,-81.2476,'Pooler Logistics Park'),
  ('USSAV','31405','Garden City','GA',32.1076,-81.1565,'Garden City Industrial'),
  ('USSAV','31602','Valdosta','GA',30.8327,-83.2785,'Valdosta – South GA'),
  ('USSAV','30301','Atlanta','GA',33.7490,-84.3880,'Atlanta Distribution'),
  ('USSAV','29401','Charleston','SC',32.7765,-79.9311,'Charleston – SC'),
  ('USSAV','32204','Jacksonville','FL',30.3322,-81.6557,'Jacksonville – FL'),
  ('USSAV','35004','Birmingham','AL',33.5186,-86.8104,'Birmingham – AL'),
-- USBAL: 39.2476° N, 76.5763° W
  ('USBAL','21224','Baltimore','MD',39.2871,-76.5418,'Baltimore East Industrial'),
  ('USBAL','21226','Curtis Bay','MD',39.2193,-76.5844,'Curtis Bay – Port Area'),
  ('USBAL','20785','Hyattsville','MD',38.9554,-76.8524,'Hyattsville – DC Metro'),
  ('USBAL','20001','Washington DC','DC',38.9101,-77.0147,'Washington DC'),
  ('USBAL','22314','Alexandria','VA',38.8048,-77.0469,'Alexandria – VA'),
  ('USBAL','19104','Philadelphia','PA',39.9526,-75.1652,'Philadelphia – PA'),
  ('USBAL','17101','Harrisburg','PA',40.2732,-76.8867,'Harrisburg – PA'),
  ('USBAL','21901','North East','MD',39.6001,-75.9385,'North East – MD');