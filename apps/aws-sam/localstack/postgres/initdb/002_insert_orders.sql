-- 1) zeroAddress 상수
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'zero_address') THEN
CREATE DOMAIN zero_address AS CHAR(42)
    CHECK (VALUE = '0x0000000000000000000000000000000000000000');
END IF;
END
$$;

-- 2) 200건 삽입
INSERT INTO public.orders (
    status,
    src_chain_id,
    dst_chain_id,
    order_id,
    deposit_amount,
    desired_amount,
    maker,
    taker,
    created_at,
    updated_at,
    block_number
)
SELECT
    'createOrderLzReceive'::order_status_enum,                        -- status
    31337,                    -- src_chain_id
    31338,                    -- dst_chain_id
    gs,                       -- order_id (1..200)
    (10000 + gs * 100)::NUMERIC(78,0),   -- deposit_amount 예시
        (20000 + gs * 200)::NUMERIC(78,0),   -- desired_amount 예시
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'::address42,
        '0x0000000000000000000000000000000000000000'::zero_address,
        NOW() - (200 - gs) * INTERVAL '1 minute',  -- created_at: 과거 200분 이내
    NULL,                    -- updated_at
    gs * 1000                -- block_number 예시
FROM generate_series(1,200) AS s(gs);
