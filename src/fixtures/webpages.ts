export type ScoutPage = {
  id: string;
  host: string;
  url: string;
  market: string;
  language: string;
  title: string;
  html: string;
};

/** Public, allowlisted snapshots. Used offline; live fetch is optional and fail-closed. */
export const SCOUT_CORPUS: ScoutPage[] = [
  {
    id: "murobbs-pelikone",
    host: "murobbs.muropaketti.com",
    url: "https://murobbs.muropaketti.com/threads/kunnostettu-pelikone.1/",
    market: "FI",
    language: "fi",
    title: "Kunnostettu pelikone 700e?",
    html: `
      <article>
        <h1>Kunnostettu pelikone 700e?</h1>
        <p>Konekaveri neuvoo käytetty näytönohjain -kaupat. YouTube: https://youtube.com/@konekaveri</p>
        <p>Yhteistyö: moro@konekaveri.fi</p>
      </article>
    `,
  },
  {
    id: "youtube-about-konekaveri",
    host: "www.youtube.com",
    url: "https://www.youtube.com/@konekaveri/about",
    market: "FI",
    language: "fi",
    title: "Konekaveri — About",
    html: `
      <div>
        <h1>Konekaveri</h1>
        <p>pelikone ja kunnostettu.build. moro@konekaveri.fi</p>
        <a href="https://youtube.com/@konekaveri">channel</a>
      </div>
    `,
  },
  {
    id: "computerbase-gebraucht",
    host: "www.computerbase.de",
    url: "https://www.computerbase.de/forum/threads/gebraucht-gpu-build.2/",
    market: "DE",
    language: "de",
    title: "Gebraucht GPU statt Neu?",
    html: `
      <article>
        <h1>Preis-Leistung gebraucht gaming PC</h1>
        <p>Build mit Ben erklärt refurbished GPU. https://youtube.com/@buildmitben</p>
        <p>hello@buildmitben.de</p>
      </article>
    `,
  },
  {
    id: "hardwareluxx-secondhand",
    host: "www.hardwareluxx.de",
    url: "https://www.hardwareluxx.de/community/threads/second-hand-gpu.3/",
    market: "DE",
    language: "de",
    title: "Second-hand GPU Reviews",
    html: `
      <article>
        <h1>gebraucht GPU hardware review</h1>
        <p>Gebraucht GPU postet Instagram-Reviews. https://instagram.com/gebrauchtgpu</p>
        <p>collab@gebrauchtgpu.de</p>
      </article>
    `,
  },
];

export const ALLOWED_SCOUT_HOSTS = [
  "computerbase.de",
  "www.computerbase.de",
  "hardwareluxx.de",
  "www.hardwareluxx.de",
  "murobbs.muropaketti.com",
  "youtube.com",
  "www.youtube.com",
] as const;
