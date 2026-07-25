alter table public.seasons
  add constraint seasons_name_max_length
  check (char_length(trim(name)) <= 100);

alter table public.driver_applications
  add constraint driver_applications_name_max_length
  check (char_length(trim(name)) <= 120),
  add constraint driver_applications_phone_max_length
  check (char_length(trim(phone)) <= 40),
  add constraint driver_applications_email_max_length
  check (char_length(trim(email)) <= 254);

alter table public.distribution_requests
  add constraint distribution_requests_recipient_name_max_length
  check (char_length(trim(recipient_name)) <= 120),
  add constraint distribution_requests_phone_max_length
  check (char_length(trim(phone)) <= 40),
  add constraint distribution_requests_email_max_length
  check (char_length(trim(email)) <= 254),
  add constraint distribution_requests_address_max_length
  check (char_length(trim(address)) <= 300),
  add constraint distribution_requests_instructions_length
  check (char_length(trim(instructions)) between 1 and 1000),
  add constraint distribution_requests_household_size_max
  check (household_size <= 100),
  add constraint distribution_requests_box_weight_max
  check (box_weight_lbs <= 1000);
