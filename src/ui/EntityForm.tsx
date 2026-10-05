import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import { ENT } from '../core/entities';
import type { FieldDef } from '../core/entities';
import { useAuth } from '../core/auth';
import { useApi, useCore } from '../core/store';
import { inputToIso, isoToInput, fmt } from '../lib/tz';
import { Button, Field, Input, Textarea } from './primitives';
import { Overlay } from './overlay';

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function RefSelect({ id, entity, value, onChange }: { id: string; entity: string; value: string; onChange: (v: string) => void }) {
  const { data, loading } = useApi<{ items: Rec[] }>(`/e/${entity}?limit=200&sort=updated_at:desc`);
  const def = ENT[entity];
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} disabled={loading && !data}>
      <option value="">— None —</option>
      {(data?.items ?? []).map((r) => <option key={r.id} value={r.id}>{String(def?.title(r) ?? r.title ?? r.name).slice(0, 70)}</option>)}
    </select>
  );
}

const RECUR = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

function initial(fields: FieldDef[], rec: Rec | null, defaults: Rec, tz: string): Rec {
  const v: Rec = {};
  for (const f of fields) {
    const raw = rec ? rec[f.key] : defaults[f.key];
    if (f.type === 'datetime') {
      const noTime = f.noTimeKey ? (rec ? rec[f.noTimeKey] === false : false) : false;
      v[f.key] = isoToInput(raw, tz, noTime); if (f.noTimeKey) v[f.noTimeKey] = noTime;
    } else if (f.type === 'tags') v[f.key] = Array.isArray(raw) ? raw.join(', ') : '';
    else if (f.type === 'recurrence') v[f.key] = raw ? { freq: raw.freq, interval: raw.interval ?? 1 } : { freq: 'none', interval: 1 };
    else if (f.type === 'bool') v[f.key] = !!raw;
    else v[f.key] = raw ?? '';
  }
  return v;
}

const NO_DEFAULTS: Rec = {};

