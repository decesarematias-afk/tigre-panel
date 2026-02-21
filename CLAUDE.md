# TIGRE - Panel de Gestión para Cruz Barber Studio

## Stack
- React 19 + TypeScript + Vite 7
- Tailwind CSS v4 (CSS-first config, @theme inline)
- shadcn/ui (new-york style, sin RSC)
- Supabase (auth + DB + realtime)
- FullCalendar v6 (React)
- React Router v7 (imports from "react-router")
- react-hook-form + zod

## Convenciones
- UI en español argentino con voseo
- Mobile-first responsive
- Colores: negro #1A1A1A, dorado #B8860B, rojo #8B0000, fondo #f5f5f5
- Fuentes: Georgia (headings), Inter (body)
- Supabase client sin generic Database (se castean resultados)
- Turnos por color: pendiente=amarillo, confirmado=azul, completado=verde, cancelado=rojo

## Para correr
```bash
npm install
npm run dev
```

## Para Supabase
1. Crear proyecto en supabase.com
2. Copiar URL y anon key a .env.local
3. Ejecutar supabase/migrations/001_initial_schema.sql en SQL Editor
4. Crear usuario en Auth (juan@cruzbarber.com)
5. Ejecutar supabase/seed.sql (reemplazar USER_UUID_AQUI)
