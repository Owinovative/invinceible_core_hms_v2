"use client";

import * as React from "react";
import QRCode from "qrcode";

type QrCodeImageProps = {
  value: string;
  className?: string;
  alt?: string;
};

export function QrCodeImage({
  value,
  className,
  alt = "Document verification QR code",
}: QrCodeImageProps) {
  const [src, setSrc] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(value || "Invinceible Core HMS", {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 5,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    }).then((url) => {
      if (!cancelled) setSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) {
    return <div className={className} aria-label={alt} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
