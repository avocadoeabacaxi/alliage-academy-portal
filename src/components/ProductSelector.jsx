import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Plus, Trash2, Package } from 'lucide-react';

export const BRAND_OPTIONS = {
  'Extraoral': ['Eagle Edge', 'Saevo', 'PreXion', 'Outro'],
  'Scanner Intraoral': ['Dabi', 'PreXion', 'Outro'],
  'Software': ['Eagle Eye / Saevo Image / PreXion Image', 'OnDemand3D', 'Outro'],
  'Consultórios': ['Dabi', 'Saevo', 'D700', 'Denimed', 'Outro'],
  'Raios X': ['Dabi', 'Saevo', 'Outro'],
  'Raios X portátil': ['Dabi', 'Saevo', 'PreXion', 'Outro'],
  'Sensor intraoral': ['Dabi', 'Saevo', 'PreXion', 'Outro'],
  'Periféricos': ['Dabi', 'Saevo', 'Denimed', 'Outro'],
  'Eagle PS': [],
  'Peças de mão': ['Dabi', 'Saevo', 'Outro'],
  'Outro': ['Dabi', 'Saevo', 'PreXion', 'Outro'],
};

const emptyProduct = () => ({ category: 'Extraoral', brand: '', brand_detail: '' });

// Resolve o nome final do produto (marca escolhida ou categoria quando não há marcas)
export function resolveProductName(p) {
  const brands = BRAND_OPTIONS[p.category] || [];
  if (brands.length === 0) return p.category;
  if (p.brand === 'Outro') return p.brand_detail || p.category;
  return p.brand || p.category;
}

export default function ProductSelector({ products = [], onChange }) {
  const { t } = useLanguage();

  const list = products.length > 0 ? products : [emptyProduct()];

  const update = (index, changes) => {
    const next = list.map((p, i) => (i === index ? { ...p, ...changes } : p));
    onChange(next);
  };

  const add = () => onChange([...list, emptyProduct()]);
  const remove = (index) => onChange(list.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {list.map((p, i) => {
        const brands = BRAND_OPTIONS[p.category] || [];
        return (
          <div key={i} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#00A6D6]" />
                {t('form.product')} {i + 1}
              </span>
              {list.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <label className="block text-xs font-medium text-slate-600 mb-1">{t('form.productCategory')}</label>
            <select
              value={p.category}
              onChange={(e) => update(i, { category: e.target.value, brand: '', brand_detail: '' })}
              className="input-base mb-3"
            >
              {Object.keys(BRAND_OPTIONS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            {brands.length > 0 && (
              <>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('form.productBrand')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {brands.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => update(i, { brand, brand_detail: brand === 'Outro' ? p.brand_detail : '' })}
                      className={`px-3 py-2 text-sm rounded-lg border text-left transition-all ${p.brand === brand ? 'border-[#00A6D6] bg-[#00A6D6]/10 text-[#003B5C] font-medium' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
                {p.brand === 'Outro' && (
                  <input
                    value={p.brand_detail || ''}
                    onChange={(e) => update(i, { brand_detail: e.target.value })}
                    className="input-base mt-2"
                    placeholder={t('form.productNameDetailPlaceholder')}
                  />
                )}
              </>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#00A6D6] border border-dashed border-[#00A6D6]/40 rounded-lg hover:bg-[#00A6D6]/5 transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" />
        {t('form.addProduct')}
      </button>
    </div>
  );
}