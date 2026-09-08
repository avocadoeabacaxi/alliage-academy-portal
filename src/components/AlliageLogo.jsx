import React from "react";

const LOGO_URL = "/assets/alliage-training.png";

export default function AlliageLogo({ className = "", imgClassName = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={LOGO_URL}
        alt="Alliage Training & Education"
        className={imgClassName || "h-12 w-auto"}
      />
    </div>
  );
}
