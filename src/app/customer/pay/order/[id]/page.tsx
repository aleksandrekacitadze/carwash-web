"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { api } from "@/lib/api";

declare global {
  interface Window {
    checkout?: (
      selector: string,
      options: {
        options: Record<string, any>;
        params: Record<string, any>;
        css_variable?: Record<string, string>;
      },
    ) => void;
  }
}

type Order = {
  id: number;
  address: string;
  status: string;
  isPaid?: boolean;
  paymentStatus?: string;
  pricePaid?: string | null;
  washerId?: number | null;
};

type Me = {
  id: number;
  email?: string;
  role?: string;
};

type FlittCreateResponse = {
  paymentId: number;
  providerOrderId: string;
  token: string;
};

export default function PayOrderPage() {
  const router = useRouter();
  const params = useParams();

  const orderId = useMemo(
    () => Number(params?.id || 0),
    [params],
  );

  const [me, setMe] = useState<Me | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [amount, setAmount] = useState("0");

  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [acceptedNotified, setAcceptedNotified] = useState(false);

  // Flitt embedded checkout
  const [flittToken, setFlittToken] = useState("");
  const [flittSdkReady, setFlittSdkReady] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const canPay =
    !!me?.id &&
    order?.status === "ACCEPTED" &&
    order?.isPaid !== true &&
    order?.paymentStatus !== "PAID";

  // --------------------------------------------------
  // LOAD FLITT SDK AND CSS
  // --------------------------------------------------

  useEffect(() => {
    const cssId = "flitt-checkout-css";
    const scriptId = "flitt-checkout-js";

    // Load Flitt CSS
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");

      link.id = cssId;
      link.rel = "stylesheet";
      link.href =
        "https://pay.flitt.com/latest/checkout-vue/checkout.css";

      document.head.appendChild(link);
    }

    // SDK is already available
    if (window.checkout) {
      setFlittSdkReady(true);
      return;
    }

    const existingScript = document.getElementById(
      scriptId,
    ) as HTMLScriptElement | null;

    // Reuse an existing SDK script if present
    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        setFlittSdkReady(!!window.checkout);
        return;
      }

      const handleLoad = () => {
        existingScript.dataset.loaded = "true";
        setFlittSdkReady(!!window.checkout);

        if (!window.checkout) {
          setErr("Flitt checkout SDK could not be initialized.");
        }
      };

      const handleError = () => {
        setErr("Could not load the Flitt payment system.");
      };

      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);

      return () => {
        existingScript.removeEventListener("load", handleLoad);
        existingScript.removeEventListener("error", handleError);
      };
    }

    // Load SDK for the first time
    const script = document.createElement("script");

    script.id = scriptId;
    script.src =
      "https://pay.flitt.com/latest/checkout-vue/checkout.js";
    script.async = true;

    script.onload = () => {
      script.dataset.loaded = "true";

      if (window.checkout) {
        setFlittSdkReady(true);
      } else {
        setErr("Flitt checkout SDK could not be initialized.");
      }
    };

    script.onerror = () => {
      setErr("Could not load the Flitt payment system.");
    };

    document.body.appendChild(script);
  }, []);

  // --------------------------------------------------
  // INITIALIZE FLITT CHECKOUT WHEN TOKEN IS AVAILABLE
  // --------------------------------------------------

  useEffect(() => {
    if (!flittToken || !flittSdkReady || !window.checkout) {
      return;
    }

    const container = document.getElementById("flitt-checkout");

    if (!container) {
      return;
    }

    // Clear any previous checkout instance
    container.innerHTML = "";

    const options = {
      options: {
        methods: ["card"],
        methods_disabled: [],

        // Wallet methods supported by Flitt.
        // Actual availability depends on merchant activation,
        // device, browser, and wallet eligibility.
        wallet_methods_enabled: ["apple", "google"],

        card_icons: [
          "visa",
          "mastercard",
          "maestro",
        ],

        active_tab: "card",
        full_screen: false,

        show_amount: true,
        show_title: false,
        show_link: false,
        show_lang: true,
        show_secure_message: true,

        locales: ["en", "ka"],

        theme: {
          type: "light",
          preset: "black",
        },
      },

      // The token is generated by your backend.
      // Do not put your Flitt secret key in frontend code.
      params: {
        token: flittToken,
      },
    };

    try {
      window.checkout("#flitt-checkout", options);
    } catch (error) {
      console.error("Flitt checkout initialization error:", error);
      setErr("Could not open the Flitt payment form.");
    }
  }, [flittToken, flittSdkReady]);

  // --------------------------------------------------
  // INITIAL PAGE LOAD AND POLLING
  // --------------------------------------------------

  useEffect(() => {
    audioRef.current = new Audio(
      "/sounds/order-accepted.mp3",
    );

    init();
    pollPaymentStatus();

    const interval = setInterval(() => {
      loadOrder(false);
    }, 3000);

    const paymentInterval = setInterval(() => {
      pollPaymentStatus();
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(paymentInterval);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, acceptedNotified]);

  async function init() {
    await loadMe();
    await loadOrder();
  }

  async function loadMe() {
    try {
      const { data } = await api.get<Me>("/auth/me");
      setMe(data);
    } catch {
      setErr("User not found. Please login again.");
      router.push("/auth");
    }
  }

  function showToast(message: string) {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 4000);
  }

  function vibrateAccepted() {
    if ("vibrate" in navigator) {
      navigator.vibrate([250, 120, 250]);
    }
  }

  async function unlockAudio() {
    try {
      await audioRef.current?.play();
      await audioRef.current?.pause();

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    } catch {
      // Audio permission may not be available yet.
    }
  }

  // --------------------------------------------------
  // REFRESH ACCEPTED ORDER PRICE
  // --------------------------------------------------

  async function refreshAcceptedPrice() {
    if (!orderId) return;

    try {
      const { data } = await api.post<{
        totalPriceGel: number;
      }>("/orders/recalculate-price", {
        orderId,
      });

      if (data?.totalPriceGel != null) {
        setAmount(String(data.totalPriceGel));
      }
    } catch (error) {
      console.error("Price refresh failed:", error);
    }
  }

  // --------------------------------------------------
  // LOAD ORDER
  // --------------------------------------------------

  async function loadOrder(showLoading = true) {
    if (!orderId) return;

    try {
      if (showLoading) {
        setLoading(true);
      }

      setErr("");

      const { data } = await api.get<Order>(
        `/orders/${orderId}`,
      );

      setOrder(data);

      if (data.pricePaid != null) {
        setAmount(String(data.pricePaid));
      }

      if (
        data.status === "ACCEPTED" &&
        !acceptedNotified
      ) {
        setAcceptedNotified(true);

        showToast(
          "✅ Washer accepted your order. Updating final live price...",
        );

        vibrateAccepted();

        try {
          await audioRef.current?.play();
        } catch {
          // Ignore autoplay restrictions.
        }

        await refreshAcceptedPrice();

        showToast("✅ Final live price updated.");
      }

      if (
        data.isPaid ||
        data.paymentStatus === "PAID"
      ) {
        router.push(`/orders/${orderId}/waiting`);
      }
    } catch (error: any) {
      setErr(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load order.",
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  // --------------------------------------------------
  // CHECK PAYMENT STATUS
  // --------------------------------------------------

  async function pollPaymentStatus() {
    if (!orderId) return;

    try {
      setCheckingPayment(true);

      const { data } = await api.get(
        `/payments/check/order/${orderId}`,
      );

      if (
        data?.paid === true ||
        data?.status === "CAPTURED"
      ) {
        setPaymentVerified(true);

        showToast("✅ Payment verified successfully.");

        router.push(`/orders/${orderId}/waiting`);
        return;
      }
    } catch (error) {
      console.error("Payment polling failed:", error);
    } finally {
      setCheckingPayment(false);
    }
  }

  // --------------------------------------------------
  // CREATE FLITT EMBEDDED PAYMENT
  // --------------------------------------------------

  async function payWithFlitt() {
    try {
      await unlockAudio();

      setPayLoading(true);
      setErr("");

      // A new payment attempt should start with a fresh token.
      setFlittToken("");

      if (!me?.id) {
        throw new Error(
          "User not found. Please login again.",
        );
      }

      if (!order) {
        throw new Error("Order not loaded.");
      }

      if (order.status !== "ACCEPTED") {
        throw new Error(
          "Wait until the washer accepts your order.",
        );
      }

      // ----------------------------------------------
      // CHECK ORDER BEFORE PAYMENT
      // ----------------------------------------------

      const check = await api.post(
        `/orders/${order.id}/check-before-payment`,
      );

      const checkData = check.data;

      // ----------------------------------------------
      // WASHER ACCEPTANCE EXPIRED
      // ----------------------------------------------

      if (
        checkData?.canPay === false &&
        checkData?.action === "SEARCH_NEW_WASHER"
      ) {
        showToast(
          "⚠️ Washer acceptance expired. Searching for a new washer...",
        );

        setAcceptedNotified(false);

        await loadOrder(false);
        return;
      }

      // ----------------------------------------------
      // ORDER NOT READY FOR PAYMENT
      // ----------------------------------------------

      if (checkData?.canPay === false) {
        throw new Error(
          checkData?.message ||
            "Order cannot be paid now.",
        );
      }

      // ----------------------------------------------
      // RECALCULATE FINAL PRICE
      // ----------------------------------------------

      const recalc = await api.post<{
        totalPriceGel: number;
      }>("/orders/recalculate-price", {
        orderId,
      });

      const finalAmount = Number(
        recalc.data?.totalPriceGel ?? amount,
      );

      if (
        !Number.isFinite(finalAmount) ||
        finalAmount <= 0
      ) {
        throw new Error("Invalid payment amount.");
      }

      setAmount(String(finalAmount));

      // ----------------------------------------------
      // CREATE PAYMENT AND GET FLITT TOKEN
      // ----------------------------------------------

      const { data } = await api.post<FlittCreateResponse>(
        "/payments/create",
        {
          kind: "ORDER",
          orderId: order.id,
          provider: "FLITT",
          currency: "GEL",
        },
      );

      if (!data?.token) {
        throw new Error(
          "Flitt payment token was not returned by the backend.",
        );
      }

      // Render the embedded checkout on this page.
      setFlittToken(data.token);

      showToast("Secure Flitt checkout is ready.");

      setPayLoading(false);
    } catch (error: any) {
      setErr(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create payment.",
      );

      setPayLoading(false);
    }
  }

  // --------------------------------------------------
  // PAGE UI
  // --------------------------------------------------

  return (
    <div
      style={S.page}
      onClick={unlockAudio}
    >
      <header style={S.header}>
        <div>
          <h1 style={S.title}>
            Pay for Order #{orderId}
          </h1>

          <div style={S.sub}>
            Payment unlocks after washer accepts your order.
          </div>

          {me?.id ? (
            <div style={S.small}>
              Logged user ID: {me.id}
            </div>
          ) : null}
        </div>

        <button
          style={S.btn}
          onClick={() => router.push("/orders/my")}
        >
          My Orders
        </button>
      </header>

      {err ? (
        <div style={S.error}>
          ⚠️ {err}
        </div>
      ) : null}

      <div style={S.card}>
        {loading ? (
          <div>Loading order...</div>
        ) : order ? (
          <>
            <div style={S.statusBox}>
              <div>
                <b>Status:</b> {order.status}
              </div>

              <div>
                <b>Washer:</b>{" "}
                {order.washerId ?? "Waiting..."}
              </div>

              <div>
                <b>Payment:</b>{" "}
                {order.paymentStatus ?? "PENDING"}
              </div>

              <div>
                <b>Address:</b> {order.address}
              </div>
            </div>

            {order.status !== "ACCEPTED" ? (
              <div style={S.waitBox}>
                ⏳ Waiting for washer to accept your order...

                <div style={S.small}>
                  This page checks automatically every 3 seconds.
                </div>
              </div>
            ) : (
              <div style={S.okBox}>
                ✅ Washer accepted your order. You can pay now.
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <div style={S.label}>
                Amount GEL
              </div>

              <input
                style={S.input}
                value={amount}
                readOnly
                aria-readonly="true"
              />

              <div style={S.small}>
                The final amount is calculated by the Tempi backend.
              </div>
            </div>

            {!flittToken ? (
              <button
                style={{
                  ...S.payBtn,
                  opacity:
                    !canPay || payLoading
                      ? 0.65
                      : 1,
                  cursor:
                    !canPay || payLoading
                      ? "not-allowed"
                      : "pointer",
                }}
                disabled={!canPay || payLoading}
                onClick={payWithFlitt}
              >
                {payLoading
                  ? "Creating secure payment..."
                  : "Pay with FLITT"}
              </button>
            ) : null}

            {flittToken ? (
              <div style={S.flittWrapper}>
                <div style={S.flittHeader}>
                  <div>
                    <div style={S.flittTitle}>
                      Secure payment
                    </div>

                    <div style={S.flittSubtitle}>
                      Complete your payment securely with Flitt.
                    </div>
                  </div>

                  <div style={S.secureBadge}>
                    🔒 Secure
                  </div>
                </div>

                {!flittSdkReady ? (
                  <div style={S.flittLoading}>
                    Loading secure checkout...
                  </div>
                ) : null}

                <div
                  id="flitt-checkout"
                  style={S.flittCheckout}
                />
              </div>
            ) : null}

            {checkingPayment ? (
              <div style={S.small}>
                Checking payment status...
              </div>
            ) : null}

            {paymentVerified ? (
              <div style={S.okBox}>
                ✅ Payment verified.
              </div>
            ) : null}

            <div style={S.small}>
              Payment confirmation is verified by the Tempi backend callback.
            </div>
          </>
        ) : (
          <div>Order not found.</div>
        )}
      </div>

      {toast ? (
        <div style={S.toast}>
          {toast}
        </div>
      ) : null}
    </div>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 20,
    background: "transparent",
    color: "var(--ink)",
    fontFamily: "system-ui",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },

  title: {
    margin: 0,
    fontSize: 26,
    fontWeight: 950,
  },

  sub: {
    marginTop: 6,
    opacity: 0.78,
  },

  btn: {
    background: "var(--surface-2)",
    color: "var(--ink)",
    padding: "10px 12px",
    borderRadius: 14,
    fontWeight: 800,
    border: "none",
    cursor: "pointer",
  },

  card: {
    marginTop: 14,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 18,
    padding: 16,
    maxWidth: 560,
  },

  statusBox: {
    display: "grid",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    background: "#fff",
    border: "1px solid var(--line)",
  },

  waitBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,200,0,0.12)",
    border: "1px solid rgba(255,200,0,0.25)",
    fontWeight: 900,
  },

  okBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background: "var(--accent-soft)",
    border: "1px solid var(--line)",
    fontWeight: 900,
  },

  label: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.8,
    marginBottom: 6,
  },

  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid var(--line)",
    background: "#fff",
    color: "var(--ink)",
    outline: "none",
    boxSizing: "border-box",
  },

  payBtn: {
    marginTop: 14,
    width: "100%",
    padding: "14px 16px",
    borderRadius: 16,
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 950,
    fontSize: 16,
  },

  flittWrapper: {
    marginTop: 22,
    padding: 16,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    color: "#111827",
    width: "100%",
    boxSizing: "border-box",
  },

  flittHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },

  flittTitle: {
    fontSize: 19,
    fontWeight: 900,
  },

  flittSubtitle: {
    marginTop: 5,
    fontSize: 12,
    color: "#6b7280",
  },

  secureBadge: {
    background: "#ecfdf5",
    color: "#047857",
    padding: "7px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  flittLoading: {
    padding: 16,
    textAlign: "center",
    color: "#6b7280",
  },

  flittCheckout: {
    width: "100%",
    minHeight: 180,
  },

  small: {
    marginTop: 10,
    fontSize: 12,
    opacity: 0.75,
    lineHeight: 1.45,
  },

  error: {
    marginTop: 14,
    maxWidth: 560,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,99,99,0.12)",
    border: "1px solid rgba(255,99,99,0.24)",
  },

  toast: {
    position: "fixed",
    left: "50%",
    bottom: 24,
    transform: "translateX(-50%)",
    padding: "12px 16px",
    borderRadius: 14,
    background: "#16a34a",
    color: "#fff",
    fontWeight: 900,
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
    zIndex: 9999,
    maxWidth: "90vw",
    textAlign: "center",
  },
};