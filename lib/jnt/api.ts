import { getJntApiBaseUrl, getJntCredentials } from "@/lib/jnt/config";
import { jntDataDigest } from "@/lib/jnt/sign";

type JntParty = {
  name: string;
  mobile: string;
  phone?: string;
  city: string;
  area: string;
  address: string;
};

export type JntCreateOrderInput = {
  txlogisticid: string;
  sender: JntParty;
  receiver: JntParty;
  weightKg: number;
  itemsValue: number;
  goodsValue: number;
  remark?: string;
  items?: { itemname: string; number: number; itemvalue: number }[];
};

export type JntCreateOrderResult = {
  trackingNumber: string;
  billCode?: string;
  sortingCode?: string;
  raw: Record<string, unknown>;
};

export type JntTrackResult = {
  trackingNumber: string;
  status: string;
  statusLabel: string;
  traces: { time?: string; desc?: string; status?: string }[];
  raw: Record<string, unknown>;
};

function formatJntDateTime(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length >= 12) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function partyPayload(p: JntParty) {
  const mobile = normalizePhone(p.mobile);
  return {
    name: p.name.slice(0, 100),
    mobile,
    phone: normalizePhone(p.phone ?? p.mobile),
    city: p.city.slice(0, 80),
    area: p.area.slice(0, 80),
    address: p.address.slice(0, 300),
  };
}

async function jntFormPost<T extends Record<string, unknown>>(
  path: string,
  msgType: string,
  logisticsPayload: Record<string, unknown>
): Promise<T> {
  const { eccompanyid, privateKey } = getJntCredentials();
  const logistics_interface = JSON.stringify(logisticsPayload);
  const data_digest = jntDataDigest(logistics_interface, privateKey);

  const body = new URLSearchParams({
    logistics_interface,
    data_digest,
    msg_type: msgType,
    eccompanyid,
  });

  const res = await fetch(`${getJntApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`J&T API returned invalid JSON (${res.status})`);
  }

  const iface = parseLogisticsInterface(json);
  const success = String(iface.success ?? iface.code ?? "").toLowerCase();
  if (success === "false" || success === "0") {
    const reason =
      String(iface.reason ?? iface.msg ?? iface.message ?? json.message ?? "J&T request failed");
    throw new Error(reason);
  }

  if (!res.ok) {
    throw new Error(`J&T API error (${res.status})`);
  }

  return iface as T;
}

function parseLogisticsInterface(json: Record<string, unknown>): Record<string, unknown> {
  const raw = json.logistics_interface ?? json.responseitems ?? json;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { success: "false", reason: raw };
    }
  }
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object") {
    return raw[0] as Record<string, unknown>;
  }
  if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return json;
}

/** Create a J&T shipment (ORDERCREATE). */
export async function jntCreateOrder(input: JntCreateOrderInput): Promise<JntCreateOrderResult> {
  const { customerid } = getJntCredentials();

  const logisticsPayload = {
    customerid,
    txlogisticid: input.txlogisticid,
    ordertype: "1",
    servicetype: "1",
    paytype: "1",
    createordertime: formatJntDateTime(),
    sender: partyPayload(input.sender),
    receiver: partyPayload(input.receiver),
    weight: String(Math.max(0.1, input.weightKg)),
    itemsvalue: String(Math.max(0, input.itemsValue)),
    goodsvalue: String(Math.max(0, input.goodsValue)),
    remark: input.remark?.slice(0, 200) ?? "",
    items:
      input.items?.length ?
        input.items.map((i) => ({
          itemname: i.itemname.slice(0, 100),
          number: String(i.number),
          itemvalue: String(i.itemvalue),
        }))
      : undefined,
  };

  const iface = await jntFormPost<Record<string, unknown>>(
    "/webopenplatformapi/api/order/addOrder",
    "ORDERCREATE",
    logisticsPayload
  );

  const trackingNumber = String(
    iface.mailno ?? iface.billCode ?? iface.billcode ?? iface.trackingNumber ?? ""
  ).trim();
  if (!trackingNumber) {
    throw new Error("J&T did not return a tracking number");
  }

  return {
    trackingNumber,
    billCode: iface.billCode ? String(iface.billCode) : undefined,
    sortingCode: iface.sortingCode ? String(iface.sortingCode) : undefined,
    raw: iface,
  };
}

/** Track a J&T shipment. */
export async function jntTrackOrder(trackingNumber: string): Promise<JntTrackResult> {
  const { customerid } = getJntCredentials();

  const iface = await jntFormPost<Record<string, unknown>>(
    "/webopenplatformapi/api/order/getOrder",
    "ORDERQUERY",
    {
      customerid,
      billcode: trackingNumber,
      lang: "en",
    }
  );

  const tracesRaw = (iface.details ?? iface.traces ?? iface.data ?? []) as unknown[];
  const traces = Array.isArray(tracesRaw)
    ? tracesRaw
        .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
        .map((t) => ({
          time: t.scantime ? String(t.scantime) : t.time ? String(t.time) : undefined,
          desc: t.desc ? String(t.desc) : t.remark ? String(t.remark) : undefined,
          status: t.scantype ? String(t.scantype) : t.status ? String(t.status) : undefined,
        }))
    : [];

  const latest = traces[0];
  const status = String(latest?.status ?? iface.status ?? "unknown");
  const statusLabel = String(latest?.desc ?? iface.reason ?? status);

  return {
    trackingNumber,
    status,
    statusLabel,
    traces,
    raw: iface,
  };
}
