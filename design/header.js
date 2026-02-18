function loadHeader(eyebrow, title, subtitle) {
    fetch('/design/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-container').innerHTML = data;
            document.getElementById('header-eyebrow').textContent = eyebrow;
            document.getElementById('header-title').textContent = title;
            document.getElementById('header-subtitle').textContent = subtitle;
        });
}
