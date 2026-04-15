"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import axios from "axios";

type Props = {
  orderId: number;
  amount: string; // "25.00"
};

type CreatePaypalPaymentResponse = {
  providerOrderId: string;
};

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

export default function PayPalPayButton({ orderId, amount }: Props) {
  const token = getToken();

  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID as string,
        currency: "USD",
        intent: "capture",
      }}
    >
      <PayPalButtons
        style={{ layout: "vertical" }}
        createOrder={async () => {
          // ✅ Typed response so res.data isn't "unknown"
          const res = await api.post<CreatePaypalPaymentResponse>(
            `/payments/paypal/${orderId}`,
            { amount }
          );

          return res.data.providerOrderId;
        }}
        onApprove={async (data) => {
          await api.post(`/payments/paypal/capture/${data.orderID}`);
          alert("Payment captured ✅");
        }}
        onError={(err) => {
          console.error(err);
          alert("Payment failed ❌");
        }}
      />
    </PayPalScriptProvider>
  );
}
