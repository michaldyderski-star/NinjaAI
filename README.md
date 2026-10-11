# NinjaAI

Planer rocznego budżetu marketingowego. Wpisujesz roczny budżet, dzielisz go procentowo na kanały
(Social media, WWW, Radio, TV, Billboard, Gazeta) i dla każdego kanału podajesz spodziewany % zwrotu.
Aplikacja na bieżąco liczy kwoty, oczekiwany zwrot i ważony ROI całego planu.

Wymagania produktowe: [docs/PRD.md](docs/PRD.md).

## Funkcje (MVP)

- Podział budżetu w % lub w zł (przeliczanie w obie strony), walidacja sumy 100%
- „Rozdziel resztę równo” i „Wyzeruj podział”
- Spodziewany % zwrotu per kanał (0% … 10 000%), wyróżnienie najwyższego i najniższego
- Wartość końcowa = zwrot − kwota zainwestowana (zysk lub strata netto)
- Tabela wyników, karty KPI, wykres podziału i wykres wydatek vs. zwrot
- Zapis planów w przeglądarce (szkic / gotowy), zmiana nazwy, duplikowanie, usuwanie
- Porównanie do 3 scenariuszy obok siebie
- Eksport CSV (format dla polskiego Excela) i PDF (przez drukowanie)
- Responsywny układ, tryb ciemny, obsługa klawiatury

## Uruchomienie

Czysty HTML + JavaScript — bez frameworków, bibliotek i kroku budowania.
Wystarczy otworzyć `index.html` w przeglądarce (dwuklik) albo wrzucić katalog na dowolny hosting statyczny.

```
index.html      # układ strony i style
js/calc.js      # obliczenia, formatowanie, CSV (czyste funkcje)
js/app.js       # interfejs: formularz, tabela, wykresy SVG, zapis, porównanie
tests/          # testy jednostkowe obliczeń
```

Testy (wymagają tylko Node.js 18+, bez instalowania pakietów):

```bash
node --test
```

Obliczenia działają na liczbach całkowitych (grosze, setne części procenta), więc kwoty kanałów
sumują się dokładnie do budżetu. Logika jest w `js/calc.js`.
