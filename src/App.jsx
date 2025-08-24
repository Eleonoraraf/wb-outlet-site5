import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Download, LogIn, LogOut, Pencil, Plus, Trash2, Upload, Link as LinkIcon } from "lucide-react";

/**
 * WB Outlet — минимальный сайт-витрина с админкой
 * Смотрите комментарии вверху файла для инструкции по Supabase.
 */

// ==== НАСТРОЙКИ ====
const ADMIN_PASSWORD = "admin"; // ← ПОМЕНЯЙТЕ после деплоя
const SUPABASE_URL = "";        // ← ВСТАВЬТЕ URL проекта (например https://xxxx.supabase.co)
const SUPABASE_ANON_KEY = "";   // ← ВСТАВЬТЕ anon ключ

const USE_CLOUD = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const LS_KEY = "wboutlet_products_v1";

const CATEGORIES = [
  { value: "not-sold", label: "Нереализованное WB" },
  { value: "defect", label: "Брак" },
  { value: "swap", label: "Подмена" },
  { value: "other", label: "Другое" },
];
const STATUS = [
  { value: "available", label: "В наличии" },
  { value: "reserved", label: "Резерв" },
  { value: "sold", label: "Продано" },
];

const supabase = USE_CLOUD ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function cls(...a){ return a.filter(Boolean).join(" "); }

