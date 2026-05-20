/** Merchant bank accounts shown at marketplace checkout for customer deposits. */

export type MarketplaceDepositBankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
};

export const MARKETPLACE_DEPOSIT_BANK_ACCOUNTS: MarketplaceDepositBankAccount[] = [
  {
    id: "bpi",
    bankName: "BPI",
    accountName: "Glowish Beauty Inc.",
    accountNumber: "1234-5678-90",
    branch: "Makati Main",
  },
  {
    id: "bdo",
    bankName: "BDO",
    accountName: "Glowish Beauty Inc.",
    accountNumber: "0012-3456-7890",
    branch: "BGC",
  },
];

export const PH_DEPOSITOR_BANKS = [
  "BDO",
  "BPI",
  "Metrobank",
  "Landbank",
  "UnionBank",
  "Security Bank",
  "PNB",
  "China Bank",
  "RCBC",
  "Other",
] as const;

export type PhDepositorBank = (typeof PH_DEPOSITOR_BANKS)[number];

export function getDepositBankAccount(id: string) {
  return MARKETPLACE_DEPOSIT_BANK_ACCOUNTS.find((a) => a.id === id);
}
