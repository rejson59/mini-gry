# Balonowa Przystań

Kolorowa gra ekonomiczno-zręcznościowa 3D o prowadzeniu portu balonowego na latających wyspach. Zbieraj monety, tankuj balony, obsługuj sklepy, zatrudniaj pomocników i rozbuduj przystań aż po sterowiec. Wykonuj też zlecenia, żeby zdobywać dodatkowe nagrody.

## Sterowanie

- **WASD** lub **strzałki** — ruch.
- **Mysz / ekran dotykowy** — przeciągnij w kierunku ruchu; na telefonie pojawi się wirtualny joystick.
- Stań na polu, żeby kupić odblokowanie. Podejdź do warsztatu, żeby otworzyć ulepszenia.
- Zlecenia otworzysz przyciskiem 📜. Nagrody odbiera się bezpośrednio na tablicy.
- Postęp, odblokowania, ulepszenia i ustawienia dźwięku zapisują się automatycznie w pamięci przeglądarki.

## Uruchomienie lokalne

Wymagany jest Node.js 22 lub nowszy.

```bash
npm ci
npm run dev
```

Sprawdzenie typów i krótka symulacja rozgrywki:

```bash
npm test
```

Build produkcyjny:

```bash
npm run build
npm run preview
```

## Publikacja

Projekt jest przygotowany pod **GitHub Pages** i publikuje się przez GitHub Actions. Workflow `.github/workflows/pages.yml` uruchamia test symulacyjny, buduje statyczną stronę i publikuje ją po zmianach na `main` lub na aktywnej gałęzi roboczej.

Po zakończeniu wdrożenia gra jest dostępna pod adresem:

**https://rejson59.github.io/mini-gry/**

Dane zapisu nie są wysyłane na serwer — każda przeglądarka ma własny zapis w `localStorage`.
