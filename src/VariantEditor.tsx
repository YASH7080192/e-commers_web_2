import { useEffect, useState } from 'react';
export type AdminVariant = {
  _id?: string; size: string; paperQuality: string; finish: string; frame?: string;
  price: number; originalPrice?: number; stock: number; sku?: string; active?: boolean;
};
export default function VariantEditor({ initial, onChange }: { initial: AdminVariant[]; onChange?: (rows: AdminVariant[]) => void }) {
  const [rows, setRows] = useState<AdminVariant[]>(initial.length ? initial : []);
  useEffect(() => {
    setRows(initial.length ? initial : []);
  }, [initial]);

  const update = (next: AdminVariant[] | ((current: AdminVariant[]) => AdminVariant[])) => {
    setRows(current => {
      const value = typeof next === 'function' ? next(current) : next;
      onChange?.(value);
      return value;
    });
  };
  const change = (index: number, key: keyof AdminVariant, value: string | boolean) => update(old => old.map((row, i) => {
    if (i !== index) return row;
    if (key === 'active') return { ...row, active: Boolean(value) };
    if (key === 'price' || key === 'stock' || key === 'originalPrice') {
      const parsed = value === '' ? undefined : Number(value);
      return { ...row, [key]: Number.isNaN(parsed) ? undefined : parsed };
    }
    return { ...row, [key]: value };
  }));
  return <section className="variantEditor"><div className="variantEditorHead"><div><b>Variants, prices & stock</b><small>Add a separate row for each size, paper, finish or frame combination.</small></div><button type="button" className="filter" onClick={() => update(old => [...old, { size: 'A4', paperQuality: 'Matte 250 GSM', finish: 'Unframed', frame: '', price: 199, stock: 10, sku: '', active: true }])}>+ Add variant</button></div>
    {!rows.length && <div className="notice">Add at least one variant before saving.</div>}
    {rows.map((variant, index) => <div className="variantRow variantAdminRow" key={variant._id || index}>
      <label>Size<input value={variant.size} placeholder="A4 / A3 / custom" onChange={event => change(index, 'size', event.target.value)} required/></label>
      <label>Paper quality<input value={variant.paperQuality} placeholder="Matte 250 GSM" onChange={event => change(index, 'paperQuality', event.target.value)} required/></label>
      <label>Finish<input value={variant.finish} placeholder="Unframed" onChange={event => change(index, 'finish', event.target.value)} required/></label>
      <label>Frame option<input value={variant.frame || ''} placeholder="None / black frame" onChange={event => change(index, 'frame', event.target.value)}/></label>
      <label>Selling price ₹<input type="number" min="1" step="1" value={variant.price ?? ''} onChange={event => change(index, 'price', event.target.value)} required/></label>
      <label>Original price ₹<input type="number" min="1" step="1" value={variant.originalPrice ?? ''} onChange={event => change(index, 'originalPrice', event.target.value)}/></label>
      <label>Stock<input type="number" min="0" step="1" value={variant.stock ?? ''} onChange={event => change(index, 'stock', event.target.value)} required/></label>
      <label>Variant SKU<input value={variant.sku || ''} onChange={event => change(index, 'sku', event.target.value)}/></label>
      <label className="checkLabel"><input type="checkbox" checked={variant.active !== false} onChange={event => change(index, 'active', event.target.checked)}/> Active</label>
      <button type="button" className="filter variantRemove" onClick={() => update(old => old.filter((_, i) => i !== index))}>Remove variant</button>
    </div>)}
  </section>;
}
