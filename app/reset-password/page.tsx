"use client";

import { Suspense } from "react";
import ResetPasswordInner from "./ResetPasswordInner";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Betöltés...</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
