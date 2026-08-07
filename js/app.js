/**
 * Lumo - Main Application Bootstrap
 * 
 * Initializes the application, sets up event listeners,
 * and manages the basic application shell.
 */

var LumoApp = (function() {
    'use strict';

    // Private variables
    var isInitialized = false;
    var currentModule = null;
    var navItems = [];
    var workspaceContent = null;
    var inspector = null;
    var insClose = null;
    var shell = null;

    /**
     * Initialize the application
     * @private
     */
    function init() {
        if (isInitialized) {
            console.warn('[Lumo] App already initialized');
            return;
        }

        console.log('========================================');
        console.log('[Lumo] Starting application bootstrap...');
        console.log('[Lumo] App Name:', LumoConfig.getAppName());
        console.log('[Lumo] Version:', LumoConfig.getVersion());

        // Initialize storage layer
        LumoStorage.init();

        // Cache DOM elements
        workspaceContent = document.getElementById('workspace-content');
        navItems = document.querySelectorAll('.navitem');
        inspector = document.getElementById('inspector');
        insClose = document.getElementById('insClose');
        shell = document.getElementById('shell');

        // Verify DOM elements are available
        if (!workspaceContent) {
            console.error('[Lumo] Workspace content element not found!');
            return;
        }

        // Set up event listeners
        setupEventListeners();

        // Load default module
        loadDefaultModule();

        // Initialize spores canvas
        initSpores();

        // Mark as initialized
        isInitialized = true;

        console.log('[Lumo] ========================================');
        console.log('[Lumo] App Initialized Successfully!');
        console.log('[Lumo] All modules loaded and ready.');
        console.log('[Lumo] ========================================');
    }

    /**
     * Set up all event listeners
     * @private
     */
    function setupEventListeners() {
        // Navigation click handlers
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].addEventListener('click', handleNavClick);
        }

        // Inspector close button
        if (insClose) {
            insClose.addEventListener('click', closeInspector);
        }

        // Optional: Handle browser back/forward
        window.addEventListener('popstate', handlePopState);

        console.log('[Lumo] Event listeners attached');
    }

    /**
     * Handle navigation item clicks
     * @private
     * @param {Event} event - The click event
     */
    function handleNavClick(event) {
        var item = event.currentTarget;
        var moduleName = item.getAttribute('data-module');

        if (moduleName) {
            loadModule(moduleName);
            updateActiveNav(item);
        }
    }

    /**
     * Update active navigation state
     * @private
     * @param {HTMLElement} activeItem - The currently active item
     */
    function updateActiveNav(activeItem) {
        // Remove active class from all items
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].classList.remove('on');
        }

        // Add active class to clicked item
        if (activeItem) {
            activeItem.classList.add('on');
        }
    }

    /**
     * Load the default module on startup
     * @private
     */
    function loadDefaultModule() {
        var defaultModule = LumoConfig.get('ui.defaultModule') || 'dashboard';
        
        // Find the nav item for the default module
        for (var i = 0; i < navItems.length; i++) {
            var item = navItems[i];
            if (item.getAttribute('data-module') === defaultModule) {
                loadModule(defaultModule);
                updateActiveNav(item);
                break;
            }
        }
    }

    /**
     * Load a module (placeholder - actual implementation will come later)
     * @private
     * @param {string} moduleName - The name of the module to load
     */
    function loadModule(moduleName) {
        currentModule = moduleName;
        
        console.log('[Lumo] Module requested:', moduleName);
        
        // Check if module has a render function
        var moduleContent = '';
        
        // Habit Tracker Module Integration
        if (moduleName === 'habits' && typeof LumoHabitTracker !== 'undefined') {
            if (!LumoHabitTracker.isReady()) {
                LumoHabitTracker.init();
            }
            moduleContent = LumoHabitTracker.render();
        } else {
            // Placeholder for other modules
            var capitalized = capitalizeFirstLetter(moduleName);
            moduleContent = 
                '<div class="viewhead rise">' +
                    '<span class="eyebrow">Module</span>' +
                    '<h1 class="vt">' + capitalized + '</h1>' +
                    '<p class="sub">Module content will be loaded here.</p>' +
                '</div>' +
                '<div class="panel rise d1">' +
                    '<div class="lbl">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
                            '<circle cx="12" cy="12" r="9"/>' +
                            '<path d="M12 3v18M3 12h18"/>' +
                        '</svg>' +
                        '<span class="leaf">' + capitalized + '</span>' +
                    '</div>' +
                    '<p style="color:var(--dim);font-size:13.5px;line-height:1.7;">' +
                        'This is the ' + moduleName + ' module placeholder. ' +
                        'Full functionality will be implemented soon.' +
                    '</p>' +
                '</div>';
        }
        
        // Render the module content
        if (workspaceContent) {
            workspaceContent.innerHTML = moduleContent;
        }

        // Store current module in history
        if (window.history && window.history.pushState) {
            window.history.pushState({ module: moduleName }, moduleName, '#' + moduleName);
        }
    }

    /**
     * Close inspector panel
     * @private
     */
    function closeInspector() {
        if (shell) {
            shell.classList.remove('insp');
        }
    }

    /**
     * Handle browser history navigation
     * @private
     * @param {PopStateEvent} event - The popstate event
     */
    function handlePopState(event) {
        if (event.state && event.state.module) {
            loadModule(event.state.module);
            
            // Update active nav
            for (var i = 0; i < navItems.length; i++) {
                var item = navItems[i];
                if (item.getAttribute('data-module') === event.state.module) {
                    updateActiveNav(item);
                    break;
                }
            }
        }
    }

    /**
     * Capitalize first letter of a string
     * @private
     * @param {string} str - The string to capitalize
     * @returns {string} The capitalized string
     */
    function capitalizeFirstLetter(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Initialize ambient spores canvas animation
     * @private
     */
    function initSpores() {
        var canvas = document.getElementById('spores');
        if (!canvas) return;
        
        var ctx = canvas.getContext('2d');
        var spores = [];
        var numSpores = 30;
        
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        
        function createSpore() {
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 2 + 1,
                alpha: Math.random() * 0.5 + 0.2
            };
        }
        
        function init() {
            resize();
            for (var i = 0; i < numSpores; i++) {
                spores.push(createSpore());
            }
        }
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            for (var i = 0; i < spores.length; i++) {
                var s = spores[i];
                s.x += s.vx;
                s.y += s.vy;
                
                if (s.x < 0 || s.x > canvas.width) s.vx *= -1;
                if (s.y < 0 || s.y > canvas.height) s.vy *= -1;
                
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(143, 227, 136, ' + s.alpha + ')';
                ctx.fill();
            }
            
            requestAnimationFrame(animate);
        }
        
        window.addEventListener('resize', resize);
        init();
        animate();
    }

    // Public API
    return {
        /**
         * Initialize the application
         */
        init: init,

        /**
         * Check if app is initialized
         * @returns {boolean} True if initialized
         */
        isReady: function() {
            return isInitialized;
        },

        /**
         * Get current active module
         * @returns {string|null} Current module name
         */
        getCurrentModule: function() {
            return currentModule;
        },

        /**
         * Programmatically load a module
         * @param {string} moduleName - The module to load
         */
        loadModule: function(moduleName) {
            loadModule(moduleName);
        },

        /**
         * Get app version info
         * @returns {Object} Version information
         */
        getInfo: function() {
            return {
                name: LumoConfig.getAppName(),
                version: LumoConfig.getVersion(),
                initialized: isInitialized,
                storageReady: LumoStorage.isReady()
            };
        },

        /**
         * Open inspector panel
         */
        openInspector: function() {
            if (shell) {
                shell.classList.add('insp');
            }
        },

        /**
         * Close inspector panel
         */
        closeInspector: closeInspector
    };
})();

// Auto-initialize when DOM is ready
(function() {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            LumoApp.init();
        });
    } else {
        LumoApp.init();
    }
})();
