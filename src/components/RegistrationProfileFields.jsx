import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, UserPlus } from "lucide-react";

const fields = [
  { key: "full_name", label: "Nome completo", type: "text", placeholder: "Seu nome completo", Icon: UserPlus },
  { key: "email", label: "Email", type: "email", placeholder: "seu@email.com", Icon: Mail },
  { key: "phone", label: "Celular", type: "tel", placeholder: "+55 (00) 00000-0000", Icon: Phone },
];

export default function RegistrationProfileFields({ profile, onChange }) {
  const update = (key, value) => onChange({ ...profile, [key]: value });
  return (
    <div className="space-y-4">
      {fields.map(({ key, label, type, placeholder, Icon }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{label}</Label>
          <div className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id={key} type={type} value={profile[key]} onChange={(e) => update(key, e.target.value)} placeholder={placeholder} className="pl-10 h-12" required />
          </div>
        </div>
      ))}

    </div>
  );
}