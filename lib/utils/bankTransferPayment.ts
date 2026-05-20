import { getDepositBankAccount } from "@/lib/constants/marketplaceBankAccounts";
import { digitsOnly } from "@/lib/utils/cardPayment";

export interface ResolvedMarketplaceBankTransferPayment {
  depositorName: string;
  depositorBank: string;
  accountLast4?: string;
  transferReference: string;
  depositToBankId: string;
  depositToBankName: string;
  depositToAccountName: string;
  depositToAccountNumber: string;
  savedMethodId?: string;
}

export function validateBankTransferEntry(params: {
  depositorName: string;
  depositorBank: string;
  accountLast4: string;
  transferReference: string;
  depositToBankId: string;
}):
  | { ok: true; resolved: ResolvedMarketplaceBankTransferPayment }
  | { ok: false; error: string } {
  const depositorName = params.depositorName.trim();
  if (depositorName.length < 2) {
    return { ok: false, error: "Enter the name on your bank account" };
  }

  const depositorBank = params.depositorBank.trim();
  if (depositorBank.length < 2) {
    return { ok: false, error: "Select the bank you will transfer from" };
  }

  const depositAccount = getDepositBankAccount(params.depositToBankId);
  if (!depositAccount) {
    return { ok: false, error: "Select which Glowish account you will deposit to" };
  }

  const transferReference = params.transferReference.trim();
  if (transferReference.length < 4) {
    return { ok: false, error: "Enter your bank transfer reference number (at least 4 characters)" };
  }

  const last4Raw = digitsOnly(params.accountLast4);
  const accountLast4 = last4Raw.length >= 4 ? last4Raw.slice(-4) : undefined;

  return {
    ok: true,
    resolved: {
      depositorName,
      depositorBank,
      accountLast4,
      transferReference,
      depositToBankId: depositAccount.id,
      depositToBankName: depositAccount.bankName,
      depositToAccountName: depositAccount.accountName,
      depositToAccountNumber: depositAccount.accountNumber,
    },
  };
}
