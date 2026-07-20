import type { Account } from "@/lib/types/account"

export const DUMMY_ACCOUNTS: Account[] = [
  {
    id: "acc-01",
    accountName: "퇴직연금",
    accountNoMasked: "220-91",
    accountType: "연금",
    createdAt: "2023-01-01T00:00:00.000Z",
  },
  {
    id: "acc-02",
    accountName: "개인연금(기존)",
    accountNoMasked: "220-34",
    accountType: "연금",
    createdAt: "2023-01-01T00:00:00.000Z",
  },
  {
    id: "acc-03",
    accountName: "개인연금(신)",
    accountNoMasked: "112-8680",
    accountType: "연금",
    createdAt: "2023-01-01T00:00:00.000Z",
  },
  {
    id: "acc-04",
    accountName: "DC계좌",
    accountNoMasked: "496-3028",
    accountType: "연금",
    createdAt: "2023-01-01T00:00:00.000Z",
  },
  {
    id: "acc-05",
    accountName: "퇴직연금(삼성)",
    accountNoMasked: "648-8656",
    accountType: "연금",
    createdAt: "2023-01-01T00:00:00.000Z",
  },
  {
    id: "acc-06",
    accountName: "처리투자(미래에셋)",
    accountNoMasked: "355-1120",
    accountType: "개인투자",
    createdAt: "2023-01-01T00:00:00.000Z",
  },
  {
    id: "acc-07",
    accountName: "은퇴투자(미래에셋)",
    accountNoMasked: "355-2231",
    accountType: "개인투자",
    createdAt: "2023-01-01T00:00:00.000Z",
  },
  {
    id: "acc-08",
    accountName: "ISA계좌",
    accountNoMasked: "648-8656",
    accountType: "개인투자",
    createdAt: "2023-01-01T00:00:00.000Z",
  },
]
