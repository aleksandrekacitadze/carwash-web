"use client";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

export default function PaymentFailPage() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const orderId =
    searchParams.get(
      "orderId",
    );

  const [countdown, setCountdown] =
    useState(8);

  // -----------------------------------
  // AUTO REDIRECT
  // -----------------------------------

  useEffect(() => {
    const interval =
      setInterval(() => {
        setCountdown(
          (prev) => {
            if (prev <= 1) {
              clearInterval(
                interval,
              );

              if (orderId) {
                router.replace(
                  `/orders/${orderId}/pay`,
                );
              } else {
                router.replace(
                  "/orders/my",
                );
              }

              return 0;
            }

            return prev - 1;
          },
        );
      }, 1000);

    return () =>
      clearInterval(
        interval,
      );
  }, [orderId, router]);

  // -----------------------------------
  // UI
  // -----------------------------------

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.icon}>
          ❌
        </div>

        <h1 style={S.title}>
          Payment Failed
        </h1>

        <div style={S.text}>
          Your payment was not
          completed.
        </div>

        <div style={S.text}>
          Please try again.
        </div>

        {orderId ? (
          <div style={S.small}>
            Order ID:{" "}
            <b>{orderId}</b>
          </div>
        ) : null}

        <div style={S.redirect}>
          Redirecting in{" "}
          <b>{countdown}</b>s...
        </div>

        <button
          style={S.button}
          onClick={() => {
            if (orderId) {
              router.push(
                `/orders/${orderId}/pay`,
              );
            } else {
              router.push(
                "/orders/my",
              );
            }
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

const S: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    padding: 20,
    color: "var(--ink)",
    fontFamily: "system-ui",
  },

  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 28,
    background: "var(--surface)",
    border:
      "1px solid var(--line)",
    backdropFilter:
      "blur(14px)",
    textAlign: "center",
  },

  icon: {
    fontSize: 56,
  },

  title: {
    marginTop: 16,
    marginBottom: 10,
    fontSize: 30,
    fontWeight: 950,
    color: "#fca5a5",
  },

  text: {
    marginTop: 10,
    opacity: 0.9,
    lineHeight: 1.5,
  },

  small: {
    marginTop: 18,
    fontSize: 13,
    opacity: 0.75,
  },

  redirect: {
    marginTop: 18,
    fontSize: 14,
    opacity: 0.9,
  },

  button: {
    marginTop: 22,
    width: "100%",
    border: "none",
    borderRadius: 16,
    padding: "14px 18px",
    background: "#ff4d4d",
    color: "var(--ink)",
    fontWeight: 950,
    fontSize: 16,
    cursor: "pointer",
  },
};