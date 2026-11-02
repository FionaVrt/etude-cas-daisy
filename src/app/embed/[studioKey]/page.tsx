import { Suspense } from "react";
import { Widget } from "./widget";

export default function EmbedPage() {
  return (
    <Suspense fallback={null}>
      <Widget />
    </Suspense>
  );
}