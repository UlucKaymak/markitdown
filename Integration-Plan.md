# Markitdown Uygulama ve Entegrasyon Stratejileri

Markitdown projesini başka platformlara (diğer web projeleri, bloglar, CMS sistemleri) entegre edilebilir hale getirmek için izlenebilecek temel stratejiler aşağıda özetlenmiştir.

## 1. Web Component (Custom Element) Yaklaşımı
En modern ve "tak-çalıştır" yöntemidir. Markitdown'ı `<mark-it-down></mark-it-down>` şeklinde bir HTML etiketi olarak tanımlamanıza olanak tanır.

- **Kapsülleme (Encapsulation):** Tüm CSS ve JavaScript mantığı tek bir sınıf içinde dış dünyadan izole edilir.
- **Shadow DOM:** Markitdown'ın stillerinin (style.css), eklendiği ana sayfanın stillerini bozması engellenir.

---

## Önerilen İlk Adım: Modüler Refactor
Projeyi taşınabilir kılmak için mevcut `index.html` içindeki yapıların şu şekilde ayrıştırılması önerilir:

1. **`markitdown-core.js`:** State yönetimi, Markdown parsing, Mermaid entegrasyonu ve Görsel işleme (blob URL yönetimi).
2. **`markitdown-ui.js`:** Toolbar bileşenleri, Ayarlar paneli ve Tema yönetimi mantığı.
3. **`markitdown.css`:** Tüm bileşenlerin görsel stilleri.

Bu yapıya geçildiğinde, Markitdown herhangi bir JavaScript framework'ü (React, Vue, Svelte vb.) içine çok daha kolay entegre edilebilir.
