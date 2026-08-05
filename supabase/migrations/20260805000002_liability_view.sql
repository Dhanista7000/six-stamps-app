create or replace view public.liability_report as
with card_stats as (
    select 
        c.id,
        count(cs.id) as stamps_count
    from public.cards c
    left join public.card_stamps cs on c.id = cs.card_id
    where c.is_completed = false
    and c.expires_at > now()
    group by c.id
)
select 
    stamps_count,
    count(id) as outstanding_cards,
    count(id) * 15.00 as projected_exposure_rm -- Assuming a Triple Decker is RM 15.00
from card_stats
group by stamps_count
order by stamps_count desc;

-- Grant access to authenticated users (admin role logic can be added later)
grant select on public.liability_report to authenticated;
grant select on public.liability_report to service_role;
