document.addEventListener('DOMContentLoaded', () => {
    loadAnalytics();
});

function loadAnalytics() {
    const data = JSON.parse(localStorage.getItem('portfolio_analytics') || '[]');
    
    updateOverview(data);
    renderRecentVisits(data);
    renderTopLocations(data);
    // Note: A real chart would use Chart.js, but we'll stick to simple logic here
}

function updateOverview(data) {
    const totalVisits = data.length;
    const uniqueIPs = new Set(data.map(v => v.location?.ip).filter(ip => ip && ip !== 'Unknown')).size;
    const countries = new Set(data.map(v => v.location?.country).filter(c => c && c !== 'Unknown')).size;

    document.getElementById('total-visits').textContent = totalVisits;
    document.getElementById('unique-visitors').textContent = uniqueIPs;
    document.getElementById('active-countries').textContent = countries;
}

function renderRecentVisits(data) {
    const tbody = document.getElementById('visits-tbody');
    tbody.innerHTML = '';

    const recent = [...data].reverse().slice(0, 20);

    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No visits recorded yet.</td></tr>';
        return;
    }

    recent.forEach(visit => {
        const row = document.createElement('tr');
        const date = new Date(visit.timestamp);
        const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const device = getDeviceType(visit.userAgent);
        const location = visit.location ? `${visit.location.city || '?'}, ${visit.location.countryCode || '?'}` : 'Unknown';

        row.innerHTML = `
            <td>${timeStr}</td>
            <td><code>${visit.page}</code></td>
            <td>${location}</td>
            <td>${visit.location?.ip || 'N/A'}</td>
            <td>${device}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderTopLocations(data) {
    const list = document.getElementById('location-list');
    const counts = {};

    data.forEach(visit => {
        const loc = visit.location?.country || 'Unknown';
        counts[loc] = (counts[loc] || 0) + 1;
    });

    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sorted.length === 0) {
        list.innerHTML = '<p class="empty-state">No location data yet.</p>';
        return;
    }

    list.innerHTML = sorted.map(([name, count]) => `
        <div class="location-item">
            <span class="location-name">${name}</span>
            <span class="location-count">${count}</span>
        </div>
    `).join('');
}

function getDeviceType(ua) {
    if (/mobile/i.test(ua)) return 'Mobile';
    if (/tablet/i.test(ua)) return 'Tablet';
    return 'Desktop';
}
