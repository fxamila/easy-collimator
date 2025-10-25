/**
 * Main Application - Entry point and initialization
 */
class WebcamOverlayApp {
    constructor() {
        this.webcamManager = null;
        this.overlayRenderer = null;
        this.uiController = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            // Check browser support
            if (!this.checkBrowserSupport()) {
                throw new Error('Browser not supported');
            }

            // Initialize components
            await this.initializeComponents();
            
            // Setup global error handlers
            this.setupGlobalErrorHandlers();

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.handleInitializationError(error);
            return false;
        }
    }

    /**
     * Check if browser supports required features
     */
    checkBrowserSupport() {
        const requirements = [
            {
                feature: 'getUserMedia',
                test: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
                message: 'Camera access not supported'
            },
            {
                feature: 'Canvas',
                test: () => !!document.createElement('canvas').getContext,
                message: 'Canvas not supported'
            },
            {
                feature: 'requestAnimationFrame',
                test: () => !!window.requestAnimationFrame,
                message: 'Animation not supported'
            }
        ];

        for (const requirement of requirements) {
            if (!requirement.test()) {
                this.showBrowserError(requirement.message);
                return false;
            }
        }

        return true;
    }

    /**
     * Initialize all components
     */
    async initializeComponents() {
        // Initialize webcam manager
        this.webcamManager = new WebcamManager();
        await this.webcamManager.initialize();

        // Initialize overlay renderer
        this.overlayRenderer = new OverlayRenderer('overlayCanvas', document.getElementById('webcamVideo'));
        this.overlayRenderer.initialize();

        // Initialize zoom controller
        this.zoomController = new ZoomController(
            document.getElementById('webcamContainer'),
            document.getElementById('webcamVideo')
        );
        this.zoomController.initialize();

        // Initialize exposure controller
        this.exposureController = new ExposureController(document.getElementById('webcamVideo'));
        this.exposureController.initialize();

        // Initialize crosshair controller
        this.crosshairController = new CrosshairController(
            document.getElementById('webcamContainer'),
            document.getElementById('crosshair'),
            this.zoomController
        );
        this.crosshairController.initialize();
        this.crosshairController.setWebcamManager(this.webcamManager);

        // Establish two-way communication between zoom and crosshair controllers
        this.zoomController.setCrosshairController(this.crosshairController);

        // Initialize UI controller
        this.uiController = new UIController(this.webcamManager, this.overlayRenderer, this.zoomController, this.exposureController, this.crosshairController);
        await this.uiController.initialize();
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (this.uiController) {
                this.uiController.showError('An unexpected error occurred');
            }
        });

        // Handle general errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            if (this.uiController) {
                this.uiController.showError('A system error occurred');
            }
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    /**
     * Handle browser visibility changes
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, pause operations
            if (this.overlayRenderer) {
                this.overlayRenderer.pauseRendering();
            }
        } else {
            // Page is visible, resume operations
            if (this.overlayRenderer && this.webcamManager && this.webcamManager.getIsActive()) {
                this.overlayRenderer.startRendering();
            }
        }
    }

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        const errorMessage = this.getErrorMessage(error);
        
        // Show error in UI if possible
        const statusElement = document.getElementById('statusText');
        const alertElement = document.getElementById('statusAlert');
        
        if (statusElement && alertElement) {
            statusElement.textContent = errorMessage;
            alertElement.className = 'alert alert-danger';
        }

        // Disable all controls
        const startButton = document.getElementById('startStopBtn');
        if (startButton) {
            startButton.disabled = true;
            startButton.textContent = 'System Error';
        }

        // Show browser notification if supported
        this.showBrowserError(errorMessage);
    }

    /**
     * Show browser compatibility error
     */
    showBrowserError(message) {
        const container = document.querySelector('.container-fluid');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger alert-dismissible fade show m-3';
            errorDiv.innerHTML = `
                <h4 class="alert-heading">Browser Compatibility Issue</h4>
                <p>${message}</p>
                <hr>
                <p class="mb-0">
                    Please use a modern browser like Chrome, Firefox, Safari, or Edge to access camera features.
                </p>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            container.insertBefore(errorDiv, container.firstChild);
        }
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error) {
        if (error.message.includes('not supported')) {
            return 'Your browser does not support camera features';
        } else if (error.message.includes('permission')) {
            return 'Camera permission is required to use this application';
        } else if (error.message.includes('NotFound') || error.message.includes('camera')) {
            return 'No camera found. Please connect a camera and refresh the page';
        } else {
            return 'Failed to initialize the camera system';
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        try {
            if (this.webcamManager && this.webcamManager.getIsActive()) {
                this.webcamManager.stopWebcam();
            }
            
            if (this.overlayRenderer) {
                this.overlayRenderer.stopRendering();
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            webcamActive: this.webcamManager ? this.webcamManager.getIsActive() : false,
            availableCameras: this.webcamManager ? this.webcamManager.getCameras().length : 0,
            currentCamera: this.webcamManager ? this.webcamManager.getCurrentCamera() : null
        };
    }
}

// Global application instance
let webcamApp = null;

/**
 * Initialize application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async function() {
    try {
        webcamApp = new WebcamOverlayApp();
        await webcamApp.initialize();
    } catch (error) {
        console.error('Critical error during initialization:', error);
    }
});

/**
 * Expose app instance to global scope for debugging
 */
window.WebcamApp = function() {
    return webcamApp;
};