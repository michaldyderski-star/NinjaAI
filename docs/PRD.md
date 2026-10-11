# PRD — NinjaAI: Planer rocznego budżetu marketingowego (aplikacja web)

| | |
|---|---|
| **Status** | Draft v0.1 |
| **Data** | 2026-10-11 |
| **Właściciel** | Michał Dyderski |
| **Typ produktu** | Aplikacja webowa (responsywna, desktop + mobile) |

---

## 1. Podsumowanie

NinjaAI to aplikacja webowa, w której użytkownik podaje **roczny budżet marketingowy**, a następnie
**samodzielnie rozdziela go procentowo** na kanały: **Social media, WWW, Radio, TV, Billboard, Gazeta**.
Dla każdego kanału wpisuje też **spodziewany % zwrotu (ROI)**. Aplikacja na bieżąco przelicza kwoty
na kanał, oczekiwany zwrot w złotówkach, łączny zwrot z całego budżetu oraz ważony ROI portfela,
i prezentuje wyniki w tabeli i na wykresach.

## 2. Problem

Osoby planujące marketing (właściciele małych firm, marketerzy, freelancerzy) rozdzielają budżet
w arkuszach kalkulacyjnych albo „na oko”. Skutki:

- łatwo o błąd — podział nie sumuje się do 100%, formuły się rozjeżdżają,
- trudno szybko porównać scenariusze („co jeśli przesunę 10% z TV do social media?”),
- brak czytelnej wizualizacji, którą można pokazać szefowi lub klientowi.

## 3. Cele i metryki sukcesu

| Cel | Metryka | Wartość docelowa (MVP) |
|---|---|---|
| Szybkie stworzenie planu | Czas od wejścia do kompletnego planu (100% rozdzielone) | < 2 min (mediana) |
| Poprawność | Plany zapisane z sumą ≠ 100% | 0 (blokada walidacją) |
| Użyteczność | Odsetek sesji, w których użytkownik zmienił podział ≥ 2 razy (eksploracja scenariuszy) | ≥ 40% |
| Wartość wyniku | Odsetek planów wyeksportowanych (PDF/CSV) lub zapisanych | ≥ 25% |

### Poza zakresem (non-goals) w MVP
- Integracje z systemami reklamowymi (Meta Ads, Google Ads) i pobieranie rzeczywistych wyników.
- Automatyczne rekomendacje podziału budżetu przez AI (kandydat na v2 — patrz §10).
- Planowanie miesięczne / harmonogram kampanii.
- Wielowalutowość (MVP: PLN).

## 4. Użytkownicy docelowi

| Persona | Opis | Potrzeba |
|---|---|---|
| **Właściciel małej firmy** | Sam decyduje o marketingu, nie jest analitykiem | Prosty formularz, jasny wynik „ile wydam i ile może wrócić” |
| **Marketer / specjalista** | Przygotowuje plan dla przełożonego | Szybkie porównanie wariantów, eksport do prezentacji |
| **Agencja / freelancer** | Przygotowuje propozycję dla klienta | Kilka planów, czytelny raport do wysłania |

## 5. Historyjki użytkownika

1. Jako użytkownik chcę **wpisać roczny budżet** (np. 120 000 zł), aby na jego podstawie planować wydatki.
2. Jako użytkownik chcę **przypisać % budżetu** do każdego z kanałów: Social media, WWW, Radio, TV, Billboard, Gazeta.
3. Jako użytkownik chcę **widzieć na bieżąco**, ile procent zostało do rozdzielenia (lub o ile przekroczyłem 100%).
4. Jako użytkownik chcę **wpisać spodziewany % zwrotu** dla każdego kanału.
5. Jako użytkownik chcę **zobaczyć kwotę w zł, oczekiwany zwrot w zł i wartość końcową** dla każdego kanału oraz sumy dla całego budżetu.
6. Jako użytkownik chcę **zobaczyć wykres** podziału budżetu i porównanie zwrotów między kanałami.
7. Jako użytkownik chcę **zapisać plan** i wrócić do niego później.
8. Jako użytkownik chcę **porównać 2–3 scenariusze** podziału obok siebie.
9. Jako użytkownik chcę **wyeksportować plan** do PDF/CSV.

