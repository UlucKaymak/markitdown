/**
 * Simple Analytics Tracker for Portfolio-UlucKaymak
 * Since this is a static site, it uses localStorage for demonstration 
 * or can be easily adapted to a real backend.
 */

async function trackVisit() {
    const visitData = {
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language
    };

    try {
        // Fetch location data using a free API
        const geoResponse = await fetch('https://ipapi.co/json/');
        if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            visitData.location = {
                city: geoData.city,
                country: geoData.country_name,
                countryCode: geoData.country_code,
                ip: geoData.ip.substring(0, geoData.ip.lastIndexOf('.')) + '.xxx' // Privacy
            };
        }
    } catch (e) {
        console.warn('Geo-location tracking failed', e);
        visitData.location = { country: 'Unknown', city: 'Unknown', ip: 'Unknown' };
    }

    // Save to localStorage for this demo
    const history = JSON.parse(localStorage.getItem('portfolio_analytics') || '[]');
    history.push(visitData);
    
    // Keep only last 1000 entries
    if (history.length > 1000) history.shift();
    
    localStorage.setItem('portfolio_analytics', JSON.stringify(history));
    console.log('Visit tracked:', visitData.page);
}

// Automatically track on load
if (document.readyState === 'complete') {
    trackVisit();
} else {
    window.addEventListener('load', trackVisit);
}
