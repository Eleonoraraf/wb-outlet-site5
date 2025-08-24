# Outlet • WB (витрина с админкой)

## Запуск локально
```bash
npm i
npm run dev
```

## Облако (по желанию)
1. Создайте проект в Supabase, создайте таблицу `products` (SQL в комментарии в `src/App.jsx`).
2. Вставьте `SUPABASE_URL` и `SUPABASE_ANON_KEY` в `src/App.jsx`.
3. Задеплойте на Vercel/Netlify.

## Деплой
- **Vercel**: New Project → импортируйте репозиторий → Build Command: `npm run build`, Output: `dist`.
- **Netlify**: New site from Git → `npm run build` / `dist`.