## 6. Wymagania funkcjonalne

### 6.1 Budżet roczny
- **FR-1** Pole „Roczny budżet” — liczba dodatnia, waluta PLN, maks. 2 miejsca po przecinku.
- **FR-2** Formatowanie z separatorem tysięcy przy wyświetlaniu (`120 000,00 zł`), akceptacja wpisu z przecinkiem lub kropką.
- **FR-3** Opcjonalne pola: nazwa planu, rok, którego dotyczy plan.

### 6.2 Kanały i podział procentowy
- **FR-4** Stała lista kanałów w MVP: **Social media, WWW, Radio, TV, Billboard, Gazeta**.
- **FR-5** Dla każdego kanału pole „% budżetu” — liczba 0–100, maks. 2 miejsca po przecinku. Wartość domyślna: 0.
- **FR-6** Alternatywnie użytkownik może wpisać **kwotę w zł** — aplikacja przelicza ją na % (i odwrotnie). Źródłem prawdy jest %.
- **FR-7** Licznik „Rozdzielono: X% / 100%” oraz „Pozostało: Y% (Z zł)”, aktualizowany na żywo.
- **FR-8** Walidacja sumy:
  - suma < 100% → ostrzeżenie (żółte), plan można zapisać jako *szkic*,
  - suma = 100% → stan poprawny (zielony),
  - suma > 100% → błąd (czerwony), zapis jako plan finalny i eksport zablokowane.
- **FR-9** Przycisk „Rozdziel resztę równo” — dzieli pozostały % równo między kanały z wartością 0 (lub wszystkie, jeśli brak takich).
- **FR-10** Przycisk „Wyzeruj podział”.

### 6.3 Spodziewany zwrot (ROI)
- **FR-11** Dla każdego kanału pole „Spodziewany % zwrotu” — liczba od **0** do **10 000**, maks. 2 miejsca po przecinku. Wartość domyślna: 0.
- **FR-12** Definicja (wyświetlana w tooltipie): *% zwrotu = kwota, która wraca z inwestycji ÷ wydana kwota × 100%*. **Wartość końcowa = zwrot − kwota zainwestowana** (zysk lub strata netto). Przykład: 150% przy wydatku 10 000 zł oznacza zwrot 15 000 zł i wartość końcową 5000 zł; 40% oznacza zwrot 4000 zł i wartość końcową −6000 zł.

### 6.4 Obliczenia
Dla budżetu `B`, udziału kanału `p_i` (%) i ROI kanału `r_i` (%):

| Wielkość | Wzór |
|---|---|
| Kwota na kanał | `K_i = B × p_i / 100` |
| Oczekiwany zwrot kanału | `Z_i = K_i × r_i / 100` |
| Wartość końcowa kanału (zwrot − kwota zainwestowana) | `W_i = Z_i − K_i` |
| Łączna wydana kwota | `K = Σ K_i` |
| Łączny oczekiwany zwrot | `Z = Σ Z_i` |
| Łączna wartość końcowa | `W = Z − K` |
| Ważony ROI planu | `ROI = Z / K × 100%` (gdy `K > 0`) |
| Udział kanału w łącznym zwrocie | `Z_i / Z × 100%` (gdy `Z ≠ 0`) |

- **FR-13** Wszystkie wartości przeliczają się natychmiast po zmianie dowolnego pola (bez przycisku „Oblicz”).
- **FR-14** Obliczenia w arytmetyce dziesiętnej / na groszach (bez błędów zmiennoprzecinkowych), zaokrąglenie do 0,01 zł tylko przy wyświetlaniu.
- **FR-15** Wyróżnienie kanału z najwyższym i najniższym ROI.

