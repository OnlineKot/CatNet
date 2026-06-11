# Catagram — wspólna tablica (Supabase)

Catagram działa w dwóch trybach:

- **Lokalny** (domyślnie, gdy klucze są puste) — posty zapisują się tylko w przeglądarce danej osoby.
- **Wspólny / chmura** — po wklejeniu kluczy Supabase wszyscy widzą te same koty.

Poniżej **3 kroki**, żeby włączyć tryb wspólny. Wszystko poza tym jest już zakodowane.

---

## Krok 1 — załóż projekt Supabase (~2 min)

1. Wejdź na **https://supabase.com** → **Start your project** (zaloguj się przez GitHub lub Google).
2. **New project** → nazwa np. `catnet`, ustaw hasło do bazy (zapisz je gdzieś), region najbliżej Ciebie (np. *Central EU*).
3. Poczekaj ~1 min, aż projekt się utworzy.

## Krok 2 — utwórz tabelę, bucket i reguły dostępu

W panelu Supabase otwórz **SQL Editor** → **New query**, wklej poniższe i kliknij **Run**:

```sql
-- Tabela postów
create table if not exists public.catagram_posts (
  id uuid primary key default gen_random_uuid(),
  author text,
  caption text,
  image_url text not null,
  image_path text,
  likes int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.catagram_posts enable row level security;

-- Otwarty dostęp (projekt bez logowania). Każdy może czytać/dodawać/lajkować/usuwać.
create policy "cg read"   on public.catagram_posts for select using (true);
create policy "cg insert" on public.catagram_posts for insert with check (true);
create policy "cg update" on public.catagram_posts for update using (true) with check (true);
create policy "cg delete" on public.catagram_posts for delete using (true);
```

Następnie utwórz **publiczny bucket na zdjęcia**:

1. Menu **Storage** → **New bucket** → nazwa dokładnie `catagram` → zaznacz **Public bucket** → **Create**.
2. Wróć do **SQL Editor**, uruchom jeszcze to (pozwala wysyłać i kasować pliki kluczem publicznym):

```sql
create policy "cg files read"   on storage.objects for select using (bucket_id = 'catagram');
create policy "cg files insert" on storage.objects for insert with check (bucket_id = 'catagram');
create policy "cg files delete" on storage.objects for delete using (bucket_id = 'catagram');
```

## Krok 3 — wklej klucze do strony

1. W Supabase: **Project Settings** (⚙️) → **API**.
2. Skopiuj **Project URL** oraz **anon public** key.
3. Otwórz `script.js` i uzupełnij (szukaj `SUPABASE_URL`):

```js
const SUPABASE_URL = "https://twoj-projekt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGci...twoj-anon-key...";
```

Gotowe — po odświeżeniu Catagram działa jako **wspólna tablica**. 🐾

---

## Uwagi

- Klucz **anon** jest przeznaczony do użytku w przeglądarce — to bezpieczne, o ile reguły RLS są ustawione jak wyżej.
- Projekt jest bez logowania, więc dostęp jest otwarty (każdy może dodać/usunąć post). Przycisk „usuń" w UI pokazuje się tylko przy własnych postach, ale technicznie każdy z kluczem mógłby usuwać — to świadomy kompromis dla zabawowej tablicy. Jeśli kiedyś zechcesz moderację/logowanie, da się dołożyć.
- Darmowy plan Supabase: 500 MB bazy + 1 GB Storage + 5 GB transferu — w zupełności wystarczy na kocią tablicę.
