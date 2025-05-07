-- 0) (선택) OrderStatus enum 타입 정의
CREATE TYPE order_status_enum AS ENUM (
  'no',
  'createOrder',
  'createOrderLzReceive',
  'executeOrder',
  'executeOrderLzReceive',
  'claim',
  'claimLzReceive',
  'canceled',
  'canceledLzReceive'
);

-- 2) 0x… 길이 42자리 주소 타입
CREATE DOMAIN address42 AS CHAR(42)
    CHECK (VALUE ~ '^0x[0-9A-Fa-f]{40}$');

-- 3) 메인 테이블
CREATE TABLE IF NOT EXISTS public.orders (
    status          order_status_enum   NOT NULL,
    src_chain_id    INTEGER             NOT NULL,
    dst_chain_id    INTEGER             NOT NULL,
    order_id        NUMERIC(78,0)       NOT NULL,
    deposit_amount  NUMERIC(78,0)       NOT NULL,
    desired_amount  NUMERIC(78,0)       NOT NULL,
    maker           address42           NOT NULL,
    taker           address42           NOT NULL,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    block_number    BIGINT              NOT NULL,

    PRIMARY KEY (src_chain_id, order_id)
);

-- 1. 거래 가능한(AVAILABLE) 최신 오더 100개
CREATE INDEX idx_orders_status_created
    ON public.orders (status, created_at DESC);

-- 2. 내 오더 전부(진행중/히스토리) 보기 (maker / taker)
CREATE INDEX idx_orders_maker_created
    ON public.orders (maker, created_at DESC);
CREATE INDEX idx_orders_taker_created
    ON public.orders (taker, created_at DESC);

-- 3. 거래가능 오더 중 src → dst 체인
CREATE INDEX idx_orders_src_status_amt_date
    ON public.orders (status, src_chain_id, created_at DESC);
CREATE INDEX idx_orders_dst_status_amt_date
    ON public.orders (status, dst_chain_id, created_at DESC);

-- 4. 전체 상태 모든 오더 최신순
CREATE INDEX idx_orders_created
    ON public.orders (created_at DESC);
