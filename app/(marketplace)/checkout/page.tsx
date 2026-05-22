"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Check,
  CreditCard,
  Loader2,
  Lock,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormatCurrency } from "@/components/providers/TenantProvider";
import { useMarketplaceCartStore } from "@/store/marketplaceCartStore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  MARKETPLACE_PAGE_FONT,
  MARKETPLACE_PAGE_INNER,
  MARKETPLACE_PAGE_OUTER,
} from "@/lib/marketplace/pageLayout";
import { MarketplacePageShell } from "@/components/marketplace/MarketplacePageShell";
import {
  computeCheckoutShippingQuote,
  computeMarketplaceOrderTotal,
  getCheckoutShippingMethodsForAddress,
  type MarketplaceShippingMethodId,
} from "@/lib/utils/marketplaceShipping";
import type { MarketplaceCheckoutQuoteMethod } from "@/lib/services/marketplaceCheckoutQuote.service";
import {
  CardPaymentSection,
  type CardPaymentFields,
} from "@/components/marketplace/CardPaymentSection";
import {
  GcashPaymentSection,
  type GcashPaymentFields,
} from "@/components/marketplace/GcashPaymentSection";
import {
  BankTransferPaymentSection,
  type BankTransferPaymentFields,
} from "@/components/marketplace/BankTransferPaymentSection";
import { CodPaymentSection, type CodPaymentFields } from "@/components/marketplace/CodPaymentSection";
import {
  PaymongoCardPaymentForm,
  type PaymongoCardPaymentHandle,
  type PaymongoCheckoutPayload,
} from "@/components/marketplace/PaymongoCardPayment";
import {
  PaymongoGcashPaymentForm,
  type PaymongoGcashPaymentHandle,
} from "@/components/marketplace/PaymongoGcashPayment";
import { MARKETPLACE_DEPOSIT_BANK_ACCOUNTS } from "@/lib/constants/marketplaceBankAccounts";
import type {
  MarketplacePaymentMethod,
  MarketplaceSavedAddress,
} from "@/lib/types/customerAccount";
import { validateNewCardEntry } from "@/lib/utils/cardPayment";
import { validateGcashEntry } from "@/lib/utils/gcashPayment";
import { validateBankTransferEntry } from "@/lib/utils/bankTransferPayment";
import { validateCodEntry } from "@/lib/utils/codPayment";
import { MARKETPLACE_COD_MIN_ORDER } from "@/lib/constants/marketplaceCod";
import { useCategorySampleImages } from "@/components/marketplace/useCategorySampleImages";
import {
  pickCatalogImage,
  pickHeroFloatImages,
} from "@/lib/marketplace/categoryImages";
import { MARKETPLACE_STOCK_IMAGES } from "@/lib/marketplace/stockImages";

const CHECKOUT_STEPS = [
  { id: "cart", label: "Cart" },
  { id: "information", label: "Information" },
  { id: "shipping", label: "Shipping" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
] as const;

type CheckoutQuoteState = {
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  shippingCost: number;
  total: number;
  shippingMethods: MarketplaceCheckoutQuoteMethod[];
  shippingBreakdown?: { baseShipping: number; codFee: number; courier: string };
};

const PAYMENT_OPTIONS = [
  { id: "cash" as const, label: "Cash on Delivery", badges: ["COD"] },
  { id: "card" as const, label: "Credit / Debit Card", badges: ["Visa", "Mastercard"] },
  { id: "gcash" as const, label: "GCash", badges: ["GCash"] },
  { id: "bank_transfer" as const, label: "Bank Transfer", badges: ["Bank"] },
] as const;

function isCheckoutPaymentOptionEnabled(
  optionId: (typeof PAYMENT_OPTIONS)[number]["id"],
  paymongoEnabled: boolean
): boolean {
  if (optionId === "cash") return true;
  return paymongoEnabled;
}

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "Philippines",
  paymentMethod: "cash" as "cash" | "gcash" | "card" | "bank_transfer" | "credit",
  notes: "",
};

