// Design Ref: §4 tests/fixtures — example-data.ts를 손으로 계산한 정답
// 규칙: 기업별 값을 먼저 구한 뒤 그 값들의 평균을 낸다. 값이 없는 기업은 그 지표에서만 제외한다.
// 일치 기준: 소수점 아래 10자리까지 같으면 일치 (toBeCloseTo(값, 10))

export type ExpectedMetric = {
  average: number;
  used: number; // 평균에 쓰인 기업 수
  excluded: number; // 제외한 기업 수
};

export type ExpectedQuarter = {
  netDebtToEbitda: ExpectedMetric; // 순차입금/EBITDA
  operatingCf: ExpectedMetric; // 영업활동 현금흐름 (억원)
  interestCoverage: ExpectedMetric; // 이자보상배율 (배)
  shortTermDebt: ExpectedMetric; // 단기차입금 (억원)
};

export const expectedAnswers: Record<string, ExpectedQuarter> = {
  // 2025Q1
  //  순차입금/EBITDA: A=(1000-400)/200=3, B 제외(EBITDA 0), C=(2000-500)/(-300)=-5 → (3-5)/2=-1
  //  영업CF:         (150-50+80)/3=60
  //  이자보상배율:   A=5.0, B=2.5, C 제외(비어 있음) → 7.5/2=3.75
  //  단기차입금:     (300+100+700)/3=1100/3
  "2025Q1": {
    netDebtToEbitda: { average: -1, used: 2, excluded: 1 },
    operatingCf: { average: 60, used: 3, excluded: 0 },
    interestCoverage: { average: 3.75, used: 2, excluded: 1 },
    shortTermDebt: { average: 1100 / 3, used: 3, excluded: 0 },
  },
  // 2025Q2
  //  순차입금/EBITDA: A=(900-500)/250=1.6, B 제외(총차입금 비어 있음), C=(1800-600)/400=3 → 4.6/2=2.3
  //  영업CF:         A=200, B=30, C 제외(비어 있음) → 230/2=115
  //  이자보상배율:   (6+3+4)/3=13/3
  //  단기차입금:     A=250, B 제외(비어 있음), C=650 → 900/2=450
  "2025Q2": {
    netDebtToEbitda: { average: 2.3, used: 2, excluded: 1 },
    operatingCf: { average: 115, used: 2, excluded: 1 },
    interestCoverage: { average: 13 / 3, used: 3, excluded: 0 },
    shortTermDebt: { average: 450, used: 2, excluded: 1 },
  },
};
