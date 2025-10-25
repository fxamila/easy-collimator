/**
 * UIController - Handles all UI interactions and state management
 */
class UIController {
    constructor(webcamManager, overlayRenderer, zoomController, exposureController, crosshairController) {
        this.webcamManager = webcamManager;
        this.overlayRenderer = overlayRenderer;
        this.zoomController = zoomController;
        this.exposureController = exposureController;
        this.crosshairController = crosshairController;
        this.elements = this.getUIElements();
        this.state = {
            isStarted: false,
            currentStatus: 'Ready',
            selectedCamera: null,
            videoQuality: '720p'
        };
    }

    /**
     * Get all UI elements
     */
    getUIElements() {
        return {
            // Camera controls
            cameraSelect: document.getElementById('cameraSelect'),
            startStopBtn: document.getElementById('startStopBtn'),
            videoQuality: document.getElementById('videoQuality'),
            
            // Status and display
            statusText: document.getElementById('statusText'),
            statusAlert: document.getElementById('statusAlert'),
            placeholderMessage: document.getElementById('placeholderMessage'),
            webcamVideo: document.getElementById('webcamVideo'),
            
            // Zoom controls
            zoomLevel: document.getElementById('zoomLevel'),
            zoomInBtn: document.getElementById('zoomInBtn'),
            zoomOutBtn: document.getElementById('zoomOutBtn'),
            resetZoomBtn: document.getElementById('resetZoomBtn'),
            
            // Exposure controls
            exposureSlider: document.getElementById('exposureSlider'),
            exposureValue: document.getElementById('exposureValue'),
            brightnessSlider: document.getElementById('brightnessSlider'),
            brightnessValue: document.getElementById('brightnessValue'),
            contrastSlider: document.getElementById('contrastSlider'),
            contrastValue: document.getElementById('contrastValue'),
            focusSlider: document.getElementById('focusSlider'),
            focusValue: document.getElementById('focusValue'),
            autoExposureBtn: document.getElementById('autoExposureBtn'),
            resetExposureBtn: document.getElementById('resetExposureBtn')
        };
    }

    /**
     * Initialize UI controller
     */
    async initialize() {
        try {
            this.setupEventListeners();
            await this.loadCameras();
            this.updateUI();
            
            // Set up camera state listeners for camera-dependent controls
            this.setupCameraStateListeners();
            
            // Disable camera-dependent controls initially (camera not started)
            this.setCameraDependentControlsEnabled(false);
            
            // Additional check to ensure button state is correct
            setTimeout(() => {
                this.enableStartButton();
            }, 100);
            
            return true;
        } catch (error) {
            console.error('Failed to initialize UI controller:', error);
            this.showError('Failed to initialize camera system');
            return false;
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        this.setupCameraControls();
        this.setupZoomControls();
        this.setupExposureControls();
        this.setupWebcamEvents();
        this.setupKeyboardShortcuts();
        this.setupCrosshairEvents();
    }

    /**
     * Setup camera control event listeners
     */
    setupCameraControls() {
        // Camera selection
        this.elements.cameraSelect.addEventListener('change', (event) => {
            this.state.selectedCamera = event.target.value;
            this.enableStartButton();
        });

        // Start/Stop button
        this.elements.startStopBtn.addEventListener('click', () => {
            this.toggleWebcam();
        });

        // Video quality selection
        this.elements.videoQuality.addEventListener('change', (event) => {
            this.state.videoQuality = event.target.value;
            if (this.state.isStarted) {
                this.restartWithNewSettings();
            }
        });
    }

    /**
     * Setup zoom control event listeners
     */
    setupZoomControls() {
        if (this.elements.zoomInBtn) {
            this.elements.zoomInBtn.addEventListener('click', () => {
                this.zoomController.zoomIn();
            });
        }

        if (this.elements.zoomOutBtn) {
            this.elements.zoomOutBtn.addEventListener('click', () => {
                this.zoomController.zoomOut();
            });
        }

        if (this.elements.resetZoomBtn) {
            this.elements.resetZoomBtn.addEventListener('click', () => {
                this.zoomController.resetZoom();
            });
        }

        // Zoom change events
        if (this.zoomController) {
            document.getElementById('webcamContainer').addEventListener('zoomChanged', (event) => {
                this.updateZoomDisplay(event.detail);
            });
        }
    }

    /**
     * Setup exposure control event listeners
     */
    setupExposureControls() {
        if (this.elements.exposureSlider) {
            this.elements.exposureSlider.addEventListener('input', (event) => {
                this.exposureController.setExposure(event.target.value);
                if (this.elements.exposureValue) {
                    this.elements.exposureValue.textContent = parseFloat(event.target.value).toFixed(1);
                }
            });
        }

        if (this.elements.brightnessSlider) {
            this.elements.brightnessSlider.addEventListener('input', (event) => {
                this.exposureController.setBrightness(event.target.value);
                if (this.elements.brightnessValue) {
                    this.elements.brightnessValue.textContent = `${event.target.value}%`;
                }
            });
        }

        if (this.elements.contrastSlider) {
            this.elements.contrastSlider.addEventListener('input', (event) => {
                this.exposureController.setContrast(event.target.value);
                if (this.elements.contrastValue) {
                    this.elements.contrastValue.textContent = `${event.target.value}%`;
                }
            });
        }

        if (this.elements.focusSlider) {
            this.elements.focusSlider.addEventListener('input', (event) => {
                this.exposureController.setFocus(event.target.value);
                if (this.elements.focusValue) {
                    this.elements.focusValue.textContent = event.target.value;
                }
            });
        }

        // Focus capability detection
        if (this.exposureController) {
            document.getElementById('webcamVideo').addEventListener('focusCapabilityDetected', (event) => {
                this.updateFocusCapabilityUI(event.detail);
            });
        }

        if (this.elements.autoExposureBtn) {
            this.elements.autoExposureBtn.addEventListener('click', () => {
                // Only enable auto exposure, don't toggle it
                const currentSettings = this.exposureController.getSettings();
                if (!currentSettings.autoExposure) {
                    this.exposureController.setAutoExposure(true);
                }
                // If already auto, clicking does nothing (stays red until reset or manual slider change)
            });
        }

        if (this.elements.resetExposureBtn) {
            this.elements.resetExposureBtn.addEventListener('click', () => {
                this.exposureController.resetExposure();
            });
        }

        // Exposure change events
        if (this.exposureController) {
            document.getElementById('webcamVideo').addEventListener('exposureChanged', (event) => {
                this.updateExposureDisplay(event.detail.settings);
            });
        }
    }

    /**
     * Setup webcam event listeners
     */
    setupWebcamEvents() {
        // Webcam events
        document.addEventListener('webcamLoaded', (event) => {
            this.onWebcamLoaded(event.detail);
        });

        document.addEventListener('webcamError', (event) => {
            this.onWebcamError(event.detail);
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });
    }

    /**
     * Setup crosshair events
     */
    setupCrosshairEvents() {
        // Crosshair events
        if (this.crosshairController) {
            document.getElementById('webcamContainer').addEventListener('crosshairChanged', (event) => {
                // Crosshair state changed - could be used for UI updates
            });
        }
    }

    /**
     * Load available cameras
     */
    async loadCameras() {
        try {
            this.updateStatus('Loading cameras...', 'info');
            
            const cameras = await this.webcamManager.loadAvailableCameras();
            this.populateCameraSelect(cameras);
            
            if (cameras.length > 0) {
                this.updateStatus('Cameras loaded successfully', 'success');
                setTimeout(() => {
                    this.updateStatus('Ready', 'info');
                }, 2000);
            } else {
                this.updateStatus('No cameras found', 'warning');
                this.addManualCameraOption();
            }
        } catch (error) {
            console.error('Error loading cameras:', error);
            
            let errorMessage = 'Failed to load cameras.';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Camera permission denied. Please allow camera access and refresh the page.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No cameras found. Please connect a camera and refresh the page.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Camera not supported by this browser. Please use Chrome, Firefox, Safari, or Edge.';
            } else if (error.message.includes('getUserMedia not supported')) {
                errorMessage = 'Camera features not supported. Please use a modern browser with HTTPS.';
            }
            
            this.showError(errorMessage);
            this.addManualCameraOption();
        }
    }

    /**
     * Add manual camera option when auto-detection fails
     */
    addManualCameraOption() {
        this.elements.cameraSelect.innerHTML = '';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select camera...';
        this.elements.cameraSelect.appendChild(defaultOption);
        
        const manualOption = document.createElement('option');
        manualOption.value = 'default';
        manualOption.textContent = 'Default Camera (Manual)';
        this.elements.cameraSelect.appendChild(manualOption);
        

    }

    /**
     * Populate camera selection dropdown
     */
    populateCameraSelect(cameras) {
        // Clear existing options
        this.elements.cameraSelect.innerHTML = '';

        if (cameras.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No cameras available';
            this.elements.cameraSelect.appendChild(option);
            this.elements.startStopBtn.disabled = true;
            return;
        }

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a camera...';
        this.elements.cameraSelect.appendChild(defaultOption);

        // Add camera options
        cameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label || `Camera ${index + 1}`;
            this.elements.cameraSelect.appendChild(option);
        });

        // Auto-select first camera if available
        if (cameras.length > 0) {
            this.elements.cameraSelect.selectedIndex = 1;
            this.state.selectedCamera = cameras[0].deviceId;
            
            // Trigger change event to ensure UI updates
            const changeEvent = new Event('change');
            this.elements.cameraSelect.dispatchEvent(changeEvent);
            
            this.enableStartButton();
        }
    }

    /**
     * Enable start button when camera is selected
     */
    enableStartButton() {
        const hasCamera = this.state.selectedCamera && this.state.selectedCamera !== '';
        this.elements.startStopBtn.disabled = !hasCamera;
    }

    /**
     * Toggle webcam on/off
     */
    async toggleWebcam() {
        if (this.state.isStarted) {
            await this.stopWebcam();
        } else {
            await this.startWebcam();
        }
    }

    /**
     * Start webcam
     */
    async startWebcam() {
        try {
            this.updateStatus('Starting camera...', 'info');
            this.setLoadingState(true);

            await this.webcamManager.startWebcam(this.state.selectedCamera, this.state.videoQuality);
            
            this.state.isStarted = true;
            this.updateUI();
            this.updateStatus('Camera started successfully', 'success');
            
            // Notify controllers about camera state change
            if (this.crosshairController) {
                this.crosshairController.onCameraStateChange(true);
            }
            if (this.zoomController) {
                this.zoomController.zoomEnabled = true;
            }
            
        } catch (error) {
            console.error('Error starting webcam:', error);
            this.showError('Failed to start camera');
            this.setLoadingState(false);
        }
    }

    /**
     * Stop webcam
     */
    async stopWebcam() {
        try {
            this.updateStatus('Stopping camera...', 'info');
            
            await this.webcamManager.stopWebcam();
            this.overlayRenderer.stopRendering();
            
            this.state.isStarted = false;
            this.updateUI();
            this.updateStatus('Camera stopped', 'info');
            
            // Hide focus control when camera stops
            this.resetFocusControlVisibility();
            
            // Notify controllers about camera state change
            if (this.crosshairController) {
                this.crosshairController.onCameraStateChange(false);
            }
            if (this.zoomController) {
                this.zoomController.zoomEnabled = false;
            }
            
            // Dispatch camera stopped event
            document.dispatchEvent(new CustomEvent('cameraStreamStopped'));
            
        } catch (error) {
            console.error('Error stopping webcam:', error);
            this.showError('Error stopping camera');
        }
    }

    /**
     * Restart webcam with new settings
     */
    async restartWithNewSettings() {
        if (this.state.isStarted) {
            await this.stopWebcam();
            setTimeout(() => {
                this.startWebcam();
            }, 500);
        }
    }

    /**
     * Handle webcam loaded event
     */
    onWebcamLoaded(videoInfo) {

        this.setLoadingState(false);
        this.updateStatus('Camera active', 'success');
        
        // Reset focus control visibility - will be shown if supported
        this.resetFocusControlVisibility();
    }

    /**
     * Handle webcam error event
     */
    onWebcamError(errorInfo) {
        console.error('Webcam error:', errorInfo);
        this.showError(errorInfo.message);
        this.setLoadingState(false);
        this.state.isStarted = false;
        this.updateUI();
    }

    /**
     * Update UI based on current state
     */
    updateUI() {
        // Update start/stop button
        if (this.state.isStarted) {
            this.elements.startStopBtn.innerHTML = '<i class="bi bi-stop-fill me-2"></i>STOP';
            this.elements.startStopBtn.classList.remove('btn-primary');
            this.elements.startStopBtn.classList.add('btn-danger');
        } else {
            this.elements.startStopBtn.innerHTML = '<i class="bi bi-play-fill me-2"></i>START';
            this.elements.startStopBtn.classList.remove('btn-danger');
            this.elements.startStopBtn.classList.add('btn-primary');
        }

        // Update video visibility
        if (this.state.isStarted) {
            this.elements.webcamVideo.classList.add('active');
            this.elements.placeholderMessage.classList.add('hidden');
        } else {
            this.elements.webcamVideo.classList.remove('active');
            this.elements.placeholderMessage.classList.remove('hidden');
        }

        // Enable/disable controls based on state
        this.elements.cameraSelect.disabled = this.state.isStarted;
        this.elements.videoQuality.disabled = this.state.isStarted;
    }

    /**
     * Set loading state
     */
    setLoadingState(isLoading) {
        if (isLoading) {
            this.elements.startStopBtn.disabled = true;
            const spinner = '<span class="loading-spinner me-2"></span>';
            if (this.state.isStarted) {
                this.elements.startStopBtn.innerHTML = spinner + 'STOPPING...';
            } else {
                this.elements.startStopBtn.innerHTML = spinner + 'STARTING...';
            }
        } else {
            this.enableStartButton();
        }
    }

    /**
     * Update status message
     */
    updateStatus(message, type = 'info') {
        this.state.currentStatus = message;
        this.elements.statusText.textContent = message;
        
        // Update alert class
        this.elements.statusAlert.className = `alert alert-${type}`;
    }

    /**
     * Show error message
     */
    showError(message) {
        this.updateStatus(message, 'danger');
        
        // Auto-clear error after 10 seconds
        setTimeout(() => {
            if (this.state.currentStatus === message) {
                this.updateStatus('Ready', 'info');
            }
        }, 10000);
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Don't trigger shortcuts if user is typing in an input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
            return;
        }

        switch (event.code) {
            case 'Space':
                event.preventDefault();
                if (!this.elements.startStopBtn.disabled) {
                    this.toggleWebcam();
                }
                break;
            case 'Equal': // Plus key (zoom in)
            case 'NumpadAdd':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.zoomController.zoomIn();
                }
                break;
            case 'Minus': // Minus key (zoom out)
            case 'NumpadSubtract':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.zoomController.zoomOut();
                }
                break;
            case 'Digit0': // Reset zoom
            case 'Numpad0':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.zoomController.resetZoom();
                }
                break;
            case 'KeyE': // Increase exposure
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.exposureController.increaseExposure();
                }
                break;
            case 'KeyD': // Decrease exposure
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.exposureController.decreaseExposure();
                }
                break;
            case 'KeyR': // Reset exposure
                if (event.ctrlKey && event.shiftKey) {
                    event.preventDefault();
                    this.exposureController.resetExposure();
                }
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'ArrowUp':
            case 'ArrowDown':
                // Arrow keys are handled by ZoomController when mouse is over camera
                // No need to prevent default here as it's handled in ZoomController
                break;
        }
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Update state
     */
    updateState(newState) {
        this.state = { ...this.state, ...newState };
    }

    /**
     * Show status message with specified type
     */
    showStatus(message, type = 'info') {
        this.updateStatus(message, type);
    }

    /**
     * Update zoom display
     */
    updateZoomDisplay(zoomInfo) {
        if (this.elements.zoomLevel) {
            const percentage = Math.round(zoomInfo.scale * 100);
            this.elements.zoomLevel.textContent = `${percentage}%`;
            
            // Update badge color based on zoom level
            this.elements.zoomLevel.className = 'badge ' + 
                (zoomInfo.scale === 1 ? 'bg-secondary' : 
                 zoomInfo.scale > 1 ? 'bg-primary' : 'bg-info');
        }
        
        // Enable/disable zoom buttons based on limits
        if (this.elements.zoomInBtn) {
            this.elements.zoomInBtn.disabled = zoomInfo.scale >= zoomInfo.maxScale;
        }
        
        if (this.elements.zoomOutBtn) {
            this.elements.zoomOutBtn.disabled = zoomInfo.scale <= zoomInfo.minScale;
        }
    }

    /**
     * Update focus capability UI
     */
    updateFocusCapabilityUI(capabilityInfo) {
        const focusSlider = this.elements.focusSlider;
        const focusValue = this.elements.focusValue;
        
        // Find the entire focus control row (parent container)
        const focusRow = focusSlider ? focusSlider.closest('.row') : null;
        
        if (focusSlider && focusRow) {
            if (capabilityInfo.supported) {
                // Show and enable focus controls
                focusRow.style.display = '';  // Show the entire row
                focusSlider.disabled = false;
                focusSlider.title = 'Hardware focus control available';
                
                if (focusValue) {
                    focusValue.classList.remove('bg-secondary');
                    focusValue.classList.add('bg-info');
                    focusValue.title = 'Focus control: Active';
                }
                
            } else {
                // Hide focus controls completely
                focusRow.style.display = 'none';  // Hide the entire row
            }
        }
    }

    /**
     * Reset focus control visibility (hide until capability is detected)
     */
    resetFocusControlVisibility() {
        const focusSlider = this.elements.focusSlider;
        const focusRow = focusSlider ? focusSlider.closest('.row') : null;
        
        if (focusRow) {
            focusRow.style.display = 'none';

        }
    }

    /**
     * Update exposure display
     */
    updateExposureDisplay(settings) {
        // Safety check to ensure settings object exists
        if (!settings) {
            console.warn('updateExposureDisplay: No settings provided');
            return;
        }

        if (this.elements.exposureSlider && settings.exposure !== undefined) {
            this.elements.exposureSlider.value = settings.exposure;
        }
        if (this.elements.exposureValue && settings.exposure !== undefined) {
            this.elements.exposureValue.textContent = settings.exposure.toFixed(1);
        }
        
        if (this.elements.brightnessSlider && settings.brightness !== undefined) {
            this.elements.brightnessSlider.value = settings.brightness;
        }
        if (this.elements.brightnessValue && settings.brightness !== undefined) {
            this.elements.brightnessValue.textContent = `${settings.brightness}%`;
        }
        
        if (this.elements.contrastSlider && settings.contrast !== undefined) {
            this.elements.contrastSlider.value = settings.contrast;
        }
        if (this.elements.contrastValue && settings.contrast !== undefined) {
            this.elements.contrastValue.textContent = `${settings.contrast}%`;
        }
        
        if (this.elements.focusSlider && settings.focus !== undefined) {
            this.elements.focusSlider.value = settings.focus;
        }
        if (this.elements.focusValue && settings.focus !== undefined) {
            this.elements.focusValue.textContent = settings.focus;
        }
        
        if (this.elements.autoExposureBtn && settings.autoExposure !== undefined) {
            // Keep the same text, just change the button style to show active state
            this.elements.autoExposureBtn.innerHTML = '<i class="bi bi-magic"></i> Auto';
            
            if (settings.autoExposure) {
                this.elements.autoExposureBtn.classList.remove('btn-outline-secondary');
                this.elements.autoExposureBtn.classList.add('btn-primary');
            } else {
                this.elements.autoExposureBtn.classList.remove('btn-primary');
                this.elements.autoExposureBtn.classList.add('btn-outline-secondary');
            }
        }
    }

    /**
     * Set up camera state listeners for camera-dependent controls
     */
    setupCameraStateListeners() {
        // Enable camera-dependent controls when camera starts
        document.addEventListener('cameraStreamStarted', () => {
            this.setCameraDependentControlsEnabled(true);
        });

        // Disable camera-dependent controls when camera stops
        document.addEventListener('cameraStreamStopped', () => {
            this.setCameraDependentControlsEnabled(false);
        });
    }

    /**
     * Enable or disable all camera-dependent controls (exposure and zoom)
     */
    setCameraDependentControlsEnabled(enabled) {
        // List of camera-dependent control elements
        const cameraDependentControls = [
            // Exposure controls
            this.elements.exposureSlider,
            this.elements.brightnessSlider,
            this.elements.contrastSlider,
            this.elements.autoExposureBtn,
            this.elements.resetExposureBtn,
            // Zoom controls
            this.elements.zoomInBtn,
            this.elements.zoomOutBtn,
            this.elements.resetZoomBtn
        ];

        // Enable/disable each control
        cameraDependentControls.forEach(control => {
            if (control) {
                control.disabled = !enabled;
                
                // Add visual styling for disabled state
                if (enabled) {
                    control.classList.remove('disabled');
                    control.style.opacity = '1';
                    control.style.pointerEvents = 'auto';
                } else {
                    control.classList.add('disabled');
                    control.style.opacity = '0.5';
                    control.style.pointerEvents = 'none';
                }
            }
        });

        // Also disable section headers to show they're inactive
        const exposureSection = document.querySelector('#exposureControls');
        if (exposureSection) {
            if (enabled) {
                exposureSection.classList.remove('disabled-section');
            } else {
                exposureSection.classList.add('disabled-section');
            }
        }
    }

    /**
     * Legacy method name for backwards compatibility
     */
    setExposureControlsEnabled(enabled) {
        this.setCameraDependentControlsEnabled(enabled);
    }
}