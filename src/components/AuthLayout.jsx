import React from "react";

const LOGO_URL = "https://media.base44.com/images/public/6a3bbaf52679642f9d0e9feb/ecfb855b4_alliagi.png";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <img
              src={LOGO_URL}
              alt="Alliage Training & Education"
              className="h-14 w-auto"
            />
          </div>
          {Icon && (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
              <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="text-white/70 mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-white/70 mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}