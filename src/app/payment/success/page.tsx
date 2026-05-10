"use client";

import {
  Suspense,
} from "react";

import PaymentSuccessContent from "./PaymentSuccessContent";

export default function Page() {
  return (
    <Suspense>
      <PaymentSuccessContent />
    </Suspense>
  );
}