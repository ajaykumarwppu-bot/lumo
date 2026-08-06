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
    var navLinks = [];
    var workspaceContent = null;

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
        navLinks = document.querySelectorAll('.nav-link');

        // Verify DOM elements are available
        if (!workspaceContent) {
            console.error('[Lumo] Workspace content element not found!');
            return;
        }

        // Set up event listeners
        setupEventListeners();

        // Load default module
        loadDefaultModule();

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
        for (var i = 0; i < navLinks.length; i++) {
            navLinks[i].addEventListener('click', handleNavClick);
        }

        // Optional: Handle browser back/forward
        window.addEventListener('popstate', handlePopState);

        console.log('[Lumo] Event listeners attached');
    }

    /**
     * Handle navigation link clicks
     * @private
     * @param {Event} event - The click event
     */
    function handleNavClick(event) {
        event.preventDefault();

        var link = event.currentTarget;
        var moduleName = link.getAttribute('data-module');

        if (moduleName) {
            loadModule(moduleName);
            updateActiveNav(link);
        }
    }

    /**
     * Update active navigation state
     * @private
     * @param {HTMLElement} activeLink - The currently active link
     */
    function updateActiveNav(activeLink) {
        // Remove active class from all links
        for (var i = 0; i < navLinks.length; i++) {
            navLinks[i].classList.remove('active');
        }

        // Add active class to clicked link
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    /**
     * Load the default module on startup
     * @private
     */
    function loadDefaultModule() {
        var defaultModule = LumoConfig.get('ui.defaultModule') || 'dashboard';
        
        // Find the nav link for the default module
        for (var i = 0; i < navLinks.length; i++) {
            var link = navLinks[i];
            if (link.getAttribute('data-module') === defaultModule) {
                loadModule(defaultModule);
                updateActiveNav(link);
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
        
        // Placeholder: Just show module name in workspace
        // Actual module loading will be implemented later
        if (workspaceContent) {
            workspaceContent.innerHTML = 
                '<div class="module-placeholder">' +
                    '<h2 class="module-title">' + capitalizeFirstLetter(moduleName) + '</h2>' +
                    '<p class="module-description">Module content will be loaded here.</p>' +
                '</div>';
        }

        // Store current module in history
        if (window.history && window.history.pushState) {
            window.history.pushState({ module: moduleName }, moduleName, '#' + moduleName);
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
            for (var i = 0; i < navLinks.length; i++) {
                var link = navLinks[i];
                if (link.getAttribute('data-module') === event.state.module) {
                    updateActiveNav(link);
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
        }
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