/** Generic create/edit dialog for any entity, driven by core/entities.ts. Server validation errors are shown per field. */
export function EntityForm({ entity, record, defaults = NO_DEFAULTS, open, onClose, onSaved, title }: { entity: string; record?: Rec | null; defaults?: Rec; open: boolean; onClose: () => void; onSaved?: (r: Rec) => void; title?: string }) {
  const def = ENT[entity];
  const { tz } = useAuth(); const { run } = useCore();
  // `defaults` is normally an inline object literal (and used to default to a fresh `{}`), so key the
  // memo on its serialized signature: depending on the raw object identity re-ran the init effect on
  // every render, continuously resetting form state and making every field impossible to type into.
  const defaultsKey = JSON.stringify(defaults ?? {});
  const merged = useMemo(() => ({ ...def.defaults, ...defaults }), [def, defaultsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const recordId = record?.id ?? null;
  const [vals, setVals] = useState<Rec>({});
  const [errors, setErrors] = useState<Record<string, string>>({}); const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false); const [confirmDel, setConfirmDel] = useState(false); const [typed, setTyped] = useState('');
  useEffect(() => {
    if (!open) return;
    setVals(initial(def.fields, record ?? null, merged, tz));
    setErrors({}); setFormError(''); setConfirmDel(false); setTyped('');
  }, [open, recordId, def, merged, tz]); // eslint-disable-line react-hooks/exhaustive-deps -- record is read once, at init
  const set = (k: string, v: unknown) => setVals((x) => ({ ...x, [k]: v }));

  function payload() {
    const out: Rec = {};
    for (const f of def.fields) {
      const v = vals[f.key];
      if (f.type === 'datetime') { out[f.key] = v ? inputToIso(v, tz) : null; if (f.noTimeKey) out[f.noTimeKey] = !vals[f.noTimeKey]; }
      else if (f.type === 'number') out[f.key] = v === '' || v === null ? null : Number(v);
      else if (f.type === 'tags') { const parts = String(v).split(',').map((s) => s.trim()).filter(Boolean); out[f.key] = parts.length ? (f.key === 'days' ? parts.map(Number) : parts) : null; }
      else if (f.type === 'recurrence') out[f.key] = v.freq === 'none' ? null : { freq: v.freq, interval: Number(v.interval) || 1, ...(record?.recurrence?.anchor ? { anchor: record.recurrence.anchor } : {}) };
      else if (f.type === 'bool') out[f.key] = !!v;
      else out[f.key] = v === '' ? null : v;
    }
    return out;
  }
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErrors({}); setFormError('');
    try {
      const body = payload();
      const saved = record ? await api.patch<Rec>(`/e/${entity}/${record.id}`, body) : await api.post<Rec>(`/e/${entity}`, body);
      await run(async () => saved, record ? `${def.label} updated` : `${def.label} created`);
      onSaved?.(saved); onClose();
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.fields ?? {}); setFormError(err.message); } else setFormError('Could not save. Try again.');
    } finally { setBusy(false); }
  }

  async function archive() { await run(() => api.del(`/e/${entity}/${record!.id}`), `${def.label} archived`); onClose(); }
  async function hardDelete() { await run(() => api.del(`/e/${entity}/${record!.id}?permanent=1`, { 'x-confirm': 'DELETE' }), `${def.label} permanently deleted`); onClose(); }

  const fid = (k: string) => `f-${entity}-${k}`;
  return (
    <Overlay open={open} onClose={onClose} variant="dialog" title={title ?? `${record ? 'Edit' : 'New'} ${def.label.toLowerCase()}`}
      footer={<>
        {record && <Button variant="ghost" onClick={archive}>Archive</Button>}
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" form={`form-${entity}`} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
      </>}>
      <form id={`form-${entity}`} className="entity-form" onSubmit={save} noValidate>
        {formError && <div className="form-error" role="alert">{formError}</div>}
        <div className="form-grid">
          {def.fields.map((f) => {
            const id = fid(f.key); const err = errors[f.key];
            const common = { id, 'aria-invalid': !!err || undefined, 'aria-describedby': err ? `${id}-err` : undefined };
            let control;
            if (f.type === 'textarea') control = <Textarea {...common} rows={3} value={vals[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />;
            else if (f.type === 'select') control = <select {...common} className="input" value={vals[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>{!f.required && <option value="">—</option>}{f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
            else if (f.type === 'ref') control = <RefSelect id={id} entity={f.ref!} value={vals[f.key] ?? ''} onChange={(v) => set(f.key, v)} />;
            else if (f.type === 'bool') control = <label className="check-line"><input type="checkbox" checked={!!vals[f.key]} onChange={(e) => set(f.key, e.target.checked)} /> <span>Yes</span></label>;
            else if (f.type === 'number') control = <Input {...common} type="number" inputMode="numeric" min={f.min} max={f.max} step="any" value={vals[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />;
            else if (f.type === 'date') control = <Input {...common} type="date" value={vals[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />;
            else if (f.type === 'datetime') {
              const noTime = !!f.noTimeKey && !!vals[f.noTimeKey];
              control = (
                <div className="dt-field">
                  <Input {...common} type={noTime ? 'date' : 'datetime-local'} value={noTime ? String(vals[f.key] ?? '').slice(0, 10) : (vals[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} />
                  {f.noTimeKey && <label className="check-line small"><input type="checkbox" checked={noTime} onChange={(e) => { const nt = e.target.checked; setVals((x) => ({ ...x, [f.noTimeKey!]: nt, [f.key]: nt ? String(x[f.key] ?? '').slice(0, 10) : (x[f.key] ? `${String(x[f.key]).slice(0, 10)}T09:00` : '') })); }} /> <span>No specific time</span></label>}
                </div>
              );
            } else if (f.type === 'recurrence') control = (
              <div className="dt-field" style={{ gridTemplateColumns: '1fr 90px' }}>
                <select {...common} className="input" value={vals[f.key]?.freq ?? 'none'} onChange={(e) => set(f.key, { ...vals[f.key], freq: e.target.value })}>{RECUR.map((r) => <option key={r} value={r}>{r === 'none' ? 'Does not repeat' : r[0].toUpperCase() + r.slice(1)}</option>)}</select>
                <Input type="number" aria-label="Repeat every N" min={1} max={365} disabled={vals[f.key]?.freq === 'none'} value={vals[f.key]?.interval ?? 1} onChange={(e) => set(f.key, { ...vals[f.key], interval: e.target.value })} />
              </div>);
            else control = <Input {...common} type={f.type === 'url' ? 'url' : 'text'} value={vals[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} autoFocus={f === def.fields[0] && !record} data-autofocus={f === def.fields[0] ? '' : undefined} />;
            return (
              <div key={f.key} className="form-cell" data-wide={f.wide || f.type === 'textarea' ? '' : undefined}>
                <Field label={f.label + (f.required ? ' *' : '')} id={id}>{control}</Field>
                {f.help && <p className="faint small">{f.help}</p>}
                {err && <p id={`${id}-err`} className="field-err" role="alert">{err}</p>}
              </div>
            );
          })}
        </div>
        {record && (
          <div className="form-meta">
            <p className="faint small">Created {fmt.dateTime(record.created_at, tz)} · Updated {fmt.dateTime(record.updated_at, tz)}</p>
            {!confirmDel ? <button type="button" className="link small danger-link" onClick={() => setConfirmDel(true)}>Delete permanently…</button> : (
              <div className="strong-confirm">
                <label htmlFor={`del-${entity}`} className="small">This cannot be undone. Type <b>DELETE</b> to confirm.</label>
                <div style={{ display: 'flex', gap: 8 }}><Input id={`del-${entity}`} value={typed} onChange={(e) => setTyped(e.target.value)} /><Button variant="danger" disabled={typed !== 'DELETE'} onClick={hardDelete}>Delete forever</Button></div>
              </div>
            )}
          </div>
        )}
      </form>
    </Overlay>
  );
}