### 6.5 Prezentacja wyników
- **FR-16** Tabela: Kanał | % budżetu | Kwota | ROI % | Zwrot (zł) | Wartość końcowa — z wierszem sumy.
- **FR-17** Wykres kołowy/pierścieniowy podziału budżetu na kanały.
- **FR-18** Wykres słupkowy: kwota wydana vs. oczekiwany zwrot dla każdego kanału.
- **FR-19** Karty KPI: Budżet, Łączny zwrot, Wartość końcowa, Ważony ROI.

### 6.6 Zapisywanie i scenariusze
- **FR-20** MVP: zapis planów lokalnie w przeglądarce (bez konta). Lista zapisanych planów z możliwością otwarcia, zduplikowania, zmiany nazwy i usunięcia.
- **FR-21** Porównanie do 3 scenariuszy obok siebie (tabela różnic: kwota, zwrot, ważony ROI).
- **FR-22** (v1.1) Konto użytkownika (e-mail / Google) i synchronizacja planów w chmurze.

### 6.7 Eksport
- **FR-23** Eksport do **CSV** (tabela kanałów + sumy).
- **FR-24** Eksport do **PDF** (nagłówek z nazwą planu i datą, KPI, tabela, wykresy).
- **FR-25** Kopiowanie linku do planu (v1.1, wymaga konta).

## 7. Wymagania niefunkcjonalne

| Obszar | Wymaganie |
|---|---|
| Wydajność | Przeliczenie i odświeżenie widoku < 100 ms; pierwsze załadowanie < 2 s na łączu 4G |
| Responsywność | Pełna obsługa od 360 px szerokości; na mobile tabela przechodzi w karty kanałów |
| Przeglądarki | Ostatnie 2 wersje Chrome, Edge, Firefox, Safari |
| Dostępność | WCAG 2.1 AA: etykiety pól, obsługa klawiatury, kontrast, statusy walidacji nie tylko kolorem |
| Język i format | Interfejs PL (i18n przygotowane pod EN), format liczb i walut `pl-PL` |
| Prywatność | MVP bez danych osobowych — dane tylko w przeglądarce; od v1.1 zgodność z RODO |
| Bezpieczeństwo (v1.1) | HTTPS, uwierzytelnianie OAuth/e-mail, dostęp do planów tylko właściciela |
| Jakość | Testy jednostkowe 100% dla modułu obliczeń; testy E2E głównej ścieżki |

## 8. UX — główny ekran (szkic)

```
┌──────────────────────────────────────────────────────────────┐
│ NinjaAI · Plan: „Marketing 2027”            [Zapisz] [Eksport]│
├──────────────────────────────────────────────────────────────┤
│ Roczny budżet: [ 120 000,00 zł ]        Rozdzielono: 100% ✔   │
├──────────────┬──────────┬────────────┬────────┬──────────────┤
│ Kanał        │ % budż.  │ Kwota      │ ROI %  │ Zwrot        │
│ Social media │ [ 35 ]   │ 42 000 zł  │ [180]  │ 75 600 zł    │
│ WWW          │ [ 20 ]   │ 24 000 zł  │ [150]  │ 36 000 zł    │
│ Radio        │ [ 10 ]   │ 12 000 zł  │ [ 60]  │  7 200 zł    │
│ TV           │ [ 20 ]   │ 24 000 zł  │ [ 40]  │  9 600 zł    │
│ Billboard    │ [ 10 ]   │ 12 000 zł  │ [ 30]  │  3 600 zł    │
│ Gazeta       │ [  5 ]   │  6 000 zł  │ [ 20]  │  1 200 zł    │
├──────────────┼──────────┼────────────┼────────┼──────────────┤
│ SUMA         │ 100%     │ 120 000 zł │ 111%   │ 133 200 zł   │
└──────────────┴──────────┴────────────┴────────┴──────────────┘
 [Wykres podziału budżetu]   [Wykres: wydatek vs. zwrot]
```

Zasady UX:
- Pola % i ROI z polem liczbowym + opcjonalnym suwakiem.
- Pasek postępu sumy % nad tabelą, z kolorem i komunikatem tekstowym.
- Pusty stan: przykładowy podział do wczytania jednym kliknięciem („Wczytaj przykład”).
- Zmiany niezapisane → ostrzeżenie przy opuszczaniu strony.

