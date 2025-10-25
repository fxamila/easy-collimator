/**
 * ExposureController - Handles exposure and image adjustment controls for webcam video
 */
class ExposureController {
    constructor(videoElement) {
        this.video = videoElement;
        this.canvas = document.getElementById('overlayCanvas');
        this.settings = {
            exposure: 0,        // -3 to 3
            brightness: 0,      // -100 to 100 (percentage)
            contrast: 100,      // 0 to 200 (percentage)
            saturation: 100,    // 0 to 200 (percentage)
            focus: 50,          // 0 to 100 (focus distance)
            autoExposure: false
        };
        this.originalConstraints = null;
    }

    /**
     * Initialize exposure controller
     */
    initialize() {
        this.setupVideoFilters();
        
        // Check focus capabilities when camera starts
        document.addEventListener('cameraStreamStarted', () => {
            setTimeout(() => {
                this.checkFocusCapabilities();
            }, 1000); // Small delay to ensure stream is ready
        });
        
        return true;
    }

    /**
     * Check if the current camera supports focus control
     */
    async checkFocusCapabilities() {
        try {
            if (!this.video.srcObject) {
                return;
            }

            const stream = this.video.srcObject;
            const videoTrack = stream.getVideoTracks()[0];
            
            if (!videoTrack) {
                return;
            }

            const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
            const settings = videoTrack.getSettings ? videoTrack.getSettings() : {};
            const constraints = videoTrack.getConstraints ? videoTrack.getConstraints() : {};

            // Overall assessment
            const hasFocus = capabilities.focusDistance || capabilities.focusMode;

            console.groupEnd();

            // Dispatch event for UI updates
            const focusSupported = hasFocus;
            const event = new CustomEvent('focusCapabilityDetected', {
                detail: { 
                    supported: focusSupported,
                    capabilities: capabilities,
                    settings: settings
                }
            });
            this.video.dispatchEvent(event);

        } catch (error) {
            console.error('Error checking focus capabilities:', error);
        }
    }

    /**
     * Apply CSS filters to video element
     */
    setupVideoFilters() {
        this.updateVideoFilters();
    }

    /**
     * Update video CSS filters based on current settings
     */
    updateVideoFilters() {
        const filters = [
            `brightness(${this.getBrightnessFilter()}%)`,
            `contrast(${this.settings.contrast}%)`,
            `saturate(${this.settings.saturation}%)`
        ];

        const filterString = filters.join(' ');
        this.video.style.filter = filterString;
        
        // Also apply to canvas if it exists
        if (this.canvas) {
            this.canvas.style.filter = filterString;
        }
    }

    /**
     * Calculate brightness filter value from exposure and brightness settings
     */
    getBrightnessFilter() {
        // Convert exposure (-3 to 3) to brightness multiplier
        const exposureMultiplier = Math.pow(2, this.settings.exposure);
        
        // Apply brightness adjustment (percentage)
        const brightnessAdjustment = 1 + (this.settings.brightness / 100);
        
        // Combine both adjustments
        const finalBrightness = exposureMultiplier * brightnessAdjustment * 100;
        
        return Math.max(0, Math.min(500, finalBrightness)); // Clamp to reasonable range
    }

    /**
     * Set exposure value
     */
    setExposure(value) {
        this.settings.exposure = Math.max(-3, Math.min(3, parseFloat(value)));
        
        // Disable auto mode if user manually adjusts exposure
        if (this.settings.autoExposure) {
            this.disableAutoExposureDueToManualChange('exposure');
        }
        
        this.updateVideoFilters();
        this.dispatchExposureEvent();
    }

    /**
     * Set brightness value
     */
    setBrightness(value) {
        this.settings.brightness = Math.max(-100, Math.min(100, parseInt(value)));
        
        // Disable auto mode if user manually adjusts brightness
        if (this.settings.autoExposure) {
            this.disableAutoExposureDueToManualChange('brightness');
        }
        
        this.updateVideoFilters();
        this.dispatchExposureEvent();
    }

    /**
     * Set contrast value
     */
    setContrast(value) {
        this.settings.contrast = Math.max(0, Math.min(200, parseInt(value)));
        
        // Disable auto mode if user manually adjusts contrast
        if (this.settings.autoExposure) {
            this.disableAutoExposureDueToManualChange('contrast');
        }
        
        this.updateVideoFilters();
        this.dispatchExposureEvent();
    }

    /**
     * Set saturation value
     */
    setSaturation(value) {
        this.settings.saturation = Math.max(0, Math.min(200, parseInt(value)));
        this.updateVideoFilters();
        this.dispatchExposureEvent();
    }

    /**
     * Set focus value (attempts hardware focus control)
     */
    async setFocus(value) {
        const newFocusValue = Math.max(0, Math.min(100, parseInt(value)));
        this.settings.focus = newFocusValue;
        
        try {
            // Check if we have a video stream
            if (!this.video.srcObject) {
                this.dispatchExposureEvent();
                return;
            }

            const stream = this.video.srcObject;
            const videoTrack = stream.getVideoTracks()[0];
            
            if (!videoTrack) {
                this.dispatchExposureEvent();
                return;
            }

            // Check camera capabilities first
            const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};

            // Try multiple focus control approaches
            await this.attemptFocusControl(videoTrack, newFocusValue, capabilities);
            
        } catch (error) {
            console.error('Focus control error:', error);
        }
        
        this.dispatchExposureEvent();
    }

    /**
     * Attempt different focus control methods
     */
    async attemptFocusControl(videoTrack, value, capabilities) {
        const focusDistance = value / 100;
        const attempts = [];

        // Method 1: Try focusDistance with manual mode
        if (capabilities.focusDistance && capabilities.focusMode && 
            capabilities.focusMode.includes('manual')) {
            
            attempts.push({
                name: 'Manual focus with distance',
                constraints: {
                    advanced: [{
                        focusMode: 'manual',
                        focusDistance: focusDistance
                    }]
                }
            });
        }

        // Method 2: Try just focusDistance without mode
        if (capabilities.focusDistance) {
            attempts.push({
                name: 'Focus distance only',
                constraints: {
                    advanced: [{
                        focusDistance: focusDistance
                    }]
                }
            });
        }

        // Method 3: Try different constraint format
        if (capabilities.focusDistance) {
            attempts.push({
                name: 'Basic constraints format',
                constraints: {
                    focusDistance: focusDistance
                }
            });
        }

        // Method 4: Try setting focus mode to manual first
        if (capabilities.focusMode && capabilities.focusMode.includes('manual')) {
            attempts.push({
                name: 'Manual focus mode only',
                constraints: {
                    advanced: [{
                        focusMode: 'manual'
                    }]
                }
            });
        }

        // Try each method
        for (const attempt of attempts) {
            try {
                await videoTrack.applyConstraints(attempt.constraints);
                return; // Success, stop trying other methods
            } catch (error) {
                // Continue to next method
            }
        }
    }



    /**
     * Reset all exposure settings to defaults
     */
    resetExposure() {
        this.settings.exposure = 0;
        this.settings.brightness = 0;
        this.settings.contrast = 100;
        this.settings.saturation = 100;
        this.settings.focus = 50;
        this.settings.autoExposure = false;
        
        // Stop auto adjustment monitoring
        this.stopAutoAdjustmentMonitoring();
        
        this.updateVideoFilters();
        this.dispatchExposureEvent();
    }

    /**
     * Try to enable auto exposure (if supported by camera)
     */
    async setAutoExposure(enabled) {
        this.settings.autoExposure = enabled;
        
        if (enabled) {
            try {
                // Try to apply camera constraints for auto exposure
                if (this.video.srcObject) {
                    const stream = this.video.srcObject;
                    const videoTrack = stream.getVideoTracks()[0];
                    
                    if (videoTrack && videoTrack.applyConstraints) {
                        const constraints = {
                            advanced: [{
                                exposureMode: 'continuous'
                            }]
                        };
                        
                        await videoTrack.applyConstraints(constraints);
                    }
                }
            } catch (error) {
                // Hardware auto exposure not supported, using software mode
            }
            
            // Always apply software-based intelligent adjustment for telescope work
            this.performSoftwareAutoAdjustment();
            
        } else {
            this.stopAutoAdjustmentMonitoring();
            
            try {
                // Try to set camera back to manual mode
                if (this.video.srcObject) {
                    const stream = this.video.srcObject;
                    const videoTrack = stream.getVideoTracks()[0];
                    
                    if (videoTrack && videoTrack.applyConstraints) {
                        const constraints = {
                            advanced: [{
                                exposureMode: 'manual'
                            }]
                        };
                        
                        await videoTrack.applyConstraints(constraints);
                    }
                }
            } catch (error) {
                // Manual mode constraint failed, that's okay
            }
        }
        
        this.dispatchExposureEvent();
    }

    /**
     * Software-based auto exposure adjustment
     */
    performSoftwareAutoAdjustment() {
        // Enhanced auto adjustment algorithm optimized for telescope collimation
        // Optimized settings for telescope mirror/optics viewing
        this.settings.exposure = 0.8;    // Slightly overexposed to see faint details
        this.settings.brightness = 15;   // Boost brightness for better visibility
        this.settings.contrast = 125;    // Enhanced contrast to see mirror patterns
        this.settings.saturation = 90;   // Reduced saturation for better detail clarity
        
        this.updateVideoFilters();
        
        // Start intelligent auto-adjustment monitoring
        this.startAutoAdjustmentMonitoring();
    }

    /**
     * Start monitoring video for intelligent auto-adjustment
     */
    startAutoAdjustmentMonitoring() {
        // Stop any existing monitoring
        this.stopAutoAdjustmentMonitoring();
        
        // Start periodic adjustment based on image analysis
        this.autoAdjustmentInterval = setInterval(() => {
            if (this.settings.autoExposure) {
                this.analyzeAndAdjustExposure();
            }
        }, 2000); // Check every 2 seconds

    }

    /**
     * Stop auto-adjustment monitoring
     */
    stopAutoAdjustmentMonitoring() {
        if (this.autoAdjustmentInterval) {
            clearInterval(this.autoAdjustmentInterval);
            this.autoAdjustmentInterval = null;
        }
    }

    /**
     * Analyze video feed and adjust exposure intelligently
     */
    analyzeAndAdjustExposure() {
        if (!this.video || this.video.readyState !== 4) return;
        
        try {
            // Create a canvas to analyze the video frame
            const analysisCanvas = document.createElement('canvas');
            const canvasContext = analysisCanvas.getContext('2d');
            
            // Set canvas size to match video
            analysisCanvas.width = this.video.videoWidth || 640;
            analysisCanvas.height = this.video.videoHeight || 480;
            
            // Draw current video frame
            canvasContext.drawImage(this.video, 0, 0, analysisCanvas.width, analysisCanvas.height);
            
            // Get image data for analysis
            const imageData = canvasContext.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
            const data = imageData.data;
            
            // Analyze brightness levels
            let totalBrightness = 0;
            let darkPixels = 0;
            let brightPixels = 0;
            const pixelCount = data.length / 4;
            
            for (let pixelIndex = 0; pixelIndex < data.length; pixelIndex += 4) {
                // Calculate luminance (perceived brightness)
                const brightness = (data[pixelIndex] * 0.299 + data[pixelIndex + 1] * 0.587 + data[pixelIndex + 2] * 0.114);
                totalBrightness += brightness;
                
                if (brightness < 50) darkPixels++;
                else if (brightness > 200) brightPixels++;
            }
            
            const avgBrightness = totalBrightness / pixelCount;
            const darkRatio = darkPixels / pixelCount;
            const brightRatio = brightPixels / pixelCount;
            
            // Intelligent adjustment logic for telescope optics
            this.intelligentExposureAdjustment(avgBrightness, darkRatio, brightRatio);
            
        } catch (error) {
            console.warn('Auto exposure analysis failed:', error);
        }
    }

    /**
     * Apply intelligent exposure adjustments based on image analysis
     */
    intelligentExposureAdjustment(avgBrightness, darkRatio, brightRatio) {
        let adjustmentMade = false;
        
        // Too dark - increase exposure/brightness
        if (avgBrightness < 80 && darkRatio > 0.6) {
            this.settings.exposure = Math.min(2.5, this.settings.exposure + 0.2);
            this.settings.brightness = Math.min(80, this.settings.brightness + 10);
            adjustmentMade = true;
        }
        
        // Too bright - decrease exposure/brightness
        else if (avgBrightness > 180 && brightRatio > 0.4) {
            this.settings.exposure = Math.max(-1.5, this.settings.exposure - 0.2);
            this.settings.brightness = Math.max(-40, this.settings.brightness - 10);
            adjustmentMade = true;
        }
        
        // Optimize contrast for telescope details
        if (darkRatio > 0.7) {
            // Lots of dark areas - boost contrast to see details
            this.settings.contrast = Math.min(150, this.settings.contrast + 5);
            adjustmentMade = true;
        } else if (brightRatio > 0.5) {
            // Lots of bright areas - reduce contrast to prevent washout
            this.settings.contrast = Math.max(100, this.settings.contrast - 5);
            adjustmentMade = true;
        }
        
        if (adjustmentMade) {
            this.updateVideoFilters();
            this.dispatchExposureEvent();
        }
    }

    /**
     * Disable auto exposure due to manual user adjustment
     */
    disableAutoExposureDueToManualChange(changedSetting) {
        // Auto mode disabled due to manual adjustment
        this.settings.autoExposure = false;
        this.stopAutoAdjustmentMonitoring();
        
        // Try to set camera back to manual mode
        this.setCameraToManualMode();
    }

    /**
     * Set camera to manual exposure mode
     */
    async setCameraToManualMode() {
        try {
            if (this.video.srcObject) {
                const stream = this.video.srcObject;
                const videoTrack = stream.getVideoTracks()[0];
                
                if (videoTrack && videoTrack.applyConstraints) {
                    const constraints = {
                        advanced: [{
                            exposureMode: 'manual'
                        }]
                    };
                    
                    await videoTrack.applyConstraints(constraints);
                }
            }
        } catch (error) {
            // Manual mode constraint failed, that's okay
        }
    }

    /**
     * Get current exposure settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Apply exposure settings from object
     */
    applySettings(settings) {
        this.settings = { ...this.settings, ...settings };
        this.updateVideoFilters();
        this.dispatchExposureEvent();
    }

    /**
     * Get exposure value for UI display
     */
    getExposureDisplay() {
        return this.settings.exposure.toFixed(1);
    }

    /**
     * Get brightness value for UI display
     */
    getBrightnessDisplay() {
        return this.settings.brightness >= 0 ? 
            `+${this.settings.brightness}%` : 
            `${this.settings.brightness}%`;
    }

    /**
     * Get contrast value for UI display
     */
    getContrastDisplay() {
        return `${this.settings.contrast}%`;
    }

    /**
     * Get focus value for UI display
     */
    getFocusDisplay() {
        return `${this.settings.focus}`;
    }

    /**
     * Dispatch exposure change event
     */
    dispatchExposureEvent() {
        const event = new CustomEvent('exposureChanged', {
            detail: {
                settings: this.getSettings(),
                displays: {
                    exposure: this.getExposureDisplay(),
                    brightness: this.getBrightnessDisplay(),
                    contrast: this.getContrastDisplay(),
                    focus: this.getFocusDisplay()
                }
            }
        });
        
        if (this.video) {
            this.video.dispatchEvent(event);
        }
    }

    /**
     * Increase exposure by step
     */
    increaseExposure(step = 0.1) {
        this.setExposure(this.settings.exposure + step);
    }

    /**
     * Decrease exposure by step
     */
    decreaseExposure(step = 0.1) {
        this.setExposure(this.settings.exposure - step);
    }

    /**
     * Increase brightness by step
     */
    increaseBrightness(step = 5) {
        this.setBrightness(this.settings.brightness + step);
    }

    /**
     * Decrease brightness by step
     */
    decreaseBrightness(step = 5) {
        this.setBrightness(this.settings.brightness - step);
    }

    /**
     * Save current settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('webcamExposureSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save exposure settings:', error);
        }
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('webcamExposureSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.applySettings(settings);
                return true;
            }
        } catch (error) {
            console.warn('Failed to load exposure settings:', error);
        }
        return false;
    }

    /**
     * Enable/disable exposure controls
     */
    setEnabled(enabled) {
        // This could be used to disable exposure controls when camera is off
        this.enabled = enabled;
        if (!enabled) {
            this.resetExposure();
        }
    }
}