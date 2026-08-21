-- Board approval requests (kind 50001) must wake reviewers: a card that
-- enters its approval gate stalls silently unless the pending approver gets a
-- push. 0018/0023 are checksum-frozen, so the gated trigger is re-created
-- here with the extended allowlist. Gate logic is unchanged from 0023 — only
-- the kind list grows. Keep this allowlist identical to the relay's validated
-- NIP-PL descriptor (crates/buzz-relay/src/handlers/push_lease.rs PUSH_KINDS).
CREATE OR REPLACE FUNCTION enqueue_push_match_job() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    -- Keep this allowlist identical to the relay's validated NIP-PL descriptor.
    IF NEW.kind IN (7, 9, 1059, 40007, 46010, 50001) THEN
        PERFORM pg_advisory_xact_lock_shared(
            hashtextextended('buzz_push_gate:' || NEW.community_id::text, 0));
        IF EXISTS (
            SELECT 1 FROM push_leases
            WHERE community_id = NEW.community_id
              AND active
              AND endpoint_enabled
              AND expires_at > EXTRACT(EPOCH FROM now())::bigint
        ) THEN
            INSERT INTO push_match_queue (community_id, event_id)
            VALUES (NEW.community_id, NEW.id)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END
$$;