export default function MarketplaceCheckoutPage() {
  const router = useRouter();
  const money = useFormatCurrency();
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
  const items = useMarketplaceCartStore((s) => s.items);
  const getSubtotal = useMarketplaceCartStore((s) => s.getSubtotal);
  const clear = useMarketplaceCartStore((s) => s.clear);
  const subtotal = getSubtotal();
  const categorySamples = useCategorySampleImages();
  const heroImages = useMemo(
    () =>
      categorySamples
        ? pickHeroFloatImages(categorySamples, ["homecare", "wellness", "cosmetics"])
        : [
            MARKETPLACE_STOCK_IMAGES.cleanser,
            MARKETPLACE_STOCK_IMAGES.serum,
            MARKETPLACE_STOCK_IMAGES.collection,
          ],
    [categorySamples]
  );
  const catalogFallback = categorySamples
    ? pickCatalogImage(categorySamples)
    : MARKETPLACE_STOCK_IMAGES.moisturizer;

  const [loading, setLoading] = useState(false);
  const [shippingMethod, setShippingMethod] =
    useState<MarketplaceShippingMethodId>("jt_economy");
  const [checkoutQuote, setCheckoutQuote] = useState<CheckoutQuoteState | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [saveInfo, setSaveInfo] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<MarketplaceSavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [memberDiscountPercent, setMemberDiscountPercent] = useState(0);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<MarketplacePaymentMethod[]>([]);
  const [cardPayment, setCardPayment] = useState<CardPaymentFields>({
    mode: "new",
    savedMethodId: "",
    cardholderName: "",
    cardNumber: "",
    expMonth: "",
    expYear: "",
    cvv: "",
    saveCard: true,
  });
  const [gcashPayment, setGcashPayment] = useState<GcashPaymentFields>({
    mode: "new",
    savedMethodId: "",
    accountName: "",
    mobileNumber: "",
    saveWallet: true,
  });
  const [bankTransferPayment, setBankTransferPayment] = useState<BankTransferPaymentFields>({
    mode: "new",
    savedMethodId: "",
    depositorName: "",
    depositorBank: "",
    accountLast4: "",
    transferReference: "",
    depositToBankId: MARKETPLACE_DEPOSIT_BANK_ACCOUNTS[0]?.id ?? "",
    saveAccount: true,
  });
  const [codPayment, setCodPayment] = useState<CodPaymentFields>({
    acknowledged: false,
    prepareChangeFor: "",
  });
  const [paymongoEnabled, setPaymongoEnabled] = useState(false);
  const [pmBillingName, setPmBillingName] = useState("");
  const [pmBillingEmail, setPmBillingEmail] = useState("");
  const [pmBillingPhone, setPmBillingPhone] = useState("");
  const paymongoCardRef = useRef<PaymongoCardPaymentHandle>(null);
  const paymongoGcashRef = useRef<PaymongoGcashPaymentHandle>(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fallbackDiscountAmount =
    memberDiscountPercent > 0
      ? Math.round((subtotal * Math.min(100, memberDiscountPercent)) / 100 * 100) / 100
      : 0;
  const fallbackShipping = (() => {
    try {
      return computeCheckoutShippingQuote({
        merchandiseSubtotal: subtotal,
        discountAmount: fallbackDiscountAmount,
        shippingMethod,
        paymentMethod: form.paymentMethod,
        region: form.region,
        city: form.city,
      }).shippingCost;
    } catch {
      return 0;
    }
  })();
  const discountAmount = checkoutQuote?.discountAmount ?? fallbackDiscountAmount;
  const shippingCost = checkoutQuote?.shippingCost ?? fallbackShipping;
  const total =
    checkoutQuote?.total ??
    computeMarketplaceOrderTotal(subtotal, discountAmount, shippingCost);
  const fallbackShippingMethods: MarketplaceCheckoutQuoteMethod[] =
    getCheckoutShippingMethodsForAddress(form.region, form.city, form.paymentMethod).flatMap(
      (method) => {
        try {
          const quote = computeCheckoutShippingQuote({
            merchandiseSubtotal: subtotal,
            discountAmount: fallbackDiscountAmount,
            shippingMethod: method.id,
            paymentMethod: form.paymentMethod,
            region: form.region,
            city: form.city,
          });
          return [
            {
              id: method.id,
              title: method.title,
              detail: method.detail,
              supportsCod: method.supportsCod,
              baseShipping: quote.baseShipping,
              codFee: quote.codFee,
              shippingCost: quote.shippingCost,
            },
          ];
        } catch {
          return [];
        }
      }
    );
  const shippingMethodOptions =
    checkoutQuote?.shippingMethods ?? fallbackShippingMethods;

  const applyAddress = useCallback((addr: MarketplaceSavedAddress) => {
    setForm((f) => ({
      ...f,
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 ?? "",
      city: addr.city,
      region: addr.region,
      postalCode: addr.postalCode,
    }));
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || session?.user?.role !== "CUSTOMER") return;

    queueMicrotask(() => {
      void (async () => {
        try {
          const [dashRes, addrRes, payRes] = await Promise.all([
            fetch("/api/account/dashboard"),
            fetch("/api/account/saved-addresses"),
            fetch("/api/account/payment-methods"),
          ]);
          const dashJson = await dashRes.json();
          if (dashRes.ok && dashJson.success) {
            const profile = dashJson.data.profile as { name: string; email: string; phone?: string };
            setMemberDiscountPercent(dashJson.data.memberDiscountPercent ?? 0);
            setForm((f) => ({
              ...f,
              fullName: f.fullName || profile.name || "",
              email: f.email || profile.email || "",
              phone: f.phone || profile.phone || "",
            }));
          }
          const addrJson = await addrRes.json();
          if (addrRes.ok && addrJson.success) {
            const list = addrJson.data as MarketplaceSavedAddress[];
            setSavedAddresses(list);
            const def = list.find((a) => a.isDefault) ?? list[0];
            if (def) {
              setSelectedAddressId(def.id);
              applyAddress(def);
            }
          }
          const payJson = await payRes.json();
          if (payRes.ok && payJson.success) {
            const methods = payJson.data as MarketplacePaymentMethod[];
            setSavedPaymentMethods(methods);
            const defaultCard =
              methods.find((m) => m.type === "card" && m.isDefault) ??
              methods.find((m) => m.type === "card");
            if (defaultCard) {
              setCardPayment((c) => ({
                ...c,
                mode: "saved",
                savedMethodId: defaultCard.id,
              }));
            }
            const defaultGcash =
              methods.find((m) => m.type === "gcash" && m.isDefault) ??
              methods.find((m) => m.type === "gcash");
            if (defaultGcash) {
              setGcashPayment((g) => ({
                ...g,
                mode: "saved",
                savedMethodId: defaultGcash.id,
              }));
            }
            const defaultBank =
              methods.find((m) => m.type === "bank_transfer" && m.isDefault) ??
              methods.find((m) => m.type === "bank_transfer");
            if (defaultBank) {
              setBankTransferPayment((b) => ({
                ...b,
                mode: "saved",
                savedMethodId: defaultBank.id,
              }));
            }
          }
        } catch {
          /* optional prefill */
        }
      })();
    });
  }, [sessionStatus, session?.user?.role, applyAddress]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/marketplace/paymongo/config");
        const json = await res.json();
        const enabled = Boolean(res.ok && json.success && json.data.enabled);
        setPaymongoEnabled(enabled);
        if (!enabled) {
          setForm((f) =>
            f.paymentMethod === "cash" ? f : { ...f, paymentMethod: "cash" }
          );
        }
      } catch {
        setPaymongoEnabled(false);
        setForm((f) =>
          f.paymentMethod === "cash" ? f : { ...f, paymentMethod: "cash" }
        );
      }
    })();
  }, []);

  useEffect(() => {
    setPmBillingName((n) => n || form.fullName);
    setPmBillingEmail((e) => e || form.email);
    setPmBillingPhone((p) => p || form.phone);
  }, [form.fullName, form.email, form.phone]);

  useEffect(() => {
    if (items.length === 0) {
      setCheckoutQuote(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void (async () => {
        setQuoteLoading(true);
        try {
          const res = await fetch("/api/marketplace/checkout/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: items.map((i) => ({
                productId: i.productId,
                variantId: i.variantId,
                quantity: i.quantity,
              })),
              shipping: {
                fullName: form.fullName.trim() || "Guest",
                email: form.email.trim() || "guest@checkout.local",
                phone: form.phone.trim() || "0000000000",
                line1: form.line1.trim() || "—",
                line2: form.line2.trim() || undefined,
                city: form.city.trim() || "Quezon City",
                region: form.region.trim() || "Metro Manila",
                postalCode: form.postalCode.trim() || "1100",
              },
              shippingMethod,
              paymentMethod: form.paymentMethod,
            }),
            signal: controller.signal,
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(json.error ?? "Could not update shipping rates");
          }
          const quote = json.data as CheckoutQuoteState;
          setCheckoutQuote(quote);
          if (
            quote.shippingMethods.length > 0 &&
            !quote.shippingMethods.some((m) => m.id === shippingMethod)
          ) {
            setShippingMethod(quote.shippingMethods[0].id as MarketplaceShippingMethodId);
          }
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          setCheckoutQuote(null);
        } finally {
          if (!controller.signal.aborted) setQuoteLoading(false);
        }
      })();
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    items,
    shippingMethod,
    form.region,
    form.city,
    form.paymentMethod,
    form.fullName,
    form.email,
    form.phone,
    form.line1,
    form.line2,
    form.postalCode,
    memberDiscountPercent,
    subtotal,
  ]);

  const isRemote = (url: string) => /^https?:\/\//i.test(url);

  function buildPaymongoQuotePayload(): PaymongoCheckoutPayload {
    return {
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      shipping: {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        line1: form.line1.trim(),
        line2: form.line2.trim() || undefined,
        city: form.city.trim(),
        region: form.region.trim(),
        postalCode: form.postalCode.trim(),
      },
      shippingMethod,
    };
  }

  function paymongoReturnUrl() {
    if (typeof window === "undefined") return "/checkout/paymongo-return";
    return `${window.location.origin}/checkout/paymongo-return`;
  }

  function lineImage(url: string | undefined) {
    return url || catalogFallback;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    if (!paymongoEnabled && form.paymentMethod !== "cash") {
      toast({
        title: "Online payments unavailable",
        description: "Use Cash on Delivery, or configure PayMongo API keys.",
        variant: "destructive",
      });
      return;
    }
    if (form.paymentMethod === "card" && !paymongoEnabled) {
      if (cardPayment.mode === "saved") {
        if (!cardPayment.savedMethodId) {
          toast({ title: "Select a saved card", variant: "destructive" });
          return;
        }
        if (session?.user?.role !== "CUSTOMER") {
          toast({
            title: "Sign in to use a saved card",
            description: "Or enter a new card below.",
            variant: "destructive",
          });
          return;
        }
      } else {
        const validated = validateNewCardEntry({
          cardholderName: cardPayment.cardholderName,
          cardNumber: cardPayment.cardNumber,
          expMonth: cardPayment.expMonth,
          expYear: cardPayment.expYear,
          cvv: cardPayment.cvv,
        });
        if (!validated.ok) {
          toast({ title: validated.error, variant: "destructive" });
          return;
        }
      }
    }

    if (form.paymentMethod === "gcash" && !paymongoEnabled) {
      if (gcashPayment.mode === "saved") {
        if (!gcashPayment.savedMethodId) {
          toast({ title: "Select a saved GCash account", variant: "destructive" });
          return;
        }
        if (session?.user?.role !== "CUSTOMER") {
          toast({
            title: "Sign in to use a saved GCash account",
            description: "Or enter your mobile number below.",
            variant: "destructive",
          });
          return;
        }
      } else {
        const validated = validateGcashEntry({
          accountName: gcashPayment.accountName,
          mobileNumber: gcashPayment.mobileNumber,
        });
        if (!validated.ok) {
          toast({ title: validated.error, variant: "destructive" });
          return;
        }
      }
    }

    if (form.paymentMethod === "bank_transfer") {
      const depositId =
        bankTransferPayment.depositToBankId || MARKETPLACE_DEPOSIT_BANK_ACCOUNTS[0]?.id || "";
      if (!depositId) {
        toast({ title: "Select a Glowish deposit account", variant: "destructive" });
        return;
      }
      if (bankTransferPayment.transferReference.trim().length < 4) {
        toast({ title: "Enter your transfer reference number", variant: "destructive" });
        return;
      }
      if (bankTransferPayment.mode === "saved") {
        if (!bankTransferPayment.savedMethodId) {
          toast({ title: "Select a saved bank account", variant: "destructive" });
          return;
        }
        if (session?.user?.role !== "CUSTOMER") {
          toast({
            title: "Sign in to use a saved bank account",
            description: "Or enter your transfer details below.",
            variant: "destructive",
          });
          return;
        }
      } else {
        const validated = validateBankTransferEntry({
          depositorName: bankTransferPayment.depositorName,
          depositorBank: bankTransferPayment.depositorBank,
          accountLast4: bankTransferPayment.accountLast4,
          transferReference: bankTransferPayment.transferReference,
          depositToBankId: depositId,
        });
        if (!validated.ok) {
          toast({ title: validated.error, variant: "destructive" });
          return;
        }
      }
    }

    if (form.paymentMethod === "cash") {
      if (total < MARKETPLACE_COD_MIN_ORDER) {
        toast({
          title: `Minimum order for COD is ${money(MARKETPLACE_COD_MIN_ORDER)}`,
          variant: "destructive",
        });
        return;
      }
      const prepareRaw = codPayment.prepareChangeFor.trim();
      const prepareChangeFor = prepareRaw ? parseFloat(prepareRaw) : undefined;
      const validated = validateCodEntry({
        acknowledged: codPayment.acknowledged,
        amountDue: total,
        prepareChangeFor:
          prepareChangeFor !== undefined && Number.isFinite(prepareChangeFor)
            ? prepareChangeFor
            : undefined,
      });
      if (!validated.ok) {
        toast({ title: validated.error, variant: "destructive" });
        return;
      }
    }

    if (paymongoEnabled && form.paymentMethod === "card") {
      if (!paymongoCardRef.current?.isReady) {
        toast({ title: "Card form is still loading", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      let paymongoPaymentIntentId: string | undefined;

      if (paymongoEnabled && form.paymentMethod === "card") {
        const paid = await paymongoCardRef.current!.pay(buildPaymongoQuotePayload());
        if (paid.pendingRedirect) return;
        paymongoPaymentIntentId = paid.paymentIntentId;
      }

      if (paymongoEnabled && form.paymentMethod === "gcash") {
        if (!paymongoGcashRef.current?.isReady) {
          throw new Error("GCash checkout is still loading");
        }
        await paymongoGcashRef.current.pay(buildPaymongoQuotePayload(), {
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          shipping: {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            line1: form.line1.trim(),
            line2: form.line2.trim() || undefined,
            city: form.city.trim(),
            region: form.region.trim(),
            postalCode: form.postalCode.trim(),
          },
          shippingMethod,
          paymentMethod: "gcash",
          notes: form.notes.trim() || undefined,
          saveAddress: saveInfo && session?.user?.role === "CUSTOMER",
        });
        return;
      }

      const payload: Record<string, unknown> = {
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        shipping: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          line1: form.line1.trim(),
          line2: form.line2.trim() || undefined,
          city: form.city.trim(),
          region: form.region.trim(),
          postalCode: form.postalCode.trim(),
        },
        shippingMethod,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim() || undefined,
        saveAddress: saveInfo && session?.user?.role === "CUSTOMER",
      };

      if (paymongoPaymentIntentId) {
        payload.paymongoPaymentIntentId = paymongoPaymentIntentId;
      }

      if (form.paymentMethod === "card" && !paymongoEnabled) {
        if (cardPayment.mode === "saved" && cardPayment.savedMethodId) {
          payload.savedPaymentMethodId = cardPayment.savedMethodId;
        } else {
          const validated = validateNewCardEntry({
            cardholderName: cardPayment.cardholderName,
            cardNumber: cardPayment.cardNumber,
            expMonth: cardPayment.expMonth,
            expYear: cardPayment.expYear,
            cvv: cardPayment.cvv,
          });
          if (validated.ok) {
            payload.cardPayment = {
              cardholderName: validated.resolved.cardholderName,
              cardLast4: validated.resolved.cardLast4,
              cardBrand: validated.resolved.cardBrand,
              expMonth: validated.resolved.expMonth!,
              expYear: validated.resolved.expYear!,
            };
            if (session?.user?.role === "CUSTOMER" && cardPayment.saveCard) {
              payload.savePaymentMethod = true;
            }
          }
        }
      }

      if (form.paymentMethod === "gcash" && !paymongoEnabled) {
        if (gcashPayment.mode === "saved" && gcashPayment.savedMethodId) {
          payload.savedPaymentMethodId = gcashPayment.savedMethodId;
        } else {
          const validated = validateGcashEntry({
            accountName: gcashPayment.accountName,
            mobileNumber: gcashPayment.mobileNumber,
          });
          if (validated.ok) {
            payload.gcashPayment = {
              accountName: validated.resolved.accountName,
              mobileNumber: validated.resolved.mobileNumber,
            };
            if (session?.user?.role === "CUSTOMER" && gcashPayment.saveWallet) {
              payload.savePaymentMethod = true;
            }
          }
        }
      }

      if (form.paymentMethod === "bank_transfer") {
        const depositId =
          bankTransferPayment.depositToBankId || MARKETPLACE_DEPOSIT_BANK_ACCOUNTS[0]?.id || "";
        const bankPayload: Record<string, string | undefined> = {
          transferReference: bankTransferPayment.transferReference.trim(),
          depositToBankId: depositId,
        };
        if (bankTransferPayment.mode === "saved" && bankTransferPayment.savedMethodId) {
          payload.savedPaymentMethodId = bankTransferPayment.savedMethodId;
        } else {
          const validated = validateBankTransferEntry({
            depositorName: bankTransferPayment.depositorName,
            depositorBank: bankTransferPayment.depositorBank,
            accountLast4: bankTransferPayment.accountLast4,
            transferReference: bankTransferPayment.transferReference,
            depositToBankId: depositId,
          });
          if (validated.ok) {
            bankPayload.depositorName = validated.resolved.depositorName;
            bankPayload.depositorBank = validated.resolved.depositorBank;
            if (validated.resolved.accountLast4) {
              bankPayload.accountLast4 = validated.resolved.accountLast4;
            }
            if (session?.user?.role === "CUSTOMER" && bankTransferPayment.saveAccount) {
              payload.savePaymentMethod = true;
            }
          }
        }
        payload.bankTransferPayment = bankPayload;
      }

      if (form.paymentMethod === "cash") {
        const prepareRaw = codPayment.prepareChangeFor.trim();
        const prepareNum = prepareRaw ? parseFloat(prepareRaw) : undefined;
        const validated = validateCodEntry({
          acknowledged: codPayment.acknowledged,
          amountDue: total,
          prepareChangeFor:
            prepareNum !== undefined && Number.isFinite(prepareNum) ? prepareNum : undefined,
        });
        if (validated.ok) {
          payload.codPayment = {
            codAcknowledged: true as const,
            ...(validated.resolved.prepareChangeFor !== undefined
              ? { prepareChangeFor: validated.resolved.prepareChangeFor }
              : {}),
          };
        }
      }

      const res = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Checkout failed");
      const { orderNumber, total: orderTotal, status } = json.data as {
        orderNumber: string;
        total: number;
        status?: string;
      };
      clear();
      const successParams = new URLSearchParams({
        orderNumber,
        total: String(orderTotal),
      });
      if (form.paymentMethod === "bank_transfer") {
        successParams.set("paymentMethod", "bank_transfer");
        if (status) successParams.set("status", status);
      }
      if (form.paymentMethod === "cash") {
        successParams.set("paymentMethod", "cash");
        if (status) successParams.set("status", status);
      }
      router.push(`/checkout/success?${successParams.toString()}`);
    } catch (err) {
      toast({
        title: "Could not place order",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <MarketplacePageShell gap="" innerClassName="flex justify-center">
        <div className="w-full max-w-xl rounded-[2rem] border border-white/65 bg-white/55 p-10 text-center shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl">
          <Package className="mx-auto mb-4 h-12 w-12 text-[#6ea43f]/70" />
          <h1 className="font-[family-name:var(--font-playfair-display)] text-3xl font-semibold text-[#1e3157]">
            Checkout
          </h1>
          <p className="mt-2 text-sm text-[#2A4C6A]/75">Your cart is empty.</p>
          <Button className="mt-6 rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white" asChild>
            <Link href="/shop">Browse products</Link>
          </Button>
        </div>
      </MarketplacePageShell>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={cn(MARKETPLACE_PAGE_OUTER, MARKETPLACE_PAGE_FONT)}
    >
      <div className={cn(MARKETPLACE_PAGE_INNER, "space-y-5")}>
        <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-white/60 bg-white/20 px-6 py-8 shadow-[0_24px_80px_rgba(94,70,135,0.16)] backdrop-blur-xl sm:px-10 lg:min-h-[260px]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_44%,rgba(255,255,255,0.75),transparent_24%),radial-gradient(circle_at_88%_36%,rgba(255,51,204,0.16),transparent_36%)]" />
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <h1 className="font-[family-name:var(--font-playfair-display)] text-4xl font-semibold text-[#1e3157] sm:text-5xl">
                Checkout
              </h1>
              <div className="mt-3 flex items-center gap-2 text-sm text-[#2A4C6A]/70">
                <Link href="/" className="hover:text-[#2B6B56]">
                  Home
                </Link>
                <span>/</span>
                <Link href="/cart" className="hover:text-[#2B6B56]">
                  Cart
                </Link>
                <span>/</span>
                <span className="font-semibold text-[#3c2e60]">Checkout</span>
              </div>
            </div>

            <div className="relative min-h-[200px] lg:min-h-[240px]">
              <div className="absolute inset-x-[8%] bottom-6 h-20 rounded-[50%] bg-white/45 blur-2xl" />
              {heroImages.map((image, index) => {
                const positions = [
                  "left-[16%] top-[24%] h-40 w-32 rotate-[-5deg]",
                  "left-[42%] top-[5%] h-52 w-36",
                  "right-[5%] top-[30%] h-44 w-40 rotate-[5deg]",
                ];
                return (
                  <div
                    key={image}
                    className={`absolute ${positions[index]} overflow-hidden rounded-[2rem] border border-white/75 bg-white/65 p-2 shadow-[0_24px_65px_rgba(68,47,107,0.22)] backdrop-blur`}
                  >
                    <div
                      className="h-full rounded-[1.4rem] bg-cover bg-center"
                      style={{ backgroundImage: `url(${image})` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/65 bg-white/55 px-4 py-5 shadow-sm backdrop-blur-xl sm:px-6">
          <ol className="flex flex-wrap items-center justify-between gap-4">
            {CHECKOUT_STEPS.map((step, index) => {
              const active = step.id === "information";
              const completed = step.id === "cart";
              return (
                <li key={step.id} className="flex min-w-[4.5rem] flex-1 flex-col items-center gap-2">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold",
                      completed && "border-violet-300 bg-violet-100 text-violet-600",
                      active && "border-[#6ea43f] bg-[#6ea43f] text-white",
                      !completed && !active && "border-white/70 bg-white/60 text-[#2A4C6A]/45"
                    )}
                  >
                    {completed ? <Check className="h-5 w-5" /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "text-center text-xs font-semibold",
                      active ? "text-[#6ea43f]" : "text-[#2A4C6A]/65"
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-violet-100">
            <div className="h-full w-[40%] rounded-full bg-[#6ea43f]" />
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <section className="rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-6">
              {savedAddresses.length > 0 ? (
                <div className="mb-4 space-y-2">
                  <Label>Saved address</Label>
                  <Select
                    value={selectedAddressId || "new"}
                    onValueChange={(id) => {
                      setSelectedAddressId(id);
                      if (id === "new") return;
                      const addr = savedAddresses.find((a) => a.id === id);
                      if (addr) applyAddress(addr);
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-white/70 bg-white/65">
                      <SelectValue placeholder="Choose address" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Enter a new address</SelectItem>
                      {savedAddresses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label} — {a.line1}, {a.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <h2 className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
                Contact Information
              </h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-[#2A4C6A]/75">
                  <Checkbox
                    checked={marketingOptIn}
                    onCheckedChange={(checked) => setMarketingOptIn(checked === true)}
                  />
                  Keep me updated on news and exclusive offers
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-6">
              <h2 className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
                Shipping Address
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Select
                    value={form.country}
                    onValueChange={(value) => setForm((f) => ({ ...f, country: value }))}
                  >
                    <SelectTrigger id="country" className="rounded-xl border-white/70 bg-white/65">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Philippines">Philippines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="line1">Address *</Label>
                  <Input
                    id="line1"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.line1}
                    onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="line2">Apartment, suite, etc. (optional)</Label>
                  <Input
                    id="line2"
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.line2}
                    onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal">Postal Code *</Label>
                  <Input
                    id="postal"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.postalCode}
                    onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="region">Province / Region *</Label>
                  <Input
                    id="region"
                    required
                    className="rounded-xl border-white/70 bg-white/65"
                    value={form.region}
                    onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-[#2A4C6A]/75 sm:col-span-2">
                  <Checkbox
                    checked={saveInfo}
                    onCheckedChange={(checked) => setSaveInfo(checked === true)}
                  />
                  Save this information for next time
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl sm:p-6">
              <h2 className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
                Shipping Method
              </h2>
              <p className="mt-1 text-xs text-[#2A4C6A]/65">
                Rates follow J&amp;T, Flash Express, and Lalamove tariffs for your area. COD orders
                include the courier&apos;s cash-collection fee.
              </p>
              <div className="mt-4 space-y-3">
                {shippingMethodOptions.length === 0 ? (
                  <p className="text-sm text-[#2A4C6A]/70">
                    Enter your city and province to see available couriers.
                  </p>
                ) : (
                  shippingMethodOptions.map((option) => {
                    const selected = shippingMethod === option.id;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition",
                          selected
                            ? "border-violet-300 bg-violet-50/80"
                            : "border-white/70 bg-white/50 hover:bg-white/70"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shippingMethod"
                            checked={selected}
                            onChange={() =>
                              setShippingMethod(option.id as MarketplaceShippingMethodId)
                            }
                            className="h-4 w-4 accent-[#6ea43f]"
                          />
                          <div>
                            <p className="text-sm font-semibold text-[#1e3157]">{option.title}</p>
                            <p className="text-xs text-[#2A4C6A]/65">{option.detail}</p>
                            {selected &&
                            form.paymentMethod === "cash" &&
                            option.codFee > 0 ? (
                              <p className="mt-1 text-[10px] text-[#2A4C6A]/55">
                                Freight {money(option.baseShipping)} + COD fee {money(option.codFee)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-[#1e3157]">
                          {quoteLoading && selected ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            money(option.shippingCost)
                          )}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-[family-name:var(--font-playfair-display)] text-2xl font-semibold text-[#1e3157]">
                  Order Summary
                </h2>
                <Link href="/cart" className="text-xs font-semibold text-[#6ea43f] hover:underline">
                  Edit Cart &gt;
                </Link>
              </div>
              <ul className="max-h-56 space-y-3 overflow-y-auto pr-1">
                {items.map((line) => {
                  const imageUrl = lineImage(line.image);
                  return (
                    <li
                      key={`${line.productId}-${line.variantId ?? ""}`}
                      className="flex gap-3 border-b border-white/50 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/70 bg-white/60">
                        {isRemote(imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Image src={imageUrl} alt="" fill className="object-cover" sizes="56px" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-[#1e3157]">{line.name}</p>
                        <p className="text-xs text-[#2A4C6A]/65">
                          {line.variantName ?? "30ml"} · Qty {line.quantity}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-[#1e3157]">
                        {money(line.price * line.quantity)}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 space-y-2 border-t border-white/60 pt-4 text-sm">
                <div className="flex justify-between text-[#2A4C6A]/80">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#1e3157]">{money(subtotal)}</span>
                </div>
                {discountAmount > 0 ? (
                  <div className="flex justify-between text-green-700">
                    <span>Member discount ({memberDiscountPercent}%)</span>
                    <span className="font-semibold">−{money(discountAmount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-[#2A4C6A]/80">
                  <span>Shipping</span>
                  <span className="font-semibold text-[#1e3157]">
                    {quoteLoading ? "…" : money(shippingCost)}
                  </span>
                </div>
                {checkoutQuote?.shippingBreakdown &&
                checkoutQuote.shippingBreakdown.codFee > 0 ? (
                  <div className="space-y-1 pl-2 text-xs text-[#2A4C6A]/65">
                    <div className="flex justify-between">
                      <span>{checkoutQuote.shippingBreakdown.courier} freight</span>
                      <span>{money(checkoutQuote.shippingBreakdown.baseShipping)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>COD collection fee</span>
                      <span>{money(checkoutQuote.shippingBreakdown.codFee)}</span>
                    </div>
                  </div>
                ) : null}
                <div className="flex justify-between pt-2 text-lg font-bold text-[#6ea43f]">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/65 bg-white/55 p-5 shadow-[0_18px_55px_rgba(94,70,135,0.14)] backdrop-blur-xl">
              <h2 className="font-[family-name:var(--font-playfair-display)] text-xl font-semibold text-[#1e3157]">
                Payment Method
              </h2>
              {!paymongoEnabled ? (
                <p className="mt-2 text-xs leading-5 text-[#2A4C6A]/65">
                  Card, GCash, and bank transfer unlock when PayMongo API keys are configured.
                  Cash on delivery is available now.
                </p>
              ) : null}
              <div className="mt-4 space-y-3">
                {PAYMENT_OPTIONS.map((option) => {
                  const selected = form.paymentMethod === option.id;
                  const enabled = isCheckoutPaymentOptionEnabled(option.id, paymongoEnabled);
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition",
                        enabled ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                        selected && enabled
                          ? "border-violet-300 bg-violet-50/80"
                          : "border-white/70 bg-white/50",
                        enabled && !selected && "hover:bg-white/70"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={selected}
                          disabled={!enabled}
                          onChange={() =>
                            setForm((f) => ({ ...f, paymentMethod: option.id }))
                          }
                          className="h-4 w-4 accent-[#6ea43f] disabled:cursor-not-allowed"
                        />
                        <span className="text-sm font-semibold text-[#1e3157]">{option.label}</span>
                      </div>
                      <div className="flex gap-1">
                        {option.badges.map((badge) => (
                          <span
                            key={badge}
                            className="rounded-md border border-white/70 bg-white/65 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#2A4C6A]/60"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </label>
                  );
                })}
              </div>

              {form.paymentMethod === "card" && paymongoEnabled ? (
                <PaymongoCardPaymentForm
                  ref={paymongoCardRef}
                  billingName={pmBillingName}
                  billingEmail={pmBillingEmail}
                  billingPhone={pmBillingPhone}
                  onBillingChange={(field, value) => {
                    if (field === "billingName") setPmBillingName(value);
                    if (field === "billingEmail") setPmBillingEmail(value);
                    if (field === "billingPhone") setPmBillingPhone(value);
                  }}
                  returnUrl={paymongoReturnUrl()}
                />
              ) : null}

              {form.paymentMethod === "card" && !paymongoEnabled ? (
                <CardPaymentSection
                  savedMethods={savedPaymentMethods}
                  value={cardPayment}
                  onChange={setCardPayment}
                  showSaveOption={session?.user?.role === "CUSTOMER"}
                />
              ) : null}

              {form.paymentMethod === "gcash" && paymongoEnabled ? (
                <PaymongoGcashPaymentForm
                  ref={paymongoGcashRef}
                  billingName={pmBillingName}
                  billingEmail={pmBillingEmail}
                  billingPhone={pmBillingPhone}
                  returnUrl={paymongoReturnUrl()}
                />
              ) : null}

              {form.paymentMethod === "gcash" && !paymongoEnabled ? (
                <GcashPaymentSection
                  savedMethods={savedPaymentMethods}
                  value={gcashPayment}
                  onChange={setGcashPayment}
                  showSaveOption={session?.user?.role === "CUSTOMER"}
                />
              ) : null}

              {form.paymentMethod === "bank_transfer" && paymongoEnabled ? (
                <BankTransferPaymentSection
                  savedMethods={savedPaymentMethods}
                  value={bankTransferPayment}
                  onChange={setBankTransferPayment}
                  showSaveOption={session?.user?.role === "CUSTOMER"}
                />
              ) : null}

              {form.paymentMethod === "cash" ? (
                <CodPaymentSection
                  amountDue={total}
                  value={codPayment}
                  onChange={setCodPayment}
                />
              ) : null}

              <Button
                type="submit"
                className="mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-[#6ea43f] to-[#477d34] text-white"
                disabled={
                  loading ||
                  (form.paymentMethod === "cash" &&
                    (total < MARKETPLACE_COD_MIN_ORDER || !codPayment.acknowledged))
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing order…
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    {form.paymentMethod === "card"
                      ? "Pay with card"
                      : form.paymentMethod === "gcash"
                        ? "Pay with GCash"
                        : form.paymentMethod === "bank_transfer"
                          ? "Place order & get bank details"
                          : form.paymentMethod === "cash"
                            ? "Place COD order"
                            : "Place order"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 w-full text-[#2A4C6A]/70"
                asChild
              >
                <Link href="/cart">&lt; Back to Cart</Link>
              </Button>
            </section>
          </div>
        </div>
      </div>
    </form>
  );
}