function saveToFile(filename, data) {
  const blob = new Blob([data], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export default function App(){
  const [admin, setAdmin] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [st, setSt] = useState("all");
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);

  // LOAD
  useEffect(() => { (async () => {
    try {
      setLoading(true);
      if (USE_CLOUD){
        const { data, error } = await supabase.from('products').select('*').order('createdAt', { ascending: false });
        if (error) throw error;
        setItems(data || []);
        localStorage.setItem(LS_KEY, JSON.stringify(data || []));
      } else {
        const raw = localStorage.getItem(LS_KEY);
        setItems(raw ? JSON.parse(raw) : []);
      }
    } catch (e){ setError("Не удалось загрузить каталог"); }
    finally { setLoading(false); }
  })(); }, []);

  // deep link ?id=
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    const p = items.find(x=>x.id===id);
    if (p) setSelected(p);
  }, [items]);

  // FILTERS
  const filtered = useMemo(() => {
    let list = [...items];
    const q = query.trim().toLowerCase();
    if (q){ list = list.filter(p => (
      [p.title, p.description, p.sku, p.size, p.color, p.wbLink, ...(p.tags||[])]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    )); }
    if (cat !== 'all') list = list.filter(p=>p.category===cat);
    if (st !== 'all') list = list.filter(p=>p.status===st);
    const min = parseFloat(minP||""); const max = parseFloat(maxP||"");
    if (!isNaN(min)) list = list.filter(p=>Number(p.price) >= min);
    if (!isNaN(max)) list = list.filter(p=>Number(p.price) <= max);
    return list;
  }, [items, query, cat, st, minP, maxP]);

  // HELPERS
  function price(p){ return Number(p||0).toLocaleString('ru-RU'); }
  function statusBadge(s){
    const map = { available: 'bg-emerald-100 text-emerald-700', reserved: 'bg-amber-100 text-amber-700', sold: 'bg-rose-100 text-rose-700' };
    const label = (STATUS.find(x=>x.value===s)||{}).label || s;
    return <span className={cls('px-2 py-0.5 rounded-full text-xs', map[s])}>{label}</span>;
  }
  function shareLink(id){ const url = new URL(window.location.href); url.searchParams.set('id', id); navigator.clipboard.writeText(url.toString()); alert('Ссылка скопирована'); }

  // CRUD
  async function upsertProduct(p){
    p.updatedAt = Date.now();
    if (USE_CLOUD){
      const { error } = await supabase.from('products').upsert(p);
      if (error) { alert('Ошибка сохранения'); return; }
      const { data } = await supabase.from('products').select('*').order('createdAt', { ascending:false });
      setItems(data||[]);
    } else {
      setItems(prev => {
        const i = prev.findIndex(x=>x.id===p.id);
        const next = i===-1 ? [p, ...prev] : prev.map(x=>x.id===p.id? p : x);
        localStorage.setItem(LS_KEY, JSON.stringify(next));
        return next;
      });
    }
    setSheetOpen(false); setEditing(null);
  }
  async function removeProduct(id){
    if (!confirm('Удалить товар?')) return;
    if (USE_CLOUD){
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error){ alert('Ошибка удаления'); return; }
      setItems(prev => prev.filter(x=>x.id!==id));
    } else {
      setItems(prev => { const next = prev.filter(x=>x.id!==id); localStorage.setItem(LS_KEY, JSON.stringify(next)); return next; });
    }
    setSelected(null);
  }

  function exportJSON(){ saveToFile(`wboutlet-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(items, null, 2)); }
  function importJSON(replace=false){
    const input = document.createElement('input'); input.type='file'; input.accept='application/json';
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return; const text = await f.text();
      try{ const arr = JSON.parse(text); if (!Array.isArray(arr)) throw 0; 
        if (USE_CLOUD){
          for (const p of arr){ await upsertProduct(p); }
        } else {
          const next = replace ? arr : [...arr, ...items];
          localStorage.setItem(LS_KEY, JSON.stringify(next)); setItems(next);
        }
        alert('Импортировано');
      } catch{ alert('Неверный JSON'); }
    };
    input.click();
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
    <header className="sticky top-0 z-40">
  {/* Светло-фиолетовый фон + слой монет */}
  <div className="relative" style={{ background: "#EDE9FE" }}>
    {/* монетки (20 штук с разными скоростями) */}
    <div className="coins-layer">
      {Array.from({ length: 20 }).map((_, i) => (
        <img
          key={i}
          src="/coin.png"
          alt=""
          className="coin"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${8 + Math.random() * 6}s, ${3 + Math.random() * 2.5}s`,
            animationDelay: `${Math.random() * 4}s, ${Math.random() * 2}s`
          }}
        />
      ))}
    </div>
      <img
      src="/coin.png"
      alt="test"
      style={{ position: "absolute", top: 20, left: 20, width: 80, zIndex: 20 }}
    />
    {/* Верхняя полоса: название + бейджи (поверх монет) */}
    <div className="py-4 relative z-10">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="text-2xl font-extrabold tracking-tight text-black">
          Outlet • WB
        </div>
        <div className="flex flex-col sm:flex-row gap-2 text-sm font-semibold uppercase tracking-wide text-black">
          <span className="px-3 py-1 rounded bg-white/70">распродажа</span>
          <span className="px-3 py-1 rounded bg-white/70">
            {USE_CLOUD ? "облако: Supabase" : "локальный режим"}
          </span>
        </div>
      </div>
    </div>

    {/* Вторая полоса: админ-кнопки (поверх монет) */}
    <div className="max-w-6xl mx-auto px-4 pb-3 flex justify-end relative z-10">
      {!admin ? (
        <button
          className="text-sm border border-black/20 bg-white/70 text-black px-3 py-1.5 rounded-md inline-flex items-center gap-2"
          onClick={() => {
            const p = prompt("Пароль админа");
            if (p === ADMIN_PASSWORD) { setAdmin(true); localStorage.setItem("admin","1"); }
            else alert("Неверный пароль");
          }}
        >
          <LogIn size={16}/> Войти как админ
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            className="text-sm border border-black/20 bg-white/70 text-black px-3 py-1.5 rounded-md inline-flex items-center gap-2"
            onClick={() => { setEditing(null); setSheetOpen(true); }}
          >
            <Plus size={16}/> Добавить
          </button>

          <div className="relative group">
            <button className="text-sm border border-black/20 bg-white/70 text-black px-3 py-1.5 rounded-md inline-flex items-center gap-2">
              <Download size={16}/> Экспорт/Импорт
            </button>
            <div className="absolute right-0 mt-1 hidden group-hover:block bg-white/90 border border-black/20 rounded-md shadow text-sm">
              <button className="block w-full text-left px-3 py-1.5 hover:bg-black/5" onClick={exportJSON}>
                <Download size={14} className="inline mr-1"/> Экспорт JSON
              </button>
              <button className="block w-full text-left px-3 py-1.5 hover:bg-black/5" onClick={() => importJSON(false)}>
                <Upload size={14} className="inline mr-1"/> Импорт (добавить)
              </button>
              <button className="block w-full text-left px-3 py-1.5 hover:bg-black/5" onClick={() => importJSON(true)}>
                <Upload size={14} className="inline mr-1"/> Импорт (заменить)
              </button>
            </div>
          </div>

          <button
            className="text-sm border border-black/20 bg-white/70 text-black px-2 py-1.5 rounded-md"
            onClick={() => { setAdmin(false); localStorage.removeItem("admin"); }}
          >
            <LogOut size={16}/>
          </button>
        </div>
      )}
    </div>
  </div>