## 9. Model danych (propozycja)

```ts
type ChannelId = "social_media" | "www" | "radio" | "tv" | "billboard" | "newspaper";

interface ChannelAllocation {
  channel: ChannelId;
  sharePercent: number;      // 0–100
  expectedRoiPercent: number; // 0–10000
}

interface BudgetPlan {
  id: string;
  name: string;
  year: number;
  currency: "PLN";
  annualBudget: number;       // w groszach (integer)
  allocations: ChannelAllocation[];
  status: "draft" | "final";  // final tylko gdy Σ sharePercent = 100
  createdAt: string;
  updatedAt: string;
}
```

## 10. Zakres wydań

| Wydanie | Zakres |
|---|---|
| **MVP** | FR-1 – FR-21, FR-23 – FR-24; zapis lokalny; PL; PLN |
| **v1.1** | Konta użytkowników, zapis w chmurze, udostępnianie linkiem (FR-22, FR-25), wersja EN |
| **v2** | Własne kanały (dodawanie/usuwanie), podział budżetu na miesiące, rzeczywiste wyniki vs. plan, rekomendacje podziału przez AI na podstawie branży i historycznego ROI |

## 11. Stos techniczny (MVP)

- Czysty HTML, CSS i JavaScript — bez frameworków, zewnętrznych bibliotek i kroku budowania; aplikacja działa po otwarciu `index.html`.
- Obliczenia: wydzielony, czysto funkcyjny moduł `js/calc.js` z testami jednostkowymi (`node --test`).
- Wykresy: rysowane jako inline SVG.
- Przechowywanie: `localStorage` (MVP), backend + baza (np. PostgreSQL) od v1.1.
- Eksport: CSV generowany po stronie klienta, PDF przez druk do PDF.
- Hosting: dowolny statyczny (GitHub Pages / Netlify / Cloudflare Pages).

## 12. Kryteria akceptacji MVP (wybrane)

- [ ] Po wpisaniu budżetu 100 000 zł i 25% dla Social media kwota kanału wynosi 25 000,00 zł.
- [ ] Przy ROI 200% dla tego kanału zwrot wynosi 50 000,00 zł, a wartość końcowa (zwrot − kwota) 25 000,00 zł.
- [ ] Suma % = 99,99% blokuje status „final” i eksport; komunikat wskazuje brakujące 0,01%.
- [ ] Suma % > 100% wyświetla błąd i wskazuje nadwyżkę w % i zł.
- [ ] % zwrotu < 0 jest odrzucany z komunikatem walidacji.
- [ ] Przy zwrocie < 100% wartość końcowa jest ujemna i wyróżniona kolorem straty.
- [ ] Ważony ROI dla przykładu z §8 wynosi 111,00%.
- [ ] Zapisany plan jest dostępny po odświeżeniu strony.
- [ ] Eksport CSV zawiera 6 kanałów i wiersz sumy z poprawnymi wartościami.
- [ ] Wszystkie pola są osiągalne i edytowalne z klawiatury.

## 13. Ryzyka i otwarte pytania

| # | Pytanie / ryzyko | Proponowane rozwiązanie |
|---|---|---|
| 1 | Czy „% zwrotu” oznacza zysk netto czy całą kwotę, która wraca? | **Rozstrzygnięte:** % zwrotu to cała kwota, która wraca; wartość końcowa = zwrot − kwota zainwestowana (§6.3) |
| 2 | Czy użytkownik potrzebuje własnych kanałów (np. e-mail, eventy, outdoor)? | v2; w MVP stała lista 6 kanałów |
| 3 | Czy wymagane jest konto już w MVP? | Nie — zapis lokalny obniża próg wejścia |
| 4 | Użytkownicy mogą wpisywać nierealne ROI | Ostrzeżenie (nie blokada) przy ROI > 1000% |
| 5 | Wyniki to prognoza, nie gwarancja | Widoczna informacja „Wartości szacunkowe na podstawie Twoich założeń” |
