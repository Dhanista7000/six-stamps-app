-- Insert 10 test codes
insert into public.stamp_codes (code, outlet_id) values 
('CODE1111', 'OUTLET-01'),
('CODE2222', 'OUTLET-01'),
('CODE3333', 'OUTLET-01'),
('CODE4444', 'OUTLET-01'),
('CODE5555', 'OUTLET-01'),
('CODE6666', 'OUTLET-01'),
('CODE7777', 'OUTLET-01'),
('CODE8888', 'OUTLET-01'),
('CODE9999', 'OUTLET-01'),
('CODE0000', 'OUTLET-01')
on conflict (code) do nothing;
