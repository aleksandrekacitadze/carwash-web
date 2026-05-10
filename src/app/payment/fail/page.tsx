"use client";

import {
  Suspense,
} from "react";

import PaymentFailContent from "./PaymentFailContent";

export default function Page() {
  return (
    <Suspense>
      <PaymentFailContent />
    </Suspense>
  );
}