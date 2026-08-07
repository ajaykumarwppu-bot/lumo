/**
 * Lumo - Habit Tracker Module
 * 
 * Tracks good and bad habits with discipline scoring,
 * 90-day streak grid, challenge mode, and edit history.
 */

var LumoHabitTracker = (function() {
    'use strict';

    // Private variables
    var isInitialized = false;
    var habitData = null;
    var storageKey = 'habit_tracker_data';
    var modalContainer = null;

    // Predefined challenges
    var predefinedChallenges = {
        '75hard': {
            title: '75 Hard Challenge',
            tagline: 'Mental Toughness',
            duration: 75,
            durationType: 'Days',
            rules: [
                'Follow a diet (no cheat meals)',
                'Two 45-minute workouts (one must be outdoors)',
                'Drink 4 liters of water daily',
                'Read 10 pages of a book (non-fiction)',
                'Take a progress picture every day'
            ]
        },
        '66day': {
            title: '66 Day Challenge',
            tagline: 'Build a Habit',
            duration: 66,
            durationType: 'Days',
            rules: [
                'Complete your chosen habit daily',
                'Track your progress consistently',
                'No skipping days'
            ]
        },
        'monkmode': {
            title: 'Monk Mode',
            tagline: '90 Days Deep Focus',
            duration: 90,
            durationType: 'Days',
            rules: [
                'No social media',
                'No alcohol or drugs',
                '3+ hours deep work daily',
                'Daily meditation (10+ minutes)',
                'Exercise regularly',
                'Sleep 7-8 hours nightly'
            ]
        },
        'dopaminedetox': {
            title: 'Dopamine Detox',
            tagline: '24 Hours Reset',
            duration: 24,
            durationType: 'Hours',
            rules: [
                'No social media or entertainment',
                'No video games',
                'No junk food',
                'No excessive consumption',
                'Focus on productive activities only'
            ]
        }
    };

    /**
     * Initialize the habit tracker module
     * @private
     */
    function init() {
        if (isInitialized) {
            console.warn('[HabitTracker] Already initialized');
            return;
        }

        console.log('[HabitTracker] Initializing...');

        // Load data from storage or initialize default
        habitData = LumoStorage.get(storageKey);

        if (!habitData) {
            habitData = createDefaultData();
            saveData();
        }

        // Process 24-hour delete rule for old deleted habits
        processDeletedHabits();

        isInitialized = true;
        console.log('[HabitTracker] Initialized successfully');
    }

    /**
     * Create default habit data structure
     * @private
     * @returns {Object} Default habit data
     */
    function createDefaultData() {
        return {
            disciplineScore: 50, // Starting score
            goodHabits: [],
            badHabits: [],
            deletedGoodHabits: [],
            deletedBadHabits: [],
            activeChallenge: null
        };
    }

    /**
     * Save current data to storage
     * @private
     */
    function saveData() {
        LumoStorage.set(storageKey, habitData);
    }

    /**
     * Get current timestamp
     * @private
     * @returns {number} Current timestamp in milliseconds
     */
    function getTimestamp() {
        return new Date().getTime();
    }

    /**
     * Get current date string (YYYY-MM-DD)
     * @private
     * @returns {string} Current date string
     */
    function getDateString() {
        var now = new Date();
        var year = now.getFullYear();
        var month = String(now.getMonth() + 1).padStart(2, '0');
        var day = String(now.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    /**
     * Get time string (HH:MM AM/PM)
     * @private
     * @returns {string} Current time string
     */
    function getTimeString() {
        var now = new Date();
        var hours = now.getHours();
        var minutes = String(now.getMinutes()).padStart(2, '0');
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return hours + ':' + minutes + ' ' + ampm;
    }

    /**
     * Update discipline score based on action type
     * @private
     * @param {string} type - Type of action (good, bad, challenge_boost, challenge_fail)
     */
    function updateScore(type) {
        if (type === 'good') {
            habitData.disciplineScore += 0.2;
        } else if (type === 'bad') {
            habitData.disciplineScore -= 2.0;
        } else if (type === 'challenge_boost') {
            habitData.disciplineScore += 15.0;
        } else if (type === 'challenge_fail') {
            habitData.disciplineScore -= 10.0;
        }

        // Clamp between 0-100
        habitData.disciplineScore = Math.max(0, Math.min(100, habitData.disciplineScore));
        
        // Round to 1 decimal place
        habitData.disciplineScore = Math.round(habitData.disciplineScore * 10) / 10;

        saveData();
    }

    /**
     * Calculate good habit streak
     * @private
     * @param {Object} history - Habit history object
     * @param {number} reps - Required repetitions per day
     * @param {string} startDate - Start date string
     * @returns {number} Current streak in days
     */
    function calculateGoodStreak(history, reps, startDate) {
        var streak = 0;
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        // Start from today or yesterday if not done yet
        var checkDate = new Date(today);
        var todayStr = getDateStringFromDate(checkDate);

        // If today is not complete, start checking from yesterday
        if (!history[todayStr] || history[todayStr].length < reps) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        var start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        while (checkDate >= start) {
            var dateStr = getDateStringFromDate(checkDate);
            var entries = history[dateStr];

            if (entries && entries.length >= reps) {
                streak++;
            } else {
                break;
            }

            checkDate.setDate(checkDate.getDate() - 1);
        }

        return streak;
    }

    /**
     * Calculate bad habit streak (clean days)
     * @private
     * @param {Object} history - Habit history object
     * @param {string} startDate - Start date string
     * @returns {number} Current streak in days
     */
    function calculateBadStreak(history, startDate) {
        var streak = 0;
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var checkDate = new Date(today);
        var start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        while (checkDate >= start) {
            var dateStr = getDateStringFromDate(checkDate);
            var dayData = history[dateStr];

            // Count as success if no fails OR shield was activated
            if (!dayData || !dayData.fails || dayData.fails.length === 0 || dayData.protected) {
                streak++;
            } else {
                break;
            }

            checkDate.setDate(checkDate.getDate() - 1);
        }

        return streak;
    }

    /**
     * Get date string from Date object
     * @private
     * @param {Date} date - Date object
     * @returns {string} Date string in YYYY-MM-DD format
     */
    function getDateStringFromDate(date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    /**
     * Generate 90-day grid data for visualization
     * @private
     * @param {Object} habit - Habit object
     * @param {boolean} isGood - Whether it's a good habit
     * @returns {Array} Array of 90 day objects with completion status
     */
    function generate90DayGrid(habit, isGood) {
        var grid = [];
        var today = new Date();
        var startDate = new Date(habit.start || habit.createdAt);

        for (var i = 89; i >= 0; i--) {
            var date = new Date(today);
            date.setDate(date.getDate() - i);
            var dateStr = getDateStringFromDate(date);

            var dayData = {
                date: dateStr,
                completed: false,
                protected: false,
                count: 0
            };

            if (isGood) {
                var history = habit.history || {};
                var entries = history[dateStr];
                if (entries && entries.length >= habit.repetitions) {
                    dayData.completed = true;
                    dayData.count = entries.length;
                }
            } else {
                var badHistory = habit.history || {};
                var badDayData = badHistory[dateStr];
                if (badDayData) {
                    if (badDayData.protected) {
                        dayData.protected = true;
                        dayData.completed = true;
                    }
                    if (!badDayData.fails || badDayData.fails.length === 0) {
                        dayData.completed = true;
                    }
                } else {
                    dayData.completed = true;
                }
            }

            grid.push(dayData);
        }

        return grid;
    }

    /**
     * Process deleted habits (move to history after 24 hours)
     * @private
     */
    function processDeletedHabits() {
        var now = getTimestamp();
        var twentyFourHours = 24 * 60 * 60 * 1000;

        // Check deleted good habits
        for (var i = habitData.deletedGoodHabits.length - 1; i >= 0; i--) {
            var deleted = habitData.deletedGoodHabits[i];
            if (now - deleted.deletedAt > twentyFourHours) {
                // Keep in deleted array permanently for audit trail
                // Just mark as archived
                deleted.archived = true;
            }
        }

        // Check deleted bad habits
        for (var j = habitData.deletedBadHabits.length - 1; j >= 0; j--) {
            var deletedBad = habitData.deletedBadHabits[j];
            if (now - deletedBad.deletedAt > twentyFourHours) {
                deletedBad.archived = true;
            }
        }

        saveData();
    }

    /**
     * Escape HTML special characters
     * @private
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Create custom modal popup
     * @private
     * @param {string} title - Modal title
     * @param {string} content - Modal HTML content
     * @param {function} onSave - Save callback function
     */
    function createModal(title, content, onSave) {
        removeModal();
        
        var modalContainer = document.createElement('div');
        modalContainer.id = 'lumo-modal-overlay';
        modalContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
        
        var modalBox = document.createElement('div');
        modalBox.className = 'rise';
        modalBox.style.cssText = 'background:var(--bg-secondary);border-radius:16px;padding:24px;width:90%;max-width:450px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.4);';
        
        var header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;';
        header.innerHTML = '<h3 style="margin:0;font-size:18px;color:var(--fg);">' + escapeHtml(title) + '</h3>';
        
        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = 'background:none;border:none;font-size:24px;color:var(--dim);cursor:pointer;padding:0;line-height:1;';
        closeBtn.onclick = removeModal;
        header.appendChild(closeBtn);
        
        var contentDiv = document.createElement('div');
        contentDiv.innerHTML = content;
        contentDiv.style.cssText = 'margin-bottom:20px;';
        
        var footer = document.createElement('div');
        footer.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
        
        var cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'padding:10px 20px;background:var(--line);color:var(--fg);border:none;border-radius:8px;cursor:pointer;font-size:14px;';
        cancelBtn.onclick = removeModal;
        
        var saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.style.cssText = 'padding:10px 20px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;';
        saveBtn.onclick = function() {
            if (onSave && onSave()) {
                removeModal();
            }
        };
        
        footer.appendChild(cancelBtn);
        footer.appendChild(saveBtn);
        
        modalBox.appendChild(header);
        modalBox.appendChild(contentDiv);
        modalBox.appendChild(footer);
        modalContainer.appendChild(modalBox);
        document.body.appendChild(modalContainer);
        
        setTimeout(function() {
            var firstInput = modalBox.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 100);
    }
    
    function removeModal() {
        var modal = document.getElementById('lumo-modal-overlay');
        if (modal) {
            document.body.removeChild(modal);
        }
    }
    
    function getModalInput(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    // ==================== PUBLIC API ====================

    return {
        /**
         * Initialize the habit tracker
         */
        init: init,

        /**
         * Check if module is initialized
         * @returns {boolean} True if initialized
         */
        isReady: function() {
            return isInitialized;
        },

        /**
         * Get all habit data
         * @returns {Object} Complete habit data
         */
        getData: function() {
            return JSON.parse(JSON.stringify(habitData));
        },

        /**
         * Get discipline score
         * @returns {number} Current discipline score (0-100)
         */
        getDisciplineScore: function() {
            return habitData.disciplineScore;
        },

        /**
         * Add a new good habit
         * @param {string} name - Habit name
         * @param {string} details - Optional description
         * @param {number} repetitions - Times per day
         * @param {string} startDate - Start date (optional, defaults to today)
         * @returns {Object} Created habit object
         */
        addGoodHabit: function(name, details, repetitions, startDate) {
            if (!name) {
                throw new Error('Habit name is required');
            }

            var habit = {
                name: name,
                details: details || '',
                start: startDate || getDateString(),
                repetitions: repetitions || 1,
                history: {},
                createdAtTimestamp: getTimestamp(),
                editHistory: []
            };

            habitData.goodHabits.push(habit);
            saveData();

            console.log('[HabitTracker] Added good habit:', name);
            return habit;
        },

        /**
         * Add a new bad habit
         * @param {string} name - Habit name
         * @param {string} duration - Duration info (e.g., "Since 2 years")
         * @param {string} startDate - Start date (optional)
         * @returns {Object} Created habit object
         */
        addBadHabit: function(name, duration, startDate) {
            if (!name) {
                throw new Error('Habit name is required');
            }

            var habit = {
                name: name,
                duration: duration || 'Unknown',
                history: {},
                createdAt: startDate || getDateString(),
                createdAtTimestamp: getTimestamp(),
                editHistory: []
            };

            habitData.badHabits.push(habit);
            saveData();

            console.log('[HabitTracker] Added bad habit:', name);
            return habit;
        },

        /**
         * Log completion of a good habit and re-render UI
         * @param {number} habitIndex - Index of the habit in goodHabits array
         * @returns {boolean} True if logged successfully
         */
        logGoodHabit: function(habitIndex) {
            if (habitIndex < 0 || habitIndex >= habitData.goodHabits.length) {
                console.error('[HabitTracker] Invalid habit index');
                return false;
            }

            var habit = habitData.goodHabits[habitIndex];
            var today = getDateString();
            var time = getTimeString();

            if (!habit.history[today]) {
                habit.history[today] = [];
            }

            habit.history[today].push(time);
            updateScore('good');
            saveData();

            console.log('[HabitTracker] Logged good habit:', habit.name, 'at', time);
            
            // Re-render UI after logging
            LumoHabitTracker.renderToMain();
            
            return true;
        },

        /**
         * Log failure of a bad habit
         * @param {number} habitIndex - Index of the habit in badHabits array
         * @param {string} trigger - Trigger that caused the failure
         * @returns {boolean} True if logged successfully
         */
        logBadHabit: function(habitIndex, trigger) {
            if (habitIndex < 0 || habitIndex >= habitData.badHabits.length) {
                console.error('[HabitTracker] Invalid habit index');
                return false;
            }

            var habit = habitData.badHabits[habitIndex];
            var today = getDateString();
            var time = getTimeString();

            if (!habit.history[today]) {
                habit.history[today] = {
                    protected: false,
                    fails: []
                };
            }

            habit.history[today].fails.push({
                time: time,
                trigger: trigger || 'Unknown'
            });

            updateScore('bad');
            saveData();

            console.log('[HabitTracker] Logged bad habit failure:', habit.name, 'trigger:', trigger);
            return true;
        },

        /**
         * Activate shield protection for a bad habit and re-render UI
         * @param {number} habitIndex - Index of the habit in badHabits array
         * @returns {boolean} True if activated successfully
         */
        activateShield: function(habitIndex) {
            if (habitIndex < 0 || habitIndex >= habitData.badHabits.length) {
                console.error('[HabitTracker] Invalid habit index');
                return false;
            }

            var habit = habitData.badHabits[habitIndex];
            var today = getDateString();

            if (!habit.history[today]) {
                habit.history[today] = {
                    protected: true,
                    fails: []
                };
            } else {
                habit.history[today].protected = true;
            }

            saveData();
            console.log('[HabitTracker] Shield activated for:', habit.name);
            
            // Re-render UI after activating shield
            LumoHabitTracker.renderToMain();
            
            return true;
        },

        /**
         * Edit a good habit
         * @param {number} habitIndex - Index of the habit
         * @param {Object} changes - Object with fields to update
         * @returns {boolean} True if updated successfully
         */
        editGoodHabit: function(habitIndex, changes) {
            if (habitIndex < 0 || habitIndex >= habitData.goodHabits.length) {
                return false;
            }

            var habit = habitData.goodHabits[habitIndex];
            var log = [];

            if (changes.name !== undefined) {
                log.push('Changed name from "' + habit.name + '" to "' + changes.name + '"');
                habit.name = changes.name;
            }

            if (changes.details !== undefined) {
                log.push('Changed details');
                habit.details = changes.details;
            }

            if (changes.repetitions !== undefined) {
                log.push('Changed reps from ' + habit.repetitions + ' to ' + changes.repetitions);
                habit.repetitions = changes.repetitions;
            }

            if (log.length > 0) {
                habit.editHistory.push({
                    time: getTimestamp(),
                    log: log.join('; ')
                });
                saveData();
                console.log('[HabitTracker] Edited good habit:', habit.name);
            }

            return true;
        },

        /**
         * Edit a bad habit
         * @param {number} habitIndex - Index of the habit
         * @param {Object} changes - Object with fields to update
         * @returns {boolean} True if updated successfully
         */
        editBadHabit: function(habitIndex, changes) {
            if (habitIndex < 0 || habitIndex >= habitData.badHabits.length) {
                return false;
            }

            var habit = habitData.badHabits[habitIndex];
            var log = [];

            if (changes.name !== undefined) {
                log.push('Changed name from "' + habit.name + '" to "' + changes.name + '"');
                habit.name = changes.name;
            }

            if (changes.duration !== undefined) {
                log.push('Changed duration info');
                habit.duration = changes.duration;
            }

            if (log.length > 0) {
                habit.editHistory.push({
                    time: getTimestamp(),
                    log: log.join('; ')
                });
                saveData();
                console.log('[HabitTracker] Edited bad habit:', habit.name);
            }

            return true;
        },

        /**
         * Delete a good habit with confirmation modal
         * @param {number} habitIndex - Index of the habit
         */
        deleteGoodHabitUI: function(habitIndex) {
            var habit = habitData.goodHabits[habitIndex];
            if (!habit) return;
            
            var content = '<div style="color:var(--dim);font-size:14px;">Are you sure you want to delete "<strong>' + escapeHtml(habit.name) + '</strong>"? This will move it to deleted habits.</div>';
            
            createModal('Delete Good Habit', content, function() {
                try {
                    LumoHabitTracker.deleteGoodHabit(habitIndex);
                    LumoHabitTracker.renderToMain();
                    return true;
                } catch (e) {
                    alert('Error: ' + e.message);
                    return false;
                }
            });
        },

        /**
         * Delete a bad habit with confirmation modal
         * @param {number} habitIndex - Index of the habit
         */
        deleteBadHabitUI: function(habitIndex) {
            var habit = habitData.badHabits[habitIndex];
            if (!habit) return;
            
            var content = '<div style="color:var(--dim);font-size:14px;">Are you sure you want to delete "<strong>' + escapeHtml(habit.name) + '</strong>"? This will move it to deleted habits.</div>';
            
            createModal('Delete Bad Habit', content, function() {
                try {
                    LumoHabitTracker.deleteBadHabit(habitIndex);
                    LumoHabitTracker.renderToMain();
                    return true;
                } catch (e) {
                    alert('Error: ' + e.message);
                    return false;
                }
            });
        },

        /**
         * Delete a good habit (24-hour rule)
         * @param {number} habitIndex - Index of the habit
         * @returns {boolean} True if deleted successfully
         */
        deleteGoodHabit: function(habitIndex) {
            if (habitIndex < 0 || habitIndex >= habitData.goodHabits.length) {
                return false;
            }

            var habit = habitData.goodHabits.splice(habitIndex, 1)[0];
            habit.deletedAt = getTimestamp();

            habitData.deletedGoodHabits.push(habit);
            saveData();

            console.log('[HabitTracker] Deleted good habit:', habit.name);
            return true;
        },

        /**
         * Delete a bad habit (24-hour rule)
         * @param {number} habitIndex - Index of the habit
         * @returns {boolean} True if deleted successfully
         */
        deleteBadHabit: function(habitIndex) {
            if (habitIndex < 0 || habitIndex >= habitData.badHabits.length) {
                return false;
            }

            var habit = habitData.badHabits.splice(habitIndex, 1)[0];
            habit.deletedAt = getTimestamp();

            habitData.deletedBadHabits.push(habit);
            saveData();

            console.log('[HabitTracker] Deleted bad habit:', habit.name);
            return true;
        },

        /**
         * Get streak for a good habit
         * @param {number} habitIndex - Index of the habit
         * @returns {number} Current streak in days
         */
        getGoodHabitStreak: function(habitIndex) {
            if (habitIndex < 0 || habitIndex >= habitData.goodHabits.length) {
                return 0;
            }

            var habit = habitData.goodHabits[habitIndex];
            return calculateGoodStreak(habit.history, habit.repetitions, habit.start);
        },

        /**
         * Get streak for a bad habit
         * @param {number} habitIndex - Index of the habit
         * @returns {number} Current streak in days
         */
        getBadHabitStreak: function(habitIndex) {
            if (habitIndex < 0 || habitIndex >= habitData.badHabits.length) {
                return 0;
            }

            var habit = habitData.badHabits[habitIndex];
            return calculateBadStreak(habit.history, habit.createdAt);
        },

        /**
         * Get 90-day grid for a habit
         * @param {number} habitIndex - Index of the habit
         * @param {boolean} isGood - Whether it's a good habit
         * @returns {Array} 90-day grid data
         */
        get90DayGrid: function(habitIndex, isGood) {
            if (isGood) {
                if (habitIndex < 0 || habitIndex >= habitData.goodHabits.length) {
                    return [];
                }
                return generate90DayGrid(habitData.goodHabits[habitIndex], true);
            } else {
                if (habitIndex < 0 || habitIndex >= habitData.badHabits.length) {
                    return [];
                }
                return generate90DayGrid(habitData.badHabits[habitIndex], false);
            }
        },

        /**
         * Get list of predefined challenges
         * @returns {Array} Array of challenge objects
         */
        getPredefinedChallenges: function() {
            var challenges = [];
            for (var key in predefinedChallenges) {
                if (predefinedChallenges.hasOwnProperty(key)) {
                    challenges.push({
                        id: key,
                        ...predefinedChallenges[key]
                    });
                }
            }
            return challenges;
        },

        /**
         * Start a predefined challenge
         * @param {string} challengeId - ID of the predefined challenge
         * @returns {Object} Active challenge object or null
         */
        startPredefinedChallenge: function(challengeId) {
            var template = predefinedChallenges[challengeId];
            if (!template) {
                console.error('[HabitTracker] Challenge not found:', challengeId);
                return null;
            }

            var progress = [];
            for (var i = 0; i < template.duration; i++) {
                progress.push(false);
            }

            habitData.activeChallenge = {
                title: template.title,
                tagline: template.tagline,
                duration: template.duration,
                durationType: template.durationType,
                rules: template.rules.slice(),
                progress: progress,
                currentStep: 0,
                startedAt: getTimestamp()
            };

            saveData();
            console.log('[HabitTracker] Started challenge:', template.title);
            return habitData.activeChallenge;
        },

        /**
         * Start a custom challenge
         * @param {string} name - Challenge name
         * @param {string} tagline - Challenge tagline/purpose
         * @param {number} duration - Duration number
         * @param {string} durationType - Days, Weeks, etc.
         * @param {Array} rules - Array of rule strings
         * @returns {Object} Active challenge object
         */
        startCustomChallenge: function(name, tagline, duration, durationType, rules) {
            if (!name || !duration || !rules || rules.length === 0) {
                throw new Error('Invalid challenge parameters');
            }

            var progress = [];
            for (var i = 0; i < duration; i++) {
                progress.push(false);
            }

            habitData.activeChallenge = {
                title: name,
                tagline: tagline || '',
                duration: duration,
                durationType: durationType || 'Days',
                rules: rules.slice(),
                progress: progress,
                currentStep: 0,
                startedAt: getTimestamp(),
                isCustom: true
            };

            saveData();
            console.log('[HabitTracker] Started custom challenge:', name);
            return habitData.activeChallenge;
        },

        /**
         * Complete current day of active challenge
         * @returns {boolean} True if completed successfully
         */
        completeChallengeDay: function() {
            if (!habitData.activeChallenge) {
                console.error('[HabitTracker] No active challenge');
                return false;
            }

            var challenge = habitData.activeChallenge;
            if (challenge.currentStep >= challenge.duration) {
                console.error('[HabitTracker] Challenge already complete');
                return false;
            }

            challenge.progress[challenge.currentStep] = true;
            challenge.currentStep++;

            // Check if challenge is fully complete
            if (challenge.currentStep >= challenge.duration) {
                updateScore('challenge_boost');
                console.log('[HabitTracker] Challenge completed! Bonus score applied.');
            }

            saveData();
            return true;
        },

        /**
         * Fail current challenge (reset to day 1)
         * @returns {boolean} True if failed successfully
         */
        failChallenge: function() {
            if (!habitData.activeChallenge) {
                return false;
            }

            updateScore('challenge_fail');

            // Reset progress
            var challenge = habitData.activeChallenge;
            for (var i = 0; i < challenge.duration; i++) {
                challenge.progress[i] = false;
            }
            challenge.currentStep = 0;

            saveData();
            console.log('[HabitTracker] Challenge failed. Reset to day 1.');
            return true;
        },

        /**
         * Get active challenge
         * @returns {Object|null} Active challenge or null
         */
        getActiveChallenge: function() {
            return habitData.activeChallenge ? JSON.parse(JSON.stringify(habitData.activeChallenge)) : null;
        },

        /**
         * Cancel active challenge
         * @returns {boolean} True if cancelled
         */
        cancelChallenge: function() {
            if (!habitData.activeChallenge) {
                return false;
            }

            habitData.activeChallenge = null;
            saveData();
            console.log('[HabitTracker] Challenge cancelled');
            return true;
        },

        /**
         * Get edit history for a good habit
         * @param {number} habitIndex - Index of the habit
         * @returns {Array} Edit history array
         */
        getGoodHabitEditHistory: function(habitIndex) {
            if (habitIndex < 0 || habitIndex >= habitData.goodHabits.length) {
                return [];
            }
            return habitData.goodHabits[habitIndex].editHistory.slice();
        },

        /**
         * Get edit history for a bad habit
         * @param {number} habitIndex - Index of the habit
         * @returns {Array} Edit history array
         */
        getBadHabitEditHistory: function(habitIndex) {
            if (habitIndex < 0 || habitIndex >= habitData.badHabits.length) {
                return [];
            }
            return habitData.badHabits[habitIndex].editHistory.slice();
        },

        /**
         * Get deleted habits (audit trail)
         * @returns {Object} Object with deletedGoodHabits and deletedBadHabits arrays
         */
        getDeletedHabits: function() {
            return {
                deletedGoodHabits: habitData.deletedGoodHabits.slice(),
                deletedBadHabits: habitData.deletedBadHabits.slice()
            };
        },

        /**
         * Get today's progress summary
         * @returns {Object} Summary of today's habit progress
         */
        getTodaySummary: function() {
            var today = getDateString();
            var summary = {
                date: today,
                goodHabitsCompleted: 0,
                goodHabitsTotal: habitData.goodHabits.length,
                badHabitsFailed: 0,
                badHabitsTotal: habitData.badHabits.length,
                goodHabitDetails: [],
                badHabitDetails: []
            };

            // Good habits
            for (var i = 0; i < habitData.goodHabits.length; i++) {
                var habit = habitData.goodHabits[i];
                var entries = habit.history[today] || [];
                var completed = entries.length >= habit.repetitions;

                if (completed) {
                    summary.goodHabitsCompleted++;
                }

                summary.goodHabitDetails.push({
                    name: habit.name,
                    completed: completed,
                    entries: entries.length,
                    required: habit.repetitions
                });
            }

            // Bad habits
            for (var j = 0; j < habitData.badHabits.length; j++) {
                var badHabit = habitData.badHabits[j];
                var dayData = badHabit.history[today];
                var failed = dayData && dayData.fails && dayData.fails.length > 0;
                var isProtected = dayData && dayData.protected;

                if (failed) {
                    summary.badHabitsFailed++;
                }

                summary.badHabitDetails.push({
                    name: badHabit.name,
                    failed: failed,
                    protected: isProtected,
                    failCount: dayData ? dayData.fails.length : 0
                });
            }

            return summary;
        },

        /**
         * Reset all data (factory reset)
         */
        resetAll: function() {
            habitData = createDefaultData();
            saveData();
            console.log('[HabitTracker] All data reset');
        },

        /**
         * Show modal to add a good habit
         */
        showAddGoodHabit: function() {
            var today = getDateString();
            var content = '<div style="display:flex;flex-direction:column;gap:15px;">' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Habit Name *</label>' +
                '<input type="text" id="goodHabitName" placeholder="e.g., Morning Exercise" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Description</label>' +
                '<textarea id="goodHabitDetails" placeholder="Optional details about your habit" rows="2" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;resize:none;box-sizing:border-box;"></textarea>' +
                '</div>' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Start Date</label>' +
                '<input type="date" id="goodHabitStartDate" value="' + today + '" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Repetitions per Day</label>' +
                '<select id="goodHabitReps" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '<option value="1">1 time</option>' +
                '<option value="2">2 times</option>' +
                '<option value="3">3 times</option>' +
                '<option value="4">4 times</option>' +
                '<option value="5">5 times</option>' +
                '<option value="custom">Custom</option>' +
                '</select>' +
                '</div>' +
                '<div id="customRepsDiv" style="display:none;">' +
                '<input type="number" id="goodHabitRepsCustom" min="1" max="20" placeholder="Enter custom number" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '</div>';
            
            createModal('Add Good Habit', content, function() {
                var name = getModalInput('goodHabitName');
                if (!name) {
                    alert('Please enter a habit name');
                    return false;
                }
                
                var details = getModalInput('goodHabitDetails');
                var startDate = document.getElementById('goodHabitStartDate').value || today;
                var repsSelect = document.getElementById('goodHabitReps').value;
                var repetitions = repsSelect === 'custom' ? 
                    (parseInt(document.getElementById('goodHabitRepsCustom').value) || 1) : 
                    parseInt(repsSelect);
                
                try {
                    LumoHabitTracker.addGoodHabit(name, details, repetitions, startDate);
                    if (typeof LumoApp !== 'undefined' && LumoApp.currentModule === 'habits') {
                        LumoApp.loadModule('habits');
                    } else {
                        LumoHabitTracker.renderToMain();
                    }
                    return true;
                } catch (e) {
                    alert('Error: ' + e.message);
                    return false;
                }
            });
            
            // Add event listener for custom reps toggle
            setTimeout(function() {
                var repsSelect = document.getElementById('goodHabitReps');
                var customDiv = document.getElementById('customRepsDiv');
                if (repsSelect && customDiv) {
                    repsSelect.onchange = function() {
                        customDiv.style.display = this.value === 'custom' ? 'block' : 'none';
                        if (this.value === 'custom') {
                            document.getElementById('goodHabitRepsCustom').focus();
                        }
                    };
                }
            }, 100);
        },

        /**
         * Show modal to add a bad habit
         */
        showAddBadHabit: function() {
            var today = getDateString();
            var content = '<div style="display:flex;flex-direction:column;gap:15px;">' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Habit Name *</label>' +
                '<input type="text" id="badHabitName" placeholder="e.g., Smoking" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">How many years has this habit existed?</label>' +
                '<input type="number" id="badHabitYears" min="0" max="100" placeholder="e.g., 2" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Start Date</label>' +
                '<input type="date" id="badHabitStartDate" value="' + today + '" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '</div>';
            
            createModal('Add Bad Habit', content, function() {
                var name = getModalInput('badHabitName');
                if (!name) {
                    alert('Please enter a habit name');
                    return false;
                }
                
                var years = document.getElementById('badHabitYears').value;
                var duration = years ? 'Since ' + years + ' year' + (years != 1 ? 's' : '') : 'Unknown';
                var startDate = document.getElementById('badHabitStartDate').value || today;
                
                try {
                    LumoHabitTracker.addBadHabit(name, duration, startDate);
                    if (typeof LumoApp !== 'undefined' && LumoApp.currentModule === 'habits') {
                        LumoApp.loadModule('habits');
                    } else {
                        LumoHabitTracker.renderToMain();
                    }
                    return true;
                } catch (e) {
                    alert('Error: ' + e.message);
                    return false;
                }
            });
        },

        /**
         * Show challenges view
         */
        showChallenges: function() {
            var html = '<div class="viewhead rise">';
            html += '<span class="eyebrow">Challenges</span>';
            html += '<h1 class="vt">Challenge Mode</h1>';
            html += '<p class="sub">Take on structured challenges to build mental toughness.</p>';
            html += '</div>';

            if (habitData.activeChallenge) {
                html += '<div class="panel rise d1" style="margin-bottom:20px;">';
                html += '<div class="lbl">';
                html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">';
                html += '<path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>';
                html += '<path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>';
                html += '<path d="M4 22h16"/>';
                html += '<path d="M10 14.66V18c0 .55-.47.98-.97 1.21C7.85 19.75 6 21.5 6 22"/>';
                html += '<path d="M14 14.66V18c0 .55.47.98.97 1.21C16.15 19.75 18 21.5 18 22"/>';
                html += '<path d="M18 2H6v7a6 6 0 0012 0V2z"/>';
                html += '</svg>';
                html += '<span class="leaf">Active Challenge</span>';
                html += '</div>';
                
                var challenge = habitData.activeChallenge;
                var progressPercent = Math.round((challenge.currentStep / challenge.duration) * 100);
                
                html += '<div style="margin-top:15px;">';
                html += '<div style="font-weight:600;font-size:16px;color:var(--fg);">' + escapeHtml(challenge.title) + '</div>';
                html += '<div style="color:var(--dim);font-size:12.5px;margin-top:4px;">' + escapeHtml(challenge.tagline) + '</div>';
                
                html += '<div style="margin-top:15px;">';
                html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--dim);margin-bottom:6px;">';
                html += '<span>Progress: Day ' + challenge.currentStep + ' of ' + challenge.duration + '</span>';
                html += '<span>' + progressPercent + '%</span>';
                html += '</div>';
                html += '<div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;">';
                html += '<div style="width:' + progressPercent + '%;height:100%;background:var(--accent);border-radius:4px;"></div>';
                html += '</div>';
                html += '</div>';
                
                html += '<div style="margin-top:15px;">';
                html += '<button onclick="LumoHabitTracker.completeChallengeDay()" style="padding:10px 16px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">Complete Today</button>';
                html += '<button onclick="LumoHabitTracker.quitChallenge()" style="padding:10px 16px;background:var(--line);color:var(--fg);border:none;border-radius:8px;cursor:pointer;font-size:13px;margin-left:10px;">Quit Challenge</button>';
                html += '</div>';
                
                html += '<div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--line);">';
                html += '<div style="font-size:12.5px;font-weight:600;margin-bottom:8px;">Rules:</div>';
                html += '<ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--dim);">';
                for (var i = 0; i < challenge.rules.length; i++) {
                    html += '<li style="margin-bottom:4px;">' + escapeHtml(challenge.rules[i]) + '</li>';
                }
                html += '</ul>';
                html += '</div>';
                
                html += '</div>';
                html += '</div>';
            } else {
                html += '<div style="margin-bottom:20px;">';
                html += '<button onclick="LumoHabitTracker.startPredefinedChallenge(\'75hard\')" style="padding:12px 18px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;width:100%;margin-bottom:10px;text-align:left;">';
                html += '<strong>75 Hard Challenge</strong><br><span style="font-size:12px;opacity:0.9;">Mental Toughness - 75 Days</span>';
                html += '</button>';
                
                html += '<button onclick="LumoHabitTracker.startPredefinedChallenge(\'66day\')" style="padding:12px 18px;background:linear-gradient(135deg,#11998e,#38ef7d);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;width:100%;margin-bottom:10px;text-align:left;">';
                html += '<strong>66 Day Challenge</strong><br><span style="font-size:12px;opacity:0.9;">Build a Habit - 66 Days</span>';
                html += '</button>';
                
                html += '<button onclick="LumoHabitTracker.startPredefinedChallenge(\'monkmode\')" style="padding:12px 18px;background:linear-gradient(135deg,#8E2DE2,#4A00E0);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;width:100%;margin-bottom:10px;text-align:left;">';
                html += '<strong>Monk Mode</strong><br><span style="font-size:12px;opacity:0.9;">Deep Focus - 90 Days</span>';
                html += '</button>';
                
                html += '<button onclick="LumoHabitTracker.startPredefinedChallenge(\'dopaminedetox\')" style="padding:12px 18px;background:linear-gradient(135deg,#f093fb,#f5576c);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;width:100%;text-align:left;">';
                html += '<strong>Dopamine Detox</strong><br><span style="font-size:12px;opacity:0.9;">24 Hour Reset</span>';
                html += '</button>';
                html += '</div>';
                
                html += '<div class="panel rise d1">';
                html += '<div style="font-weight:600;margin-bottom:15px;">Create Custom Challenge</div>';
                html += '<button onclick="LumoHabitTracker.showAddChallenge()" style="padding:10px 16px;background:var(--line);color:var(--fg);border:none;border-radius:8px;cursor:pointer;font-size:13px;">+ Add Challenge</button>';
                html += '</div>';
            }

            // Inject into main content
            var container = document.getElementById('main-content');
            if (container) {
                container.innerHTML = html;
            }
        },

        /**
         * Show Add Challenge modal
         */
        showAddChallenge: function() {
            var today = getDateString();
            var content = '<div style="display:flex;flex-direction:column;gap:15px;">' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Challenge Name *</label>' +
                '<input type="text" id="challengeName" placeholder="e.g., No Sugar Challenge" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Purpose / Tagline</label>' +
                '<input type="text" id="challengeTagline" placeholder="e.g., Break free from sugar addiction" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Duration (days)</label>' +
                '<input type="number" id="challengeDuration" min="1" max="365" value="30" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Start Date</label>' +
                '<input type="date" id="challengeStartDate" value="' + today + '" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Rules (add multiple)</label>' +
                '<div id="rulesContainer" style="display:flex;flex-direction:column;gap:8px;"></div>' +
                '<button onclick="LumoHabitTracker.addRuleField()" style="margin-top:8px;padding:8px 12px;background:var(--line);color:var(--fg);border:none;border-radius:6px;cursor:pointer;font-size:12px;">+ Add Rule</button>' +
                '</div>' +
                '</div>';
            
            createModal('Add Challenge', content, function() {
                var name = getModalInput('challengeName');
                if (!name) {
                    alert('Please enter a challenge name');
                    return false;
                }
                
                var tagline = getModalInput('challengeTagline');
                var duration = parseInt(document.getElementById('challengeDuration').value) || 30;
                var startDate = document.getElementById('challengeStartDate').value || today;
                
                // Collect rules
                var rules = [];
                var ruleInputs = document.querySelectorAll('.rule-input');
                for (var i = 0; i < ruleInputs.length; i++) {
                    var rule = ruleInputs[i].value.trim();
                    if (rule) rules.push(rule);
                }
                
                if (rules.length === 0) {
                    alert('Please add at least one rule');
                    return false;
                }
                
                try {
                    LumoHabitTracker.startCustomChallenge(name, tagline, duration, 'Days', rules);
                    LumoHabitTracker.showChallenges();
                    return true;
                } catch (e) {
                    alert('Error: ' + e.message);
                    return false;
                }
            });
            
            // Add initial rule field
            setTimeout(function() {
                LumoHabitTracker.addRuleField();
            }, 100);
        },
        
        /**
         * Add a rule input field
         */
        addRuleField: function() {
            var container = document.getElementById('rulesContainer');
            if (!container) return;
            
            var ruleNum = container.children.length + 1;
            var ruleDiv = document.createElement('div');
            ruleDiv.style.cssText = 'display:flex;gap:8px;align-items:center;';
            ruleDiv.innerHTML = '<span style="font-size:12px;color:var(--dim);min-width:20px;">' + ruleNum + '.</span>' +
                '<input type="text" class="rule-input" placeholder="e.g., No processed sugar" style="flex:1;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg);font-size:13px;">' +
                '<button onclick="this.parentElement.remove();LumoHabitTracker.renumberRules()" style="padding:4px 8px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;">&times;</button>';
            container.appendChild(ruleDiv);
        },
        
        /**
         * Renumber rules after deletion
         */
        renumberRules: function() {
            var container = document.getElementById('rulesContainer');
            if (!container) return;
            
            var ruleInputs = container.querySelectorAll('.rule-input');
            for (var i = 0; i < ruleInputs.length; i++) {
                var span = ruleInputs[i].previousElementSibling;
                if (span) span.textContent = (i + 1) + '.';
            }
        },

        /**
         * Create custom challenge via prompts (legacy)
         */
        createCustomChallengeUI: function() {
            LumoHabitTracker.showAddChallenge();
        },

        /**
         * Show 90-day grid view
         */
        show90DayGrid: function() {
            var html = '<div class="viewhead rise">';
            html += '<span class="eyebrow">Streak Tracker</span>';
            html += '<h1 class="vt">90-Day Grid</h1>';
            html += '<p class="sub">Visual representation of your habit streaks.</p>';
            html += '</div>';

            if (habitData.goodHabits.length === 0 && habitData.badHabits.length === 0) {
                html += '<div class="panel rise d1">';
                html += '<p style="color:var(--dim);">No habits to display. Add some habits first.</p>';
                html += '</div>';
            } else {
                // Good Habits Grid
                if (habitData.goodHabits.length > 0) {
                    html += '<div class="panel rise d1" style="margin-bottom:20px;">';
                    html += '<div class="lbl"><span class="leaf">Good Habits</span></div>';
                    html += '<div style="margin-top:15px;">';
                    
                    for (var i = 0; i < habitData.goodHabits.length; i++) {
                        var habit = habitData.goodHabits[i];
                        var grid = generate90DayGrid(habit, true);
                        
                        html += '<div style="margin-bottom:20px;">';
                        html += '<div style="font-weight:600;margin-bottom:10px;">' + escapeHtml(habit.name) + ' (' + habit.repetitions + 'x/day)</div>';
                        html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;">';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">M</div>';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">T</div>';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">W</div>';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">T</div>';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">F</div>';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">S</div>';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">S</div>';
                        
                        for (var d = 0; d < grid.days.length; d++) {
                            var day = grid.days[d];
                            var color = day.completed ? '#22c55e' : day.isFuture ? 'transparent' : '#ef4444';
                            var border = day.isFuture ? '1px dashed var(--line)' : 'none';
                            html += '<div style="aspect-ratio:1;background:' + color + ';border:' + border + ';border-radius:3px;" title="' + day.date + '"></div>';
                        }
                        
                        html += '</div>';
                        html += '</div>';
                    }
                    
                    html += '</div>';
                    html += '</div>';
                }

                // Bad Habits Grid
                if (habitData.badHabits.length > 0) {
                    html += '<div class="panel rise d1">';
                    html += '<div class="lbl"><span class="leaf">Bad Habits (Clean Days)</span></div>';
                    html += '<div style="margin-top:15px;">';
                    
                    for (var j = 0; j < habitData.badHabits.length; j++) {
                        var badHabit = habitData.badHabits[j];
                        var grid = generate90DayGrid(badHabit, false);
                        
                        html += '<div style="margin-bottom:20px;">';
                        html += '<div style="font-weight:600;margin-bottom:10px;">' + escapeHtml(badHabit.name) + '</div>';
                        html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;">';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">M</div>';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">T</div>';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">W</div>';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">T</div>';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">F</div>';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">S</div>';
                        html += '<div style="font-size:10px;color:var(--dim);text-align:center;">S</div>';
                        
                        for (var k = 0; k < grid.days.length; k++) {
                            var day = grid.days[k];
                            var color = day.completed ? '#22c55e' : day.isFuture ? 'transparent' : '#ef4444';
                            var border = day.isFuture ? '1px dashed var(--line)' : 'none';
                            html += '<div style="aspect-ratio:1;background:' + color + ';border:' + border + ';border-radius:3px;" title="' + day.date + '"></div>';
                        }
                        
                        html += '</div>';
                        html += '</div>';
                    }
                    
                    html += '</div>';
                    html += '</div>';
                }
            }

            // Back button
            html += '<div style="margin-top:20px;">';
            html += '<button onclick="LumoHabitTracker.renderToMain()" style="padding:10px 16px;background:var(--line);color:var(--fg);border:none;border-radius:8px;cursor:pointer;font-size:13px;">← Back to Dashboard</button>';
            html += '</div>';

            var container = document.getElementById('main-content');
            if (container) {
                container.innerHTML = html;
            }
        },

        /**
         * Render main habit tracker view to DOM
         */
        renderToMain: function() {
            var container = document.getElementById('main-content');
            if (container) {
                container.innerHTML = LumoHabitTracker.render();
            }
        },

        /**
         * Log bad habit failure with custom modal
         */
        logBadHabitFail: function(habitIndex) {
            var content = '<div style="display:flex;flex-direction:column;gap:15px;">' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Trigger / What caused this relapse?</label>' +
                '<textarea id="badHabitTrigger" placeholder="e.g., Felt stressed, Saw a friend smoking, Boredom" rows="3" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;resize:none;box-sizing:border-box;"></textarea>' +
                '</div>' +
                '</div>';
            
            createModal('Log Relapse', content, function() {
                var trigger = document.getElementById('badHabitTrigger').value.trim() || 'Unknown';
                
                try {
                    LumoHabitTracker.logBadHabit(habitIndex, trigger);
                    LumoHabitTracker.renderToMain();
                    return true;
                } catch (e) {
                    alert('Error: ' + e.message);
                    return false;
                }
            });
        },

        /**
         * Edit good habit with custom modal
         */
        editGoodHabitUI: function(habitIndex) {
            var habit = habitData.goodHabits[habitIndex];
            if (!habit) return;
            
            var content = '<div style="display:flex;flex-direction:column;gap:15px;">' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Habit Name *</label>' +
                '<input type="text" id="editGoodHabitName" value="' + escapeHtml(habit.name) + '" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Description</label>' +
                '<textarea id="editGoodHabitDetails" rows="2" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;resize:none;box-sizing:border-box;">' + escapeHtml(habit.details) + '</textarea>' +
                '</div>' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Repetitions per Day</label>' +
                '<input type="number" id="editGoodHabitReps" min="1" max="20" value="' + habit.repetitions + '" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '</div>';
            
            createModal('Edit Good Habit', content, function() {
                var newName = getModalInput('editGoodHabitName');
                if (!newName) {
                    alert('Please enter a habit name');
                    return false;
                }
                
                var newDetails = getModalInput('editGoodHabitDetails');
                var newReps = parseInt(document.getElementById('editGoodHabitReps').value) || 1;
                
                var changes = {
                    name: newName,
                    details: newDetails,
                    repetitions: newReps
                };
                
                try {
                    LumoHabitTracker.editGoodHabit(habitIndex, changes);
                    LumoHabitTracker.renderToMain();
                    return true;
                } catch (e) {
                    alert('Error: ' + e.message);
                    return false;
                }
            });
        },

        /**
         * Edit bad habit with custom modal
         */
        editBadHabitUI: function(habitIndex) {
            var habit = habitData.badHabits[habitIndex];
            if (!habit) return;
            
            var yearsMatch = habit.duration.match(/Since (\d+) year/);
            var yearsValue = yearsMatch ? yearsMatch[1] : '';
            
            var content = '<div style="display:flex;flex-direction:column;gap:15px;">' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">Habit Name *</label>' +
                '<input type="text" id="editBadHabitName" value="' + escapeHtml(habit.name) + '" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '<div>' +
                '<label style="display:block;font-size:13px;color:var(--dim);margin-bottom:6px;">How many years has this habit existed?</label>' +
                '<input type="number" id="editBadHabitYears" min="0" max="100" value="' + yearsValue + '" placeholder="e.g., 2" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:14px;box-sizing:border-box;">' +
                '</div>' +
                '</div>';
            
            createModal('Edit Bad Habit', content, function() {
                var newName = getModalInput('editBadHabitName');
                if (!newName) {
                    alert('Please enter a habit name');
                    return false;
                }
                
                var years = document.getElementById('editBadHabitYears').value;
                var newDuration = years ? 'Since ' + years + ' year' + (years != 1 ? 's' : '') : 'Unknown';
                
                var changes = {
                    name: newName,
                    duration: newDuration
                };
                
                try {
                    LumoHabitTracker.editBadHabit(habitIndex, changes);
                    LumoHabitTracker.renderToMain();
                    return true;
                } catch (e) {
                    alert('Error: ' + e.message);
                    return false;
                }
            });
        },

        /**
         * Render the habit tracker UI
         * @returns {string} HTML content for the habit tracker module
         */
        render: function() {
            if (!isInitialized) {
                init();
            }

            var html = '';
            
            // Header section with discipline score
            var score = habitData.disciplineScore;
            var scoreColor = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
            
            html += '<div class="viewhead rise">';
            html += '<span class="eyebrow">Habit Tracker</span>';
            html += '<h1 class="vt">Habits & Discipline</h1>';
            html += '<p class="sub">Track your habits, build discipline, and complete challenges.</p>';
            html += '</div>';

            // Discipline Score Card - Reduced height
            html += '<div class="panel rise d1" style="margin-bottom:20px;padding:15px;">';
            html += '<div class="lbl">';
            html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">';
            html += '<circle cx="12" cy="12" r="9"/>';
            html += '<path d="M12 3v18M3 12h18"/>';
            html += '</svg>';
            html += '<span class="leaf">Discipline Score</span>';
            html += '</div>';
            html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">';
            html += '<div style="flex:1;">';
            html += '<div style="font-size:28px;font-weight:bold;color:' + scoreColor + ';">' + Math.round(score) + '%</div>';
            html += '<div style="color:var(--dim);font-size:12px;margin-top:3px;">Current discipline level</div>';
            html += '</div>';
            html += '<div style="width:70px;height:70px;border-radius:50%;border:6px solid ' + scoreColor + ';display:flex;align-items:center;justify-content:center;">';
            html += '<svg viewBox="0 0 24 24" width="35" height="35" stroke="' + scoreColor + '" fill="none" stroke-width="1.5">';
            html += '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>';
            html += '</svg>';
            html += '</div>';
            html += '</div>';
            html += '</div>';

            // Quick Actions
            html += '<div class="panel rise d1" style="margin-bottom:20px;">';
            html += '<div style="display:flex;gap:10px;flex-wrap:wrap;">';
            html += '<button onclick="LumoHabitTracker.showAddGoodHabit()" style="padding:10px 16px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">+ Add Good Habit</button>';
            html += '<button onclick="LumoHabitTracker.showAddBadHabit()" style="padding:10px 16px;background:#ef4444;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">+ Add Bad Habit</button>';
            html += '<button onclick="LumoHabitTracker.showChallenges()" style="padding:10px 16px;background:var(--line);color:var(--fg);border:none;border-radius:8px;cursor:pointer;font-size:13px;">View Challenges</button>';
            html += '<button onclick="LumoHabitTracker.show90DayGrid()" style="padding:10px 16px;background:var(--line);color:var(--fg);border:none;border-radius:8px;cursor:pointer;font-size:13px;">90-Day Grid</button>';
            html += '</div>';
            html += '</div>';

            // Two Column Layout - Good Habits (Left) and Bad Habits (Right)
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">';
            
            // Good Habits Section (Left)
            html += '<div class="panel rise d1">';
            html += '<div class="lbl">';
            html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">';
            html += '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>';
            html += '<polyline points="22 4 12 14.01 9 11.01"/>';
            html += '</svg>';
            html += '<span class="leaf">Good Habits</span>';
            html += '</div>';
            
            if (habitData.goodHabits.length === 0) {
                html += '<p style="color:var(--dim);font-size:13.5px;line-height:1.7;margin-top:15px;">No good habits yet.</p>';
            } else {
                html += '<div style="display:flex;flex-direction:column;gap:10px;margin-top:15px;">';
                for (var i = 0; i < habitData.goodHabits.length; i++) {
                    var habit = habitData.goodHabits[i];
                    var today = new Date().toISOString().split('T')[0];
                    var entries = habit.history[today] || [];
                    var completed = entries.length >= habit.repetitions;
                    var streak = calculateGoodStreak(habit.history, habit.repetitions, habit.start);
                    
                    html += '<div style="border:1px solid var(--line);border-radius:8px;padding:10px;">';
                    html += '<div style="display:flex;justify-content:space-between;align-items:start;">';
                    html += '<div style="flex:1;">';
                    html += '<div style="font-weight:600;color:var(--fg);">' + escapeHtml(habit.name) + '</div>';
                    if (habit.details) {
                        html += '<div style="color:var(--dim);font-size:11px;margin-top:2px;">' + escapeHtml(habit.details) + '</div>';
                    }
                    html += '<div style="color:var(--dim);font-size:10.5px;margin-top:4px;">';
                    html += habit.repetitions + 'x/day &middot; Streak: <strong style="color:var(--accent);">' + streak + 'd</strong>';
                    html += '</div>';
                    html += '</div>';
                    html += '<div style="text-align:right;">';
                    if (completed) {
                        html += '<div style="color:#22c55e;font-size:10px;font-weight:600;">✓ Done</div>';
                    } else {
                        html += '<div style="color:var(--dim);font-size:10px;">' + entries.length + '/' + habit.repetitions + '</div>';
                    }
                    html += '<div style="margin-top:4px;">';
                    html += '<button onclick="LumoHabitTracker.logGoodHabit(' + i + ')" style="padding:4px 8px;background:var(--accent);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:10px;">Log</button>';
                    html += '<button onclick="LumoHabitTracker.editGoodHabitUI(' + i + ')" style="padding:4px 8px;background:var(--line);color:var(--fg);border:none;border-radius:4px;cursor:pointer;font-size:10px;margin-left:3px;">Edit</button>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                }
                html += '</div>';
            }
            html += '</div>';

            // Bad Habits Section (Right)
            html += '<div class="panel rise d1">';
            html += '<div class="lbl">';
            html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">';
            html += '<circle cx="12" cy="12" r="10"/>';
            html += '<line x1="15" y1="9" x2="9" y2="15"/>';
            html += '<line x1="9" y1="9" x2="15" y2="15"/>';
            html += '</svg>';
            html += '<span class="leaf">Bad Habits</span>';
            html += '</div>';
            
            if (habitData.badHabits.length === 0) {
                html += '<p style="color:var(--dim);font-size:13.5px;line-height:1.7;margin-top:15px;">No bad habits tracked.</p>';
            } else {
                html += '<div style="display:flex;flex-direction:column;gap:10px;margin-top:15px;">';
                for (var i = 0; i < habitData.badHabits.length; i++) {
                    var badHabit = habitData.badHabits[i];
                    var today = new Date().toISOString().split('T')[0];
                    var dayData = badHabit.history[today];
                    var failed = dayData && dayData.fails && dayData.fails.length > 0;
                    var isProtected = dayData && dayData.protected;
                    var streak = calculateBadStreak(badHabit.history, badHabit.createdAt);
                    
                    html += '<div style="border:1px solid var(--line);border-radius:8px;padding:10px;">';
                    html += '<div style="display:flex;justify-content:space-between;align-items:start;">';
                    html += '<div style="flex:1;">';
                    html += '<div style="font-weight:600;color:var(--fg);">' + escapeHtml(badHabit.name) + '</div>';
                    if (badHabit.duration) {
                        html += '<div style="color:var(--dim);font-size:11px;margin-top:2px;">' + escapeHtml(badHabit.duration) + '</div>';
                    }
                    html += '<div style="color:var(--dim);font-size:10.5px;margin-top:4px;">';
                    html += 'Clean: <strong style="color:#22c55e;">' + streak + 'd</strong>';
                    html += '</div>';
                    html += '</div>';
                    html += '<div style="text-align:right;">';
                    if (isProtected) {
                        html += '<div style="color:#22c55e;font-size:10px;font-weight:600;">🛡️ Safe</div>';
                    } else if (failed) {
                        html += '<div style="color:#ef4444;font-size:10px;font-weight:600;">✗ Failed</div>';
                    } else {
                        html += '<div style="color:#22c55e;font-size:10px;font-weight:600;">✓ Clean</div>';
                    }
                    html += '<div style="margin-top:4px;">';
                    if (!isProtected && !failed) {
                        html += '<button onclick="LumoHabitTracker.activateShield(' + i + ')" style="padding:4px 6px;background:var(--line);color:var(--fg);border:none;border-radius:4px;cursor:pointer;font-size:9px;">🛡️</button>';
                    }
                    if (!failed) {
                        html += '<button onclick="LumoHabitTracker.logBadHabitFail(' + i + ')" style="padding:4px 6px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:9px;margin-left:3px;">Log</button>';
                    }
                    html += '<button onclick="LumoHabitTracker.editBadHabitUI(' + i + ')" style="padding:4px 6px;background:var(--line);color:var(--fg);border:none;border-radius:4px;cursor:pointer;font-size:9px;margin-left:3px;">Edit</button>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                }
                html += '</div>';
            }
            html += '</div>';
            
            html += '</div>'; // End grid container
            
            if (habitData.badHabits.length === 0) {
                html += '<p style="color:var(--dim);font-size:13.5px;line-height:1.7;">No bad habits being tracked. Use this to monitor and reduce negative patterns.</p>';
            } else {
                html += '<div style="display:grid;gap:12px;margin-top:15px;">';
                for (var i = 0; i < habitData.badHabits.length; i++) {
                    var badHabit = habitData.badHabits[i];
                    var today = new Date().toISOString().split('T')[0];
                    var dayData = badHabit.history[today];
                    var failed = dayData && dayData.fails && dayData.fails.length > 0;
                    var isProtected = dayData && dayData.protected;
                    var streak = calculateBadStreak(badHabit.history, badHabit.createdAt);
                    
                    html += '<div style="border:1px solid var(--line);border-radius:10px;padding:15px;">';
                    html += '<div style="display:flex;justify-content:space-between;align-items:start;">';
                    html += '<div style="flex:1;">';
                    html += '<div style="font-weight:600;color:var(--fg);">' + escapeHtml(badHabit.name) + '</div>';
                    if (badHabit.duration) {
                        html += '<div style="color:var(--dim);font-size:12.5px;margin-top:4px;">Duration: ' + escapeHtml(badHabit.duration) + '</div>';
                    }
                    html += '<div style="color:var(--dim);font-size:12px;margin-top:6px;">';
                    html += 'Clean streak: <strong style="color:#22c55e;">' + streak + ' days</strong>';
                    html += '</div>';
                    html += '</div>';
                    html += '<div style="text-align:right;">';
                    if (isProtected) {
                        html += '<div style="color:#22c55e;font-size:12px;font-weight:600;">🛡️ Protected</div>';
                    } else if (failed) {
                        html += '<div style="color:#ef4444;font-size:12px;font-weight:600;">✗ Failed today</div>';
                    } else {
                        html += '<div style="color:#22c55e;font-size:12px;font-weight:600;">✓ Clean today</div>';
                    }
                    html += '<div style="margin-top:8px;">';
                    if (!isProtected && !failed) {
                        html += '<button onclick="LumoHabitTracker.activateShield(' + i + ')" style="padding:6px 12px;background:var(--line);color:var(--fg);border:none;border-radius:6px;cursor:pointer;font-size:11.5px;margin-right:6px;">🛡️ Shield</button>';
                    }
                    if (!failed) {
                        html += '<button onclick="LumoHabitTracker.logBadHabitFail(' + i + ')" style="padding:6px 12px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11.5px;">Log Failure</button>';
                    }
                    html += '<button onclick="LumoHabitTracker.editBadHabitUI(' + i + ')" style="padding:6px 12px;background:var(--line);color:var(--fg);border:none;border-radius:6px;cursor:pointer;font-size:11.5px;margin-left:6px;">Edit</button>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                    
                    // Show today's failures
                    if (dayData && dayData.fails && dayData.fails.length > 0) {
                        html += '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--line);">';
                        html += '<div style="font-size:11.5px;color:var(--dim);margin-bottom:6px;">Today\'s failures:</div>';
                        for (var j = 0; j < dayData.fails.length; j++) {
                            var fail = dayData.fails[j];
                            html += '<div style="background:#fef2f2;padding:8px 10px;border-radius:6px;font-size:11.5px;color:#dc2626;margin-bottom:6px;">';
                            html += '<strong>' + fail.time + '</strong> - ' + escapeHtml(fail.trigger || 'No trigger logged') + '</div>';
                        }
                        html += '</div>';
                    }
                    
                    html += '</div>';
                }
                html += '</div>';
            }
            html += '</div>';

            // Active Challenge Section
            if (habitData.activeChallenge) {
                html += '<div class="panel rise d1" style="margin-bottom:20px;">';
                html += '<div class="lbl">';
                html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">';
                html += '<path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>';
                html += '<path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>';
                html += '<path d="M4 22h16"/>';
                html += '<path d="M10 14.66V18c0 .55-.47.98-.97 1.21C7.85 19.75 6 21.5 6 22"/>';
                html += '<path d="M14 14.66V18c0 .55.47.98.97 1.21C16.15 19.75 18 21.5 18 22"/>';
                html += '<path d="M18 2H6v7a6 6 0 0012 0V2z"/>';
                html += '</svg>';
                html += '<span class="leaf">Active Challenge</span>';
                html += '</div>';
                
                var challenge = habitData.activeChallenge;
                var progressPercent = Math.round((challenge.currentStep / challenge.duration) * 100);
                
                html += '<div style="margin-top:15px;">';
                html += '<div style="font-weight:600;font-size:16px;color:var(--fg);">' + escapeHtml(challenge.title) + '</div>';
                html += '<div style="color:var(--dim);font-size:12.5px;margin-top:4px;">' + escapeHtml(challenge.tagline) + '</div>';
                
                html += '<div style="margin-top:15px;">';
                html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--dim);margin-bottom:6px;">';
                html += '<span>Progress: Day ' + challenge.currentStep + ' of ' + challenge.duration + '</span>';
                html += '<span>' + progressPercent + '%</span>';
                html += '</div>';
                html += '<div style="height:8px;background:var(--line);border-radius:4px;overflow:hidden;">';
                html += '<div style="width:' + progressPercent + '%;height:100%;background:var(--accent);border-radius:4px;"></div>';
                html += '</div>';
                html += '</div>';
                
                html += '<div style="margin-top:15px;">';
                html += '<button onclick="LumoHabitTracker.completeChallengeDay()" style="padding:10px 16px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">Complete Today</button>';
                html += '<button onclick="LumoHabitTracker.quitChallenge()" style="padding:10px 16px;background:var(--line);color:var(--fg);border:none;border-radius:8px;cursor:pointer;font-size:13px;margin-left:10px;">Quit Challenge</button>';
                html += '</div>';
                
                html += '<div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--line);">';
                html += '<div style="font-size:12.5px;font-weight:600;margin-bottom:8px;">Rules:</div>';
                html += '<ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--dim);">';
                for (var i = 0; i < challenge.rules.length; i++) {
                    html += '<li style="margin-bottom:4px;">' + escapeHtml(challenge.rules[i]) + '</li>';
                }
                html += '</ul>';
                html += '</div>';
                
                html += '</div>';
                html += '</div>';
            }

            return html;
        }
    };
})();

// Log module loaded
console.log('[Lumo] Habit Tracker module loaded');
