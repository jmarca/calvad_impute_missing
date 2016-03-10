-- scratch work to select sufficient WIM data to run tests.

create view some_wim_data as
select *
from wim_data a
where a.ts>='2012-01-01'
  and a.ts<'2013-01-01'
  and a.site_no in (87,37);

copy (select * from some_wim_data)
to '/tmp/some_wim_data.dump'
with (format binary);

copy (
  select *
  from wim_lane_dir b
  where b.site_no in (87,37)
) to '/tmp/some_wim_lane_dir.dump'
with (format binary);

copy (
  select *
  from wim_status ws
  where ws.site_no in (87,37)
    and ws.ts>='2012-01-01'
    and ws.ts<'2013-01-01'
) to '/tmp/some_wim_status.dump'
with (format binary);

copy (
  select *
  from wim.summaries_5min_speed b
  where b.ts>='2012-01-01'
  and b.ts<'2013-01-01'
  and b.site_no in (87,37)
) to '/tmp/some_wim_summaries_5min_speed.dump'
with (format binary);
