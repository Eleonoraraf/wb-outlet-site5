import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Download, LogIn, LogOut, Pencil, Plus, Trash2, Upload, Link as LinkIcon } from "lucide-react";
import FallingCoins from "./components/FallingCoins.jsx";

/**
 * WB Outlet — минимальный сайт-витрина с админкой
 */

const ADMIN_PASSWORD = "04230";
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

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
      <header style={{ position: "relative" }}>
        <div className="py-4">
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

        {/* панель админа */}
        <div className="pb-3">
          <div className="max-w-6xl mx-auto px-4 flex justify-end gap-2">
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

        {/* дождь монет */}
       <FallingCoins count={25} src="/coin.png" />
</header>

      {/* ...остальной код страницы без изменений... */}
      {/* (оставь твои фильтры/список/модалки/футер как были) */}
    </div>
  );
}