</header>

      <div className="max-w-6xl mx-auto px-4 py-4 grid gap-2 md:flex md:items-end md:gap-3">
        <div className="flex-1">
          <label className="text-xs text-slate-500">Поиск</label>
          <input className="mt-1 w-full border rounded-md px-3 py-2" placeholder="Название, артикул, теги..." value={query} onChange={e=>setQuery(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Категория</label>
          <select className="mt-1 border rounded-md px-3 py-2" value={cat} onChange={e=>setCat(e.target.value)}>
            <option value="all">Все</option>
            {CATEGORIES.map(c=> <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Статус</label>
          <select className="mt-1 border rounded-md px-3 py-2" value={st} onChange={e=>setSt(e.target.value)}>
            <option value="all">Все</option>
            {STATUS.map(s=> <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Цена от</label>
          <input className="mt-1 w-28 border rounded-md px-3 py-2" type="number" value={minP} onChange={e=>setMinP(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Цена до</label>
          <input className="mt-1 w-28 border rounded-md px-3 py-2" type="number" value={maxP} onChange={e=>setMaxP(e.target.value)} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-10">
        {loading ? (
          <div className="py-20 text-center text-slate-500">Загрузка...</div>
        ) : error ? (
          <div className="py-20 text-center text-rose-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-500">Нет товаров.
            {admin && <div className="mt-4"><button className="border rounded-md px-3 py-2" onClick={()=>{ setEditing(null); setSheetOpen(true); }}>Добавить первый товар</button></div>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(p => (
              <div key={p.id} className="group border rounded-xl overflow-hidden">
                <div className="relative">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} className="w-full aspect-square object-cover"/>
                  ) : (
                    <div className="w-full aspect-square grid place-items-center bg-slate-100 text-slate-400">Нет фото</div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-white/90 border">{CATEGORIES.find(c=>c.value===p.category)?.label}</span>
                    {statusBadge(p.status)}
                  </div>
                  {admin && (
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button className="bg-white/90 border rounded-md p-2" onClick={()=>{ setEditing(p); setSheetOpen(true); }}><Pencil size={16}/></button>
                      <button className="bg-white/90 border rounded-md p-2" onClick={()=>removeProduct(p.id)}><Trash2 size={16}/></button>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-semibold truncate" title={p.title}>{p.title}</div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold">{price(p.price)} ₽</div>
                      {p.oldPrice ? <div className="text-slate-400 line-through">{price(p.oldPrice)} ₽</div> : null}
                    </div>
                    <button className="text-sm border px-3 py-1.5 rounded-md" onClick={()=>setSelected(p)}>Подробнее</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center" onClick={()=>setSheetOpen(false)}>
          <div className="bg-white w-[min(680px,95vw)] max-h-[90vh] overflow-auto rounded-2xl p-5" onClick={e=>e.stopPropagation()}>
            <div className="text-xl font-semibold mb-4">{editing? 'Редактировать товар' : 'Новый товар'}</div>
            <ProductForm initial={editing} onSave={upsertProduct} onCancel={()=>setSheetOpen(false)} onDelete={(id)=>{ removeProduct(id); setSheetOpen(false); }} />
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center" onClick={()=>setSelected(null)}>
          <div className="bg-white w-[min(900px,95vw)] max-h-[90vh] overflow-auto rounded-2xl p-5" onClick={e=>e.stopPropagation()}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                {selected.images?.[0] ? (
                  <img src={selected.images[0]} alt={selected.title} className="w-full aspect-square object-cover rounded-xl"/>
                ) : <div className="w-full aspect-square grid place-items-center bg-slate-100 text-slate-400 rounded-xl">Нет фото</div>}
                <div className="flex gap-2 mt-2 overflow-auto">
                  {(selected.images||[]).slice(1).map((src,i)=> (
                    <img key={i} src={src} className="w-20 h-20 object-cover rounded-md border cursor-pointer" onClick={()=>{
                      const next = {...selected};
                      const main = next.images[0]; next.images[0] = src; next.images[i+1] = main; setSelected(next);
                    }}/>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-slate-100">{CATEGORIES.find(c=>c.value===selected.category)?.label}</span>
                  {statusBadge(selected.status)}
                </div>
                <div className="text-2xl font-semibold">{selected.title}</div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-semibold">{price(selected.price)} ₽</div>
                  {selected.oldPrice ? <div className="text-slate-400 line-through">{price(selected.oldPrice)} ₽</div> : null}
                </div>
                <p className="text-sm whitespace-pre-wrap text-slate-600">{selected.description}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selected.sku && <div><span className="text-slate-500">Артикул:</span> {selected.sku}</div>}
                  {selected.size && <div><span className="text-slate-500">Размер:</span> {selected.size}</div>}
                  {selected.color && <div><span className="text-slate-500">Цвет:</span> {selected.color}</div>}
                  {selected.wbLink && <div className="truncate"><a className="underline" href={selected.wbLink} target="_blank" rel="noreferrer">Ссылка WB</a></div>}
                </div>
                <div className="flex items-center gap-2">
                  <button className="border rounded-md px-3 py-1.5 inline-flex items-center gap-2" onClick={()=>shareLink(selected.id)}><LinkIcon size={16}/>Поделиться</button>
                  {true && <>
                    <button className="border rounded-md px-3 py-1.5" onClick={()=>{ setEditing(selected); setSheetOpen(true); }}>Редактировать</button>
                    <button className="border rounded-md px-3 py-1.5" onClick={()=>removeProduct(selected.id)}>Удалить</button>
                  </>}
                </div>
                <div className="text-xs text-slate-500">Обновлено: {selected.updatedAt? new Date(selected.updatedAt).toLocaleString('ru-RU') : '—'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t mt-10 py-8 text-sm text-slate-500">
        <div className="max-w-6xl mx-auto px-4 grid gap-2 md:flex md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} Outlet • WB — частная распродажа нереализованных товаров, брака и подмен.</div>
          <div>Контакты для заказа: добавьте ссылки на WhatsApp/Telegram в шапку (админ-режим).</div>
        </div>
      </footer>
    </div>
  );
}

function ProductForm({ initial, onSave, onCancel, onDelete }){
  const [f, setF] = useState(() => initial || ({
    id: uid(), title: '', description: '', category: 'not-sold', status: 'available', price: 0, oldPrice: '', sku: '', size: '', color: '', wbLink: '', images: [], tags: [], createdAt: Date.now(), updatedAt: Date.now()
  }));
  const [imgText, setImgText] = useState((initial?.images||[]).join('\\n'));
  const [tagsText, setTagsText] = useState((initial?.tags||[]).join(', '));

  function set(k,v){ setF(prev=>({...prev,[k]:v})); }
  function submit(e){ e.preventDefault();
    const images = imgText.split(/\\n|,/).map(s=>s.trim()).filter(Boolean);
    const tags = tagsText.split(/,|\\n/).map(s=>s.trim()).filter(Boolean);
    const payload = { ...f, images, tags, price: Number(f.price), oldPrice: f.oldPrice ? Number(f.oldPrice) : undefined };
    if (!payload.title) return alert('Введите название');
    if (!payload.price || payload.price < 0) return alert('Цена некорректна');
    onSave(payload);
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <div>
        <div className="text-xs text-slate-500 mb-1">Название*</div>
        <input className="w-full border rounded-md px-3 py-2" value={f.title} onChange={e=>set('title', e.target.value)} placeholder="Например: Пуховик женский"/>
      </div>
      <div>
        <div className="text-xs text-slate-500 mb-1">Описание</div>
        <textarea className="w-full border rounded-md px-3 py-2" rows={4} value={f.description} onChange={e=>set('description', e.target.value)} placeholder="Состояние, комплектация, замеры, нюансы брака и т.п."/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Категория</div>
          <select className="w-full border rounded-md px-3 py-2" value={f.category} onChange={e=>set('category', e.target.value)}>
            {CATEGORIES.map(c=> <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Статус</div>
          <select className="w-full border rounded-md px-3 py-2" value={f.status} onChange={e=>set('status', e.target.value)}>
            {STATUS.map(s=> <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Цена, ₽*</div>
          <input className="w-full border rounded-md px-3 py-2" type="number" value={f.price} onChange={e=>set('price', e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Старая цена, ₽</div>
          <input className="w-full border rounded-md px-3 py-2" type="number" value={f.oldPrice} onChange={e=>set('oldPrice', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Артикул / SKU</div>
          <input className="w-full border rounded-md px-3 py-2" value={f.sku} onChange={e=>set('sku', e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Размер</div>
          <input className="w-full border rounded-md px-3 py-2" value={f.size} onChange={e=>set('size', e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Цвет</div>
          <input className="w-full border rounded-md px-3 py-2" value={f.color} onChange={e=>set('color', e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Ссылка на товар в WB</div>
          <input className="w-full border rounded-md px-3 py-2" value={f.wbLink} onChange={e=>set('wbLink', e.target.value)} placeholder="https://www.wildberries.ru/..."/>
        </div>
      </div>
      <div>
        <div className="text-xs text-slate-500 mb-1">Фотографии (URL, по одному в строке или через запятую)</div>
        <textarea className="w-full border rounded-md px-3 py-2" rows={4} value={imgText} onChange={e=>setImgText(e.target.value)} placeholder={'https://...jpg\nhttps://...png'} />
        <div className="text-xs text-slate-500">Совет: загрузите фото на любой хостинг картинок (Google Диск, Imgur и т.п.) и вставьте ссылки.</div>
      </div>
      <div>
        <div className="text-xs text-slate-500 mb-1">Теги (через запятую)</div>
        <input className="w-full border rounded-md px-3 py-2" value={tagsText} onChange={e=>setTagsText(e.target.value)} placeholder="зима, пуховик, XS"/>
      </div>
      <div className="flex justify-between items-center mt-2">
        {initial && <button type="button" className="text-rose-600" onClick={()=>onDelete(initial.id)}><Trash2 className="inline mr-1" size={16}/>Удалить</button>}
        <div className="ml-auto flex gap-2">
          <button type="button" className="border rounded-md px-3 py-1.5" onClick={onCancel}>Отмена</button>
          <button type="submit" className="border rounded-md px-3 py-1.5 bg-slate-900 text-white">Сохранить</button>
        </div>
      </div>
    </form>
  );
}
