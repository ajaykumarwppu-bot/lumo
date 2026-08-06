/**
 * Lumo - Configuration File
 * 
 * Central configuration for the application.
 * Contains app settings, constants, and configuration options.
 */

var LumoConfig = (function() {
    'use strict';

    // Application Settings
    var config = {
        appName: 'Lumo',
        version: '1.0.0',
        
        // Storage Settings
        storage: {
            prefix: 'lumo_',
            engine: 'localStorage' // Options: 'localStorage', 'sessionStorage'
        },
        
        // Module Names (for reference)
        modules: [
            'dashboard',
            'tasks',
            'goals',
            'habits',
            'calendar',
            'subjects',
            'time',
            'canvas'
        ],
        
        // UI Settings
        ui: {
            defaultModule: 'dashboard',
            animationDuration: 200,
            maxRecentItems: 10
        },
        
        // Date/Time Settings
        dateTime: {
            dateFormat: 'YYYY-MM-DD',
            timeFormat: 'HH:mm',
            firstDayOfWeek: 1 // Monday
        }
    };

    // Public API
    return {
        /**
         * Get a configuration value
         * @param {string} key - The configuration key (dot notation supported)
         * @returns {*} The configuration value or undefined if not found
         */
        get: function(key) {
            var keys = key.split('.');
            var value = config;
            
            for (var i = 0; i < keys.length; i++) {
                if (value[keys[i]] !== undefined) {
                    value = value[keys[i]];
                } else {
                    return undefined;
                }
            }
            
            return value;
        },
        
        /**
         * Set a configuration value
         * @param {string} key - The configuration key (dot notation supported)
         * @param {*} value - The value to set
         * @returns {boolean} True if successful, false otherwise
         */
        set: function(key, value) {
            var keys = key.split('.');
            var current = config;
            
            for (var i = 0; i < keys.length - 1; i++) {
                if (current[keys[i]] === undefined) {
                    return false;
                }
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
            return true;
        },
        
        /**
         * Get the entire configuration object
         * @returns {Object} A copy of the configuration object
         */
        getAll: function() {
            return JSON.parse(JSON.stringify(config));
        },
        
        /**
         * Get app name
         * @returns {string} The application name
         */
        getAppName: function() {
            return config.appName;
        },
        
        /**
         * Get app version
         * @returns {string} The application version
         */
        getVersion: function() {
            return config.version;
        }
    };
})();

// Log configuration loaded
console.log('[Lumo] Configuration loaded - Version:', LumoConfig.getVersion());
