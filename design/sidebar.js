// Sidebar navigation functionality

document.addEventListener('DOMContentLoaded', function () {
    // Initialize layout immediately (toggle button, overlay) so it doesn't depend on fetch
    initLayout(); 
    loadSidebar();
    initPageTransitions();
});

function loadSidebar() {
    // Use absolute path to ensure sidebar loads from any subpath or domain
    fetch('/design/sidebar.html')
        .then(response => {
            if (!response.ok) throw new Error("Sidebar fetch failed");
            return response.text();
        })
        .then(data => {
            document.getElementById('sidebar-container').innerHTML = data;
            initSidebarContent(); // Initialize internal sidebar logic
        })
        .catch(err => {
            console.warn("Could not load sidebar content (likely due to local file protocol restrictions):", err);
            // Even if content fails, the layout structure (sidebar container) exists
        });
}

function initLayout() {
    // --- Hamburger menu logic ---
    // Create toggle if it doesn't exist (fixing missing HTML element)
    let sidebarToggle = document.getElementById('sidebarToggle');
    if (!sidebarToggle) {
        sidebarToggle = document.createElement('div');
        sidebarToggle.id = 'sidebarToggle';
        sidebarToggle.className = 'sidebar-toggle';
        sidebarToggle.innerHTML = '<span></span><span></span><span></span>';
        document.body.appendChild(sidebarToggle);
    }

    const sidebar = document.getElementById('sidebar-container');
    
    // Create an overlay for when the sidebar is open on mobile
    let mobileOverlay = document.getElementById('mobile-overlay');
    if (!mobileOverlay) {
        mobileOverlay = document.createElement('div');
        mobileOverlay.id = 'mobile-overlay';
        document.body.appendChild(mobileOverlay);
    }

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            toggleMobileSidebar(sidebar, sidebarToggle, mobileOverlay);
        });
    }

    // Close sidebar when clicking outside (on the overlay)
    mobileOverlay.addEventListener('click', function() {
        if (sidebar && sidebar.classList.contains('open')) {
            toggleMobileSidebar(sidebar, sidebarToggle, mobileOverlay);
        }
    });
}

function initSidebarContent() {
    const sidebar = document.getElementById('sidebar-container');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileOverlay = document.getElementById('mobile-overlay');

    if (!sidebar) return;
    
    // Close sidebar if a link is clicked on mobile
    sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
                toggleMobileSidebar(sidebar, sidebarToggle, mobileOverlay);
            }
        });
    });

    // Handle expandable menu items
    const expandableItems = document.querySelectorAll('.has-submenu > .nav-link');

    expandableItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Don't prevent default if clicking to navigate
            // Only prevent if clicking to toggle submenu
            const submenu = this.parentElement.querySelector('.submenu');
            if (submenu && !submenu.classList.contains('expanded')) {
                e.preventDefault();
                toggleSubmenu(this.parentElement);
            }
        });
    });

    // Click on expand icon specifically
    const expandIcons = document.querySelectorAll('.expand-icon');
    expandIcons.forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const navItem = this.closest('.has-submenu');
            toggleSubmenu(navItem);
        });
    });

    // Handle dropdown toggle on hover (for non-projects pages)
    const dropdownItems = document.querySelectorAll('.nav-item-with-dropdown');
    dropdownItems.forEach(navItem => {
        // Don't add hover functionality on projects page (it's auto-opened there)
        if (!document.body.classList.contains('projects-page')) {
            navItem.addEventListener('mouseenter', function() {
                this.classList.add('open');
            });

            navItem.addEventListener('mouseleave', function() {
                this.classList.remove('open');
            });
        }
    });

    // Handle dropdown filter links on projects page
    if (document.body.classList.contains('projects-page')) {
        // Auto-open dropdown on projects page
        const projectsDropdown = document.querySelector('.nav-item-with-dropdown');
        if (projectsDropdown) {
            projectsDropdown.classList.add('open');
        }

        const dropdownLinks = document.querySelectorAll('.dropdown-link');
        dropdownLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const filter = this.getAttribute('data-filter');

                // Add transition effect
                const projectsGrid = document.querySelector('.projects-grid');
                if (projectsGrid) {
                    projectsGrid.style.opacity = '0';
                    projectsGrid.style.transition = 'opacity 0.2s ease-in-out';

                    setTimeout(() => {
                        filterProjects(filter);
                        projectsGrid.style.opacity = '1';
                    }, 200);
                } else {
                    filterProjects(filter);
                }

                // Update active state
                document.querySelectorAll('.dropdown-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Check URL for filter parameter
        const urlParams = new URLSearchParams(window.location.search);
        const filterParam = urlParams.get('filter');
        if (filterParam) {
            const filter = '#' + filterParam;
            filterProjects(filter);

            // Update active state
            document.querySelectorAll('.dropdown-link').forEach(link => {
                if (link.getAttribute('data-filter') === filter) {
                    link.classList.add('active');
                }
            });
        } else {
            // If no filter, mark "All Projects" as active
            document.querySelectorAll('.dropdown-link').forEach(link => {
                if (link.getAttribute('data-filter') === 'all') {
                    link.classList.add('active');
                }
            });
        }
    }
}

function toggleMobileSidebar(sidebar, sidebarToggle, overlay) {
    if (!sidebar || !sidebarToggle || !overlay) return;
    
    sidebar.classList.toggle('open');
    sidebarToggle.classList.toggle('open');
    if (sidebar.classList.contains('open')) {
        overlay.classList.add('open');
    } else {
        overlay.classList.remove('open');
    }
}

function toggleSubmenu(navItem) {
    const submenu = navItem.querySelector('.submenu');
    const isExpanded = submenu.classList.contains('expanded');

    if (isExpanded) {
        submenu.classList.remove('expanded');
        navItem.classList.remove('expanded');
    } else {
        submenu.classList.add('expanded');
        navItem.classList.add('expanded');
    }
}

function toggleDropdown(navItem) {
    const isOpen = navItem.classList.contains('open');

    // Close all other dropdowns
    document.querySelectorAll('.nav-item-with-dropdown').forEach(item => {
        if (item !== navItem) {
            item.classList.remove('open');
        }
    });

    // Toggle current dropdown
    if (isOpen) {
        navItem.classList.remove('open');
    } else {
        navItem.classList.add('open');
    }
}

function filterProjects(filter) {
    // This function will be called from script.js
    // Store the filter for use when loading projects
    if (window.loadProjectThumbnails) {
        window.loadProjectThumbnails(filter);
    }
}

// Page Transitions
function initPageTransitions() {
    // Get all internal navigation links
    const links = document.querySelectorAll('a[href]');

    links.forEach(link => {
        const href = link.getAttribute('href');

        // Only add transitions to internal HTML page links
        if (href &&
            (href.endsWith('.html') || href === '/' || href === '/projects' || href === '/aboutme' || href.startsWith('/projects/')) &&
            !href.startsWith('http') &&
            !href.startsWith('#')) {

            link.addEventListener('click', function(e) {
                // If it's a project deep link, let the modal handle it without a full page reload if we're already on projects page
                if (href.startsWith('/projects/') && document.body.classList.contains('projects-page')) {
                    return; 
                }

                e.preventDefault();
                const destination = this.getAttribute('href');

                // Add exit animation class to page content only
                const pageContent = document.querySelector('.page-content');
                if (pageContent) {
                    pageContent.classList.add('page-transition-exit');
                }

                // Navigate after animation completes
                setTimeout(() => {
                    window.location.href = destination;
                }, 200); // Match animation duration
            });
        }
    });
}