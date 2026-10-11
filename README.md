# NinjaAI

Planer rocznego budżetu marketingowego. Wpisujesz roczny budżet, dzielisz go procentowo na kanały
(Social media, WWW, Radio, TV, Billboard, Gazeta) i dla każdego kanału podajesz spodziewany % zwrotu.
Aplikacja na bieżąco liczy kwoty, oczekiwany zwrot i ważony ROI całego planu.

Wymagania produktowe: [docs/PRD.md](docs/PRD.md).

## Funkcje (MVP)

- Podział budżetu w % lub w zł (przeliczanie w obie strony), walidacja sumy 100%
- „Rozdziel resztę równo” i „Wyzeruj podział”
- Spodziewany ROI per kanał (−100% … 10 000%), wyróżnienie najwyższego i najniższego ROI
- Tabela wyników, karty KPI, wykres podziału i wykres wydatek vs. zwrot
- Zapis planów w przeglądarce (szkic / gotowy), zmiana nazwy, duplikowanie, usuwanie
- Porównanie do 3 scenariuszy obok siebie
- Eksport CSV (format dla polskiego Excela) i PDF (przez drukowanie)
- Responsywny układ, tryb ciemny, obsługa klawiatury

## Uruchomienie

```bash
npm install
npm run dev        # serwer deweloperski
npm test           # testy jednostkowe (obliczenia, formatowanie, CSV)
npm run build      # typecheck + build produkcyjny do dist/
```

Obliczenia działają na liczbach całkowitych (grosze, setne części procenta), więc kwoty kanałów
sumują się dokładnie do budżetu. Logika jest w `src/lib/calc.ts`.
