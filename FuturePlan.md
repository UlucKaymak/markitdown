# Markitdown Uygulama ve Entegrasyon Stratejileri

## Önerilen İlk Adım: Modüler Refactor
Projeyi taşınabilir kılmak için mevcut `index.html` içindeki yapıların şu şekilde ayrıştırılması önerilir:

1. **`markitdown-core.js`:** State yönetimi, Markdown parsing, Mermaid entegrasyonu ve Görsel işleme (blob URL yönetimi).
2. **`markitdown-ui.js`:** Toolbar bileşenleri, Ayarlar paneli ve Tema yönetimi mantığı.
3. **`markitdown.css`:** Tüm bileşenlerin görsel stilleri.
