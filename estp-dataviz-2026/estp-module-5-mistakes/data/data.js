window.ESTP_M5_DATA = {
  metadata: {
    source: "Statistics Norway",
    table: "08518",
    title: "Unemployed persons, by age and sex",
    updated: "2026-08-13 08:00",
    checked: "2026-08-28",
    referenceTime: "Continuous survey",
    sex: "Both sexes",
    periods: "2025Q1–2026Q2",
    adjustment: "Quarterly LFS figures; no seasonal adjustment applied on this page",
    countUnit: "1,000 persons",
    rateUnit: "per cent of the labour force"
  },
  periods: ["2025Q1","2025Q2","2025Q3","2025Q4","2026Q1","2026Q2"],
  series: {
    total: { label: "15–74, total", counts: [124,153,141,127,146,147], rates: [4.1,5.0,4.6,4.2,4.8,4.8] },
    age15_24: { label: "15–24", counts: [56,72,66,58,65,66], rates: [12.8,15.4,14.5,13.3,14.7,14.3] },
    age25_54: { label: "25–54", counts: [58,63,67,61,67,67], rates: [3.0,3.2,3.4,3.2,3.5,3.5] },
    age55_74: { label: "55–74", counts: [9,18,8,8,14,14], rates: [1.5,2.8,1.3,1.2,2.1,2.0] }
  },
  annual: {
    "2024": { totalCount:121, totalRate:4.0 },
    "2025": { totalCount:136, totalRate:4.5 }
  },
  break2021: {
    label: "Major LFS redesign from 2021Q1",
    unemployedBreakPersons: 5400,
    unemploymentRateDifferencePP: 0.1,
    significance: "The estimated break in unemployed persons was not statistically significant."
  }
};
