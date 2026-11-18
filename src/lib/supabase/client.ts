import { createClient } from "@supabase/supabase-js";

/** Cliente con la clave PUBLISHABLE: seguro en el navegador (solo lectura por RLS). */
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
