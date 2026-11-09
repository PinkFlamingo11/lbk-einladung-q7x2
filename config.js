// Einstellungen für die Einladung.
// SUPABASE_URL und SUPABASE_ANON_KEY bleiben leer, solange die Datenbank nicht verbunden ist.
// Dann läuft die Seite im Testmodus und speichert nur im eigenen Browser.
window.LBK_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Kinderfotos. Dateien in den Ordner assets/ legen. Fehlende Dateien werden einfach übersprungen.
  PHOTOS: [
    { src: 'assets/kind-1.jpg', caption: 'Hier. Die kleine Caro. Schon damals dieser Blick: Ich hab einen Plan.' },
    { src: 'assets/kind-2.jpg', caption: 'Und hier ein bisschen später. Der Plan ist nicht kleiner geworden.' },
    { src: 'assets/kind-3.jpg', caption: 'Beweisfoto drei. Fragen Sie nicht, was sie in der Hand hält.' }
  ]
};
