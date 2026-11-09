// Einstellungen für die Einladung.
// SUPABASE_URL und SUPABASE_ANON_KEY bleiben leer, solange die Datenbank nicht verbunden ist.
// Dann läuft die Seite im Testmodus und speichert nur im eigenen Browser.
window.LBK_CONFIG = {
  SUPABASE_URL: 'https://ipurhgiuzjdvdqbkusxy.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_JsWWOw2oI5x6Q_4498kiww_z8k3eMd_',

  // Kinderfotos. Dateien in den Ordner assets/ legen. Fehlende Dateien werden einfach übersprungen.
  PHOTOS: [
    { src: 'assets/kind-1.jpg', caption: 'Das hier ist die kleine Caro. Inzwischen wird sie 27.' }
  ]
};
