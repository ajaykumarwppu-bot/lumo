/**
 * Lumo - Storage Abstraction Layer
 * 
 * Provides a unified interface for data persistence.
 * Supports localStorage and sessionStorage with automatic fallback.
 */

var LumoStorage = (function() {
    'use strict';

    // Private variables
    var storageEngine = null;
    var prefix = '';
    var isAvailable = false;

    /**
     * Initialize the storage engine
     * @private
     */
    function initEngine() {
        var config = LumoConfig.get('storage');
        prefix = config.prefix || 'lumo_';
        
        // Check if specified engine is available
        if (config.engine === 'sessionStorage') {
            try {
                sessionStorage.setItem('test', 'test');
                sessionStorage.removeItem('test');
                storageEngine = sessionStorage;
                isAvailable = true;
            } catch (e) {
                console.warn('[Lumo] sessionStorage not available, falling back to localStorage');
            }
        }
        
        // Default to localStorage
        if (!isAvailable) {
            try {
                localStorage.setItem('test', 'test');
                localStorage.removeItem('test');
                storageEngine = localStorage;
                isAvailable = true;
            } catch (e) {
                console.error('[Lumo] Storage not available. Data persistence will be limited.');
                isAvailable = false;
            }
        }
    }

    /**
     * Generate a full key with prefix
     * @private
     * @param {string} key - The base key
     * @returns {string} The prefixed key
     */
    function makeKey(key) {
        return prefix + key;
    }

    /**
     * Safely parse JSON
     * @private
     * @param {string} value - The JSON string to parse
     * @returns {*} The parsed value or null if parsing fails
     */
    function safeParse(value) {
        try {
            return JSON.parse(value);
        } catch (e) {
            console.error('[Lumo] Failed to parse stored data:', e);
            return null;
        }
    }

    // Public API
    return {
        /**
         * Initialize the storage layer
         */
        init: function() {
            initEngine();
            console.log('[Lumo] Storage initialized - Engine:', storageEngine ? storageEngine === localStorage ? 'localStorage' : 'sessionStorage' : 'none');
        },

        /**
         * Check if storage is available
         * @returns {boolean} True if storage is available
         */
        isReady: function() {
            return isAvailable;
        },

        /**
         * Store a value
         * @param {string} key - The key to store under
         * @param {*} value - The value to store (will be JSON serialized)
         * @returns {boolean} True if successful
         */
        set: function(key, value) {
            if (!isAvailable || !key) {
                return false;
            }
            
            try {
                storageEngine.setItem(makeKey(key), JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('[Lumo] Storage set error:', e);
                return false;
            }
        },

        /**
         * Retrieve a value
         * @param {string} key - The key to retrieve
         * @param {*} defaultValue - Default value if key doesn't exist
         * @returns {*} The stored value or default
         */
        get: function(key, defaultValue) {
            if (!isAvailable || !key) {
                return defaultValue !== undefined ? defaultValue : null;
            }
            
            try {
                var item = storageEngine.getItem(makeKey(key));
                if (item === null) {
                    return defaultValue !== undefined ? defaultValue : null;
                }
                return safeParse(item);
            } catch (e) {
                console.error('[Lumo] Storage get error:', e);
                return defaultValue !== undefined ? defaultValue : null;
            }
        },

        /**
         * Remove a stored value
         * @param {string} key - The key to remove
         * @returns {boolean} True if successful
         */
        remove: function(key) {
            if (!isAvailable || !key) {
                return false;
            }
            
            try {
                storageEngine.removeItem(makeKey(key));
                return true;
            } catch (e) {
                console.error('[Lumo] Storage remove error:', e);
                return false;
            }
        },

        /**
         * Clear all Lumo data (with prefix only)
         * @returns {boolean} True if successful
         */
        clear: function() {
            if (!isAvailable) {
                return false;
            }
            
            try {
                var keysToRemove = [];
                for (var i = 0; i < storageEngine.length; i++) {
                    var key = storageEngine.key(i);
                    if (key && key.indexOf(prefix) === 0) {
                        keysToRemove.push(key);
                    }
                }
                
                for (var j = 0; j < keysToRemove.length; j++) {
                    storageEngine.removeItem(keysToRemove[j]);
                }
                
                return true;
            } catch (e) {
                console.error('[Lumo] Storage clear error:', e);
                return false;
            }
        },

        /**
         * Get all keys with Lumo prefix
         * @returns {Array<string>} Array of keys
         */
        keys: function() {
            if (!isAvailable) {
                return [];
            }
            
            var result = [];
            try {
                for (var i = 0; i < storageEngine.length; i++) {
                    var key = storageEngine.key(i);
                    if (key && key.indexOf(prefix) === 0) {
                        result.push(key.substring(prefix.length));
                    }
                }
            } catch (e) {
                console.error('[Lumo] Storage keys error:', e);
            }
            
            return result;
        },

        /**
         * Check if a key exists
         * @param {string} key - The key to check
         * @returns {boolean} True if key exists
         */
        has: function(key) {
            if (!isAvailable || !key) {
                return false;
            }
            
            try {
                return storageEngine.getItem(makeKey(key)) !== null;
            } catch (e) {
                return false;
            }
        }
    };
})();

// Log storage loaded (init happens separately)
console.log('[Lumo] Storage module loaded');
