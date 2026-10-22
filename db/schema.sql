-- 대기업 재무지표 분석 도구: Supabase 테이블 정의 (데이터는 포함하지 않음)
-- 금액 단위는 억원, interest_coverage는 배수(단위 없음)

create table if not exists public.companies (
  company_code text primary key,   -- 업체코드
  stock_code   text,               -- 종목코드 (비상장은 비어 있음)
  name         text not null,      -- 종목명
  size         text                -- 기업규모: 대기업 / 중견기업 / 중소기업 / null
);

create table if not exists public.financials (
  company_code      text not null references public.companies (company_code),
  quarter           text not null,   -- 예: 2025Q4
  total_debt        numeric,         -- 총차입금 (억원)
  cash              numeric,         -- 현금및현금성자산 (억원)
  ebitda            numeric,         -- EBITDA (억원)
  operating_cf      numeric,         -- 영업활동으로 인한 현금흐름 (억원)
  interest_coverage numeric,         -- 영업이익이자보상비율 (배)
  short_term_debt   numeric,         -- 단기차입금 (억원)
  primary key (company_code, quarter)
);

create index if not exists financials_quarter_idx on public.financials (quarter);

-- 내부 자료로 간주하므로 공개 키(anon)로는 읽을 수 없게 막는다.
-- 정책을 만들지 않으면 서버 쪽 키(service_role)로만 접근할 수 있다.
alter table public.companies enable row level security;
alter table public.financials enable row level security;
