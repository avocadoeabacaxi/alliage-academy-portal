import React from "react";

const LOGO_URL = "https://media.base44.com/images/public/6a3bbaf52679642f9d0e9feb/4a16a00af_CapturadeTela2026-06-26as152625.png";

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