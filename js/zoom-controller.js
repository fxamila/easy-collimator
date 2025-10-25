/**
 * ZoomController - Handles mouse wheel zoom functionality for webcam video
 */
class ZoomController {
    constructor(containerElement, videoElement) {
        this.container = containerElement;
        this.video = videoElement;
        this.scale = 1;
        this.minScale = 1.0;
        this.maxScale = 5;
        this.scaleStep = 0.1;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.zoomEnabled = false; // Control zoom functionality - disabled until camera starts
        this.crosshairController = null; // Reference to crosshair controller for wheel delegation
    }

    /**
     * Initialize zoom controller
     */
    initialize() {
        this.setupEventListeners();
        this.updateTransform();

        return true;
    }

    /**
     * Setup event listeners for zoom and pan
     */
    setupEventListeners() {
        // Mouse wheel zoom
        this.container.addEventListener('wheel', (event) => {
            this.handleWheel(event);
        }, { passive: false });

        // Mouse drag for panning
        this.container.addEventListener('mousedown', (event) => {
            this.handleMouseDown(event);
        });

        document.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });

        document.addEventListener('mouseup', () => {
            this.handleMouseUp();
        });

        // Double click to reset zoom and center
        this.container.addEventListener('dblclick', (event) => {
            this.resetZoom();
        });

        // Prevent context menu on right click
        this.container.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }

    /**
     * Handle mouse wheel zoom
     */
    handleWheel(event) {
        // Don't zoom if zoom is disabled (e.g., when crosshair is active)
        if (!this.zoomEnabled) {
            // Delegate wheel event to crosshair controller for circle size control
            if (this.crosshairController && this.crosshairController.handleWheelEvent) {
                this.crosshairController.handleWheelEvent(event);
            }
            return;
        }
        
        event.preventDefault();
        
        // Get mouse position relative to container
        const rect = this.container.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Calculate zoom direction and amount
        const zoomDirection = event.deltaY < 0 ? 1 : -1;
        const zoomAmount = this.scaleStep * zoomDirection;
        const newScale = this.scale + zoomAmount;

        // Clamp scale to limits
        if (newScale < this.minScale || newScale > this.maxScale) {
            return;
        }

        // Calculate zoom center point
        const containerCenterX = this.container.offsetWidth / 2;
        const containerCenterY = this.container.offsetHeight / 2;

        // Calculate the position of mouse relative to current transform
        const currentMouseX = (mouseX - containerCenterX - this.translateX) / this.scale;
        const currentMouseY = (mouseY - containerCenterY - this.translateY) / this.scale;

        // Update scale
        this.scale = newScale;

        // Adjust translation to keep mouse position as zoom center
        this.translateX = mouseX - containerCenterX - (currentMouseX * this.scale);
        this.translateY = mouseY - containerCenterY - (currentMouseY * this.scale);

        // Apply constraints to prevent excessive panning
        this.constrainTranslation();

        // Update transform
        this.updateTransform();

        // Dispatch zoom event
        this.dispatchZoomEvent();
    }

    /**
     * Handle mouse down for panning
     */
    handleMouseDown(event) {
        if (event.button === 0) { // Left mouse button only
            this.isDragging = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            this.container.style.cursor = 'grabbing';
        }
    }

    /**
     * Handle mouse move for panning
     */
    handleMouseMove(event) {
        if (this.isDragging) {
            const deltaX = event.clientX - this.lastMouseX;
            const deltaY = event.clientY - this.lastMouseY;

            this.translateX += deltaX;
            this.translateY += deltaY;

            this.constrainTranslation();
            this.updateTransform();

            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        }
    }

    /**
     * Handle mouse up
     */
    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.container.style.cursor = 'grab';
        }
    }



    /**
     * Constrain translation to prevent excessive panning
     */
    constrainTranslation() {
        const containerWidth = this.container.offsetWidth;
        const containerHeight = this.container.offsetHeight;
        
        // Calculate the scaled video dimensions
        const scaledWidth = containerWidth * this.scale;
        const scaledHeight = containerHeight * this.scale;

        // Calculate maximum translation limits
        const maxTranslateX = Math.max(0, (scaledWidth - containerWidth) / 2);
        const maxTranslateY = Math.max(0, (scaledHeight - containerHeight) / 2);

        // Constrain translation
        this.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, this.translateX));
        this.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, this.translateY));
    }

    /**
     * Update CSS transform
     */
    updateTransform() {
        const transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
        this.video.style.transform = transform;
        
        // Also update canvas overlay if it exists
        const canvas = document.getElementById('overlayCanvas');
        if (canvas) {
            canvas.style.transform = transform;
        }
    }

    /**
     * Reset zoom to default
     */
    resetZoom() {
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.updateTransform();
        this.dispatchZoomEvent();
    }

    /**
     * Set zoom level programmatically
     */
    setZoom(scale, centerX = null, centerY = null) {
        // Clamp scale
        scale = Math.max(this.minScale, Math.min(this.maxScale, scale));

        if (centerX !== null && centerY !== null) {
            // Zoom to specific point
            const rect = this.container.getBoundingClientRect();
            const mouseX = centerX;
            const mouseY = centerY;

            const containerCenterX = this.container.offsetWidth / 2;
            const containerCenterY = this.container.offsetHeight / 2;

            const currentMouseX = (mouseX - containerCenterX - this.translateX) / this.scale;
            const currentMouseY = (mouseY - containerCenterY - this.translateY) / this.scale;

            this.scale = scale;

            this.translateX = mouseX - containerCenterX - (currentMouseX * this.scale);
            this.translateY = mouseY - containerCenterY - (currentMouseY * this.scale);

            this.constrainTranslation();
        } else {
            // Zoom to center
            this.scale = scale;
        }

        this.updateTransform();
        this.dispatchZoomEvent();
    }

    /**
     * Zoom in
     */
    zoomIn(centerX = null, centerY = null) {
        const newScale = this.scale + this.scaleStep;
        this.setZoom(newScale, centerX, centerY);
    }

    /**
     * Zoom out
     */
    zoomOut(centerX = null, centerY = null) {
        const newScale = this.scale - this.scaleStep;
        this.setZoom(newScale, centerX, centerY);
    }

    /**
     * Get current zoom info
     */
    getZoomInfo() {
        return {
            scale: this.scale,
            translateX: this.translateX,
            translateY: this.translateY,
            minScale: this.minScale,
            maxScale: this.maxScale
        };
    }

    /**
     * Dispatch zoom change event
     */
    dispatchZoomEvent() {
        const event = new CustomEvent('zoomChanged', {
            detail: this.getZoomInfo()
        });
        this.container.dispatchEvent(event);
    }

    /**
     * Update zoom limits
     */
    setZoomLimits(minScale, maxScale) {
        this.minScale = minScale;
        this.maxScale = maxScale;
        
        // Adjust current scale if it's outside new limits
        if (this.scale < this.minScale || this.scale > this.maxScale) {
            this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale));
            this.updateTransform();
            this.dispatchZoomEvent();
        }
    }

    /**
     * Enable zoom functionality
     */
    enableZoom() {
        this.zoomEnabled = true;
    }

    /**
     * Disable zoom functionality (keeps pan/drag enabled)
     */
    disableZoom() {
        this.zoomEnabled = false;
    }

    /**
     * Check if zoom is enabled
     */
    isZoomEnabled() {
        return this.zoomEnabled;
    }

    /**
     * Set crosshair controller reference for wheel delegation
     */
    setCrosshairController(crosshairController) {
        this.crosshairController = crosshairController;
    }

    /**
     * Handle wheel event for zoom when called from crosshair controller
     * Uses EXACT same logic as normal zoom but centers on container center (crosshair)
     */
    handleWheelForCrosshair(event) {
        event.preventDefault();

        // Calculate zoom direction and amount (SAME as normal zoom)
        const zoomDirection = event.deltaY < 0 ? 1 : -1;
        const zoomAmount = this.scaleStep * zoomDirection;
        const newScale = this.scale + zoomAmount;

        // Clamp scale to limits (SAME as normal zoom)
        if (newScale < this.minScale || newScale > this.maxScale) {
            return;
        }

        // Use container center as zoom point instead of mouse position
        const centerX = this.container.offsetWidth / 2;
        const centerY = this.container.offsetHeight / 2;

        // Calculate zoom center point (SAME as normal zoom)
        const containerCenterX = this.container.offsetWidth / 2;
        const containerCenterY = this.container.offsetHeight / 2;

        // Calculate the position of center relative to current transform (SAME logic as normal zoom)
        const currentCenterX = (centerX - containerCenterX - this.translateX) / this.scale;
        const currentCenterY = (centerY - containerCenterY - this.translateY) / this.scale;

        // Update scale (SAME as normal zoom)
        this.scale = newScale;

        // Adjust translation to keep center position as zoom center (SAME logic as normal zoom)
        this.translateX = centerX - containerCenterX - (currentCenterX * this.scale);
        this.translateY = centerY - containerCenterY - (currentCenterY * this.scale);

        // Apply constraints to prevent excessive panning (SAME as normal zoom)
        this.constrainTranslation();

        // Update transform (SAME as normal zoom)
        this.updateTransform();

        // Dispatch zoom event (SAME as normal zoom)
        this.dispatchZoomEvent();
    }

    /**
     * Enable/disable entire zoom controller
     */
    setEnabled(enabled) {
        this.container.style.pointerEvents = enabled ? 'auto' : 'none';
    }
}