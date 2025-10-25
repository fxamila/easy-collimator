/**
 * WebcamManager - Handles webcam access and management
 */
class WebcamManager {
    constructor() {
        this.stream = null;
        this.video = document.getElementById('webcamVideo');
        this.isActive = false;
        this.availableCameras = [];
        this.currentCameraId = null;
        this.constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        };
    }

    /**
     * Initialize the webcam manager
     */
    async initialize() {
        try {
            await this.loadAvailableCameras();
            this.setupVideoElement();
            return true;
        } catch (error) {
            console.error('Failed to initialize webcam manager:', error);
            throw error;
        }
    }

    /**
     * Load available cameras
     */
    async loadAvailableCameras() {
        try {
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia not supported in this browser');
            }
            
            // Request permission first with minimal constraints
            const tempStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 }, 
                    height: { ideal: 480 } 
                } 
            });
            
            tempStream.getTracks().forEach(track => {
                track.stop();
            });

            // Get available devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            this.availableCameras = devices.filter(device => device.kind === 'videoinput');
            
            if (this.availableCameras.length === 0) {
                // Don't throw error immediately, try fallback
                this.availableCameras = [{
                    deviceId: 'default',
                    label: 'Default Camera',
                    kind: 'videoinput'
                }];
            }

            return this.availableCameras;
            
        } catch (error) {
            console.error('Error in loadAvailableCameras:', error);
            
            // Try fallback method
            return await this.loadCamerasWithFallback(error);
        }
    }

    /**
     * Fallback method for loading cameras
     */
    async loadCamerasFallback(originalError) {
        try {
            // Try enumerating devices without permission first
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length > 0) {
                this.availableCameras = videoDevices;
                return this.availableCameras;
            }
        } catch (fallbackError) {
            console.error('Fallback enumeration failed:', fallbackError);
        }

        // Final fallback - create a default camera option
        this.availableCameras = [{
            deviceId: 'default',
            label: 'Default Camera (Permission Required)',
            kind: 'videoinput'
        }];
        
        return this.availableCameras;
    }

    /**
     * Setup video element event listeners
     */
    setupVideoElement() {
        this.video.addEventListener('loadedmetadata', () => {
            this.onVideoLoaded();
        });

        this.video.addEventListener('error', (error) => {
            console.error('Video error:', error);
            this.handleError('Video playback error');
        });
    }

    /**
     * Start webcam with selected camera
     */
    async startWebcam(cameraId = null, quality = '720p') {
        try {
            if (this.isActive) {
                await this.stopWebcam();
            }

            this.updateConstraintsForQuality(quality);
            
            if (cameraId && cameraId !== 'default') {
                this.constraints.video.deviceId = { exact: cameraId };
                this.currentCameraId = cameraId;
            } else if (cameraId === 'default') {
                // Use default camera without specific device ID
                delete this.constraints.video.deviceId;
                this.currentCameraId = 'default';
            } else if (this.availableCameras.length > 0) {
                this.currentCameraId = this.availableCameras[0].deviceId;
                this.constraints.video.deviceId = { exact: this.currentCameraId };
            } else {
                // Fallback to default camera
                delete this.constraints.video.deviceId;
                this.currentCameraId = 'default';
            }

            this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            this.video.srcObject = this.stream;
            
            await this.video.play();
            this.isActive = true;

            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('cameraStreamStarted', {
                detail: { cameraId: this.currentCameraId, quality: quality }
            }));

            return true;
        } catch (error) {
            console.error('Error starting webcam:', error);
            this.handleError(this.getErrorMessage(error));
            throw error;
        }
    }

    /**
     * Stop webcam
     */
    async stopWebcam() {
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(track => {
                    track.stop();
                });
                this.stream = null;
            }

            this.video.srcObject = null;
            this.isActive = false;
            return true;
        } catch (error) {
            console.error('Error stopping webcam:', error);
            throw error;
        }
    }

    /**
     * Update constraints based on quality setting
     */
    updateConstraintsForQuality(quality) {
        const qualitySettings = {
            '480p': { width: { ideal: 854 }, height: { ideal: 480 } },
            '720p': { width: { ideal: 1280 }, height: { ideal: 720 } },
            '1080p': { width: { ideal: 1920 }, height: { ideal: 1080 } }
        };

        if (qualitySettings[quality]) {
            this.constraints.video.width = qualitySettings[quality].width;
            this.constraints.video.height = qualitySettings[quality].height;
        }
    }

    /**
     * Handle video loaded event
     */
    onVideoLoaded() {
        // Dispatch custom event when video is loaded
        const event = new CustomEvent('webcamLoaded', {
            detail: {
                videoWidth: this.video.videoWidth,
                videoHeight: this.video.videoHeight
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Handle errors
     */
    handleError(message) {
        const event = new CustomEvent('webcamError', {
            detail: { message }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error) {
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            return 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            return 'Camera access denied. Please allow camera permission and refresh the page.';
        } else if (error.name === 'NotSupportedError') {
            return 'Camera not supported by this browser.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            return 'Camera is already in use by another application.';
        } else {
            return 'Unknown camera error occurred.';
        }
    }

    /**
     * Get current video dimensions
     */
    getVideoDimensions() {
        return {
            width: this.video.videoWidth,
            height: this.video.videoHeight,
            displayWidth: this.video.clientWidth,
            displayHeight: this.video.clientHeight
        };
    }

    /**
     * Check if webcam is supported
     */
    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Get available cameras
     */
    getCameras() {
        return this.availableCameras;
    }

    /**
     * Get current camera info
     */
    getCurrentCamera() {
        return this.availableCameras.find(cam => cam.deviceId === this.currentCameraId);
    }

    /**
     * Check if webcam is active
     */
    getIsActive() {
        return this.isActive;
    }
}