-- 1) 테이블
CREATE TABLE IF NOT EXISTS public.orders (
                                             order_status    INT         NOT NULL,
                                             chain_id        INT         NOT NULL,
                                             order_id        BIGINT      NOT NULL,
                                             dst_chain_id    INT         NOT NULL,
                                             maker           VARCHAR(66) NOT NULL,
    created_at      TIMESTAMP   NOT NULL,
    taker           VARCHAR(66),
    deposit_amount  NUMERIC(38,0),
    desired_amount  NUMERIC(38,0),
    updated_at      TIMESTAMP,
    block_number    BIGINT,
    PRIMARY KEY (order_status, chain_id, order_id)
    );

-- 2) 보조 인덱스
CREATE INDEX IF NOT EXISTS idx_status_dst     ON public.orders(order_status, dst_chain_id);
CREATE INDEX IF NOT EXISTS idx_status_maker   ON public.orders(order_status, maker);
CREATE INDEX IF NOT EXISTS idx_status_created ON public.orders(order_status, created_at);
