import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { isValidEmail, isValidPhone, emailHint, phoneHint } from '@/lib/validation';

export default function ValidatedInput({ kind = 'email', value = '', onChange, placeholder, className = '' }) {
  const { lang } = useLanguage();
  const [touched, setTouched] = useState(false);
  const check = kind === 'phone' ? isValidPhone : isValidEmail;
  const invalid = touched && value.trim().length > 0 && !check(value);
  return (
    <div>
      <input
        type={kind === 'phone' ? 'tel' : 'email'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        className={`input-base ${invalid ? 'border-red-400 focus:border-red-400' : ''} ${className}`}
      />
      {invalid && <p className="text-xs text-red-500 mt-1">{kind === 'phone' ? phoneHint(lang) : emailHint(lang)}</p>}
    </div>
  );
}