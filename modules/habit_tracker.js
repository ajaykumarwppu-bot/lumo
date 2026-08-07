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
         * Log completion of a good habit
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
         * Activate shield protection for a bad habit
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
        }
    };
})();

// Log module loaded
console.log('[Lumo] Habit Tracker module loaded');
