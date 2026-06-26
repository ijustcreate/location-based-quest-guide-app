-- Public playtest submit endpoint.
-- This keeps the static GitHub Pages app useful before full Supabase Auth is wired.
-- It intentionally creates public, ownerless locations only.

create or replace function public.submit_public_location(
    location_name text,
    location_hint text,
    location_clue text,
    location_latitude numeric,
    location_longitude numeric,
    location_accuracy_m numeric default null,
    location_photo_url text default null,
    glyphs jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    new_location_id uuid;
    glyph jsonb;
    glyph_shape public.glyph_shape;
    glyph_color public.glyph_color_family;
begin
    if location_name is null or length(trim(location_name)) = 0 then
        raise exception 'Location name is required';
    end if;

    if location_latitude is null or location_longitude is null then
        raise exception 'Latitude and longitude are required';
    end if;

    insert into public.locations (
        owner_id,
        name,
        hint,
        clue,
        visibility,
        latitude,
        longitude,
        accuracy_m,
        location_photo_url,
        metadata
    )
    values (
        null,
        trim(location_name),
        coalesce(location_hint, ''),
        coalesce(location_clue, ''),
        'public',
        location_latitude,
        location_longitude,
        location_accuracy_m,
        location_photo_url,
        jsonb_build_object('source', 'public_playtest_rpc')
    )
    returning id into new_location_id;

    for glyph in select * from jsonb_array_elements(coalesce(glyphs, '[]'::jsonb))
    loop
        glyph_shape := coalesce((glyph->>'shape')::public.glyph_shape, 'hollow-triangle');
        glyph_color := coalesce((glyph->>'colorFamily')::public.glyph_color_family, 'red');

        insert into public.glyph_objectives (
            location_id,
            label,
            shape,
            color_family,
            required,
            points,
            evidence_requirement,
            min_confidence,
            icon_url
        )
        values (
            new_location_id,
            coalesce(glyph->>'label', glyph_color::text || ' ' || glyph_shape::text),
            glyph_shape,
            glyph_color,
            coalesce((glyph->>'required')::boolean, true),
            coalesce((glyph->>'points')::integer, 1),
            coalesce(glyph->>'evidenceRequirement', 'photo'),
            coalesce((glyph->>'minConfidence')::integer, 75),
            nullif(glyph->>'iconDataUrl', '')
        );
    end loop;

    return new_location_id;
end;
$$;

grant execute on function public.submit_public_location(
    text,
    text,
    text,
    numeric,
    numeric,
    numeric,
    text,
    jsonb
) to anon, authenticated;
