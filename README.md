# Zgjedhjet në Shqipëri · Raporti

Versioni web i raportit Power BI për zgjedhjet parlamentare 2025 në Shqipëri, me të njëjtat faqe, filtra, tooltip dhe grafikë.

*A web version of the Power BI report on Albania's 2025 parliamentary election: the same 12 pages, slicers, tooltips, cross-filtering and drill-down, rebuilt as a static site. The site is in Albanian.*

## Faqet

| Faqja | Çfarë tregon |
| --- | --- |
| Përmbledhje kombëtare | Nga zgjedhësit te votat e vlefshme, mandatet, % e votave dhe e mandateve, tabela e subjekteve |
| Analiza territoriale | Shpërndarja e votave, mandatet sipas qarkut, pjesëmarrja (me zbërthim Qark › Bashki › Nj.Ad. › QV), pesha e diasporës |
| Lëvizshmëria e votuesve | Indeksi i Pedersenit 2021→2025 dhe 2023→2025 për çdo nivel |
| Analiza gjinore | Pjesëmarrja e grave dhe e burrave, hendeku gjinor |
| Harta zgjedhore (Tiranë, Vlorë) | Hartat sipas njësisë administrative, me tooltip 2023/2025 për çdo njësi |
| Krahasimi 2023–2025 (Tiranë, Vlorë) | Ku fitoi dhe humbi çdo subjekt |
| Abstenimi (Tiranë, Vlorë) | Kush nuk votoi dhe ku duhet bërë fushatë |
| Skenari 2027 (Tiranë, Vlorë) | Skenar **hipotetik** me X dhe Y të zgjedhura nga lexuesi |

Klikimi mbi një shtyllë, njësi në hartë ose rresht tabele filtron vizualet e tjera të faqes, si në Power BI. Butoni ↓ në kokën e grafikut ndez zbërthimin; ↑ kthehet një nivel lart.

## Si ndërtohet

Faqja është HTML, CSS dhe JavaScript i thjeshtë, pa biblioteka. Të dhënat i krijon një skript nga depoja [edibi/zgjedhjet-shqiperi](https://github.com/edibi/zgjedhjet-shqiperi):

```bash
python build/build_data.py ../zgjedhjet-shqiperi
```

Skripti lexon skedarët `raw/` të KQZ-së, CSV-të e krahasimeve dhe faqet e raportit PBIP (pozicionet, titujt dhe tekstet e vizualeve), dhe shkruan `data/report.json`. Ndalon nëse totalet nuk përputhen me KQZ-në: 1,606,057 vota të vlefshme, 140 mandate, votat e çdo partie, Tirana 340,301 dhe Vlora 49,636 vota në 2025, dhe çdo vlerë e indeksit të Pedersenit te `levizshmeria_pedersen.csv`.

Masat DAX të modelit janë rishkruar në `app.js`, te seksioni "Masat".

Për ta parë lokalisht:

```bash
python -m http.server 8770
```

## Ndryshime nga Power BI

- Paraqitja ndjek pozicionet e Power BI në ekranet e gjera; në telefon vizualet vendosen njëri pas tjetrit.
- Klikimi filtron vizualet e tjera (Power BI shpesh vetëm i thekson).
- Te Krahasimi, klikimi mbi një subjekt e shfaq atë në hartë.
- Te Abstenimi, klikimi mbi një njësi nuk ndryshon kartat dhe grafikun e Shqipërisë.
- Grafiku "Mandatet sipas qarkut" mbetet në nivelin e qarkut, sepse mandatet ndahen vetëm sipas qarkut.

## Burimet

- **[KQZ](https://iemis.kqz.gov.al/results2025-finale/?lang=AL&v1=ALL)**: Kuvendi 2021 dhe 2025, zgjedhjet vendore 2023.
- **INSTAT**: popullsia 2025, për vlerësimin e zgjedhësve rezidentë.
- **[OpenStreetMap](https://www.openstreetmap.org/copyright)**: kufijtë e njësive të Tiranës dhe Vlorës.

> **Skenarët 2027 nuk janë parashikim.** Rezultatet zyrtare janë vetëm ato të KQZ-së.

Ky është një projekt i pavarur, pa lidhje me KQZ-në apo ndonjë subjekt politik.
