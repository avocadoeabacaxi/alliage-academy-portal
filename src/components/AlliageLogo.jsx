import React from "react";

const LOGO_URL = "https://media.base44.com/images/public/6a3bbaf52679642f9d0e9feb/3f49984b2_logotraininnniinin.png";

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