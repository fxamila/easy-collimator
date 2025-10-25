/**
 * CrosshairController - Handles crosshair overlay display and toggle functionality
 */
class CrosshairController {
    constructor(containerElement, crosshairElement, zoomController = null) {
        this.container = containerElement;
        this.crosshair = crosshairElement;
        this.rotationIcon = document.getElementById('btn_crosshairs');
        this.resetIcon = document.getElementById('btn_reset');
        this.toggle1Icon = document.getElementById('btn_circle_1');
        this.toggle2Icon = document.getElementById('btn_circle_2');
        this.toggle3Icon = document.getElementById('btn_circle_3');
        this.zoomController = zoomController;
        this.webcamManager = null; // Will be set by UI controller
        this.isVisible = false;
        this.initialized = false;
        
        // Circle size settings as percentages of camera height
        this.circleSettings = {
            circle1Percentage: 0.77,    // 77% of screen height (yellow circle) - increased by 10%
            circle2Percentage: 0.385,   // 50% of circle_1 diameter (38.5% of screen height, green circle)
            circle3Percentage: 0.1925   // 25% of circle_1 diameter (19.25% of screen height, cyan circle)
        };

        // Circle_2 (red circle) size control settings
        this.circle2SizeControl = {
            currentSize: 0, // Will be calculated from initial percentage
            minSize: 20, // 10 times circle_2 border width (10 * 2px = 20px minimum)
            maxSize: 0, // Will be set to circle_1 size minus some margin
            step: 5, // Size change per wheel scroll (smooth control)
            fineStep: 1, // Fine-tuning step when middle mouse button is held
            borderWidth: 2 // Circle_2 border width in pixels
        };

        // Circle_1 (yellow circle) size control settings
        this.circle1SizeControl = {
            currentSize: 0, // Will be calculated from initial percentage
            minSize: 50, // Minimum size to ensure it's always larger than circle_2
            maxSize: 0, // Will be set based on container size
            step: 5, // Size change per wheel scroll (smooth control)
            fineStep: 1, // Fine-tuning step when middle mouse button is held
            borderWidth: 2, // Circle_1 border width in pixels
            marginFromCircle2: 20 // Minimum margin to maintain from circle_2
        };

        // Circle_3 (blue circle) size control settings
        this.circle3SizeControl = {
            currentSize: 0, // Will be calculated from initial percentage
            minSize: 20, // 10 times circle_3 border width (10 * 2px = 20px minimum)
            maxSize: 0, // Will be set to circle_2 size minus some margin
            step: 5, // Size change per wheel scroll (smooth control)
            fineStep: 1, // Fine-tuning step when middle mouse button is held
            borderWidth: 2, // Circle_3 border width in pixels
            marginFromCircle2: 15 // Minimum margin to maintain from circle_2
        };

        // Mouse state tracking for fine control
        this.isMiddleMouseDown = false; // Now tracks right mouse button for fine adjustment
        
        // Center point dragging state
        this.isDraggingCenter = false;
        this.centerOffsetX = 0;
        this.centerOffsetY = 0;
        this.dragMouseOffsetX = 0; // Offset from mouse to center when drag starts
        this.dragMouseOffsetY = 0; // Offset from mouse to center when drag starts
        this.crosshairLinesVisibleBeforeDrag = false; // Track crosshair visibility before drag
        
        // Circle visibility state
        this.circle1Visible = true;
        this.circle2Visible = false; // Hidden by default - green circle
        this.circle3Visible = false; // Hidden by default - cyan circle for advanced use

        // Rotation state
        this.rotationAngle = 45; // Current rotation angle in degrees (45° to match X icon)
        this.rotationStep = 1.25; // Degrees per scroll step (very fine rotation control)
        this.fineRotationStep = 1.0; // Fine adjustment: 1 degree per step when middle mouse down
    }

    /**
     * Initialize crosshair controller
     */
    initialize() {
        if (this.initialized) {
            return;
        }

        this.setupEventListeners();
        this.initializeCircles();
        this.initialized = true;
    }

    /**
     * Set webcam manager reference for camera state checking
     */
    setWebcamManager(webcamManager) {
        this.webcamManager = webcamManager;
    }

    /**
     * Check if camera is currently active/running
     */
    isCameraActive() {
        return this.webcamManager && this.webcamManager.getIsActive && this.webcamManager.getIsActive();
    }

    /**
     * Handle camera state change (called when camera starts/stops)
     */
    onCameraStateChange(isActive) {
        if (!isActive && this.isVisible) {
            // Camera stopped and crosshair is visible - hide it
            this.hide();
        }
    }

    /**
     * Initialize circles with default settings
     */
    initializeCircles() {
        this.updateCircleSizes();
        this.setCirclesVisible(true);
        
        // Listen for container resize to update circle sizes
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateCircleSizes();
            });
            this.resizeObserver.observe(this.container);
        }
    }

    /**
     * Calculate and update circle sizes based on camera view height
     */
    updateCircleSizes() {
        const containerHeight = this.container.clientHeight;
        const containerWidth = this.container.clientWidth;
        
        if (containerHeight > 0) {
            const circle1Size = Math.round(containerHeight * this.circleSettings.circle1Percentage);
            const circle2Size = Math.round(containerHeight * this.circleSettings.circle2Percentage);
            const circle3Size = Math.round(containerHeight * this.circleSettings.circle3Percentage);
            
            // Initialize sizes if not set yet (first time only)
            if (this.circle1SizeControl.currentSize === 0) {
                this.circle1SizeControl.currentSize = circle1Size;
                this.setCircle1(circle1Size, 'rgba(255, 255, 0, 0.8)');
            }
            if (this.circle2SizeControl.currentSize === 0) {
                this.circle2SizeControl.currentSize = circle2Size;
                this.setCircle2(circle2Size, 'rgba(60, 200, 60, 0.8)');
            }
            if (this.circle3SizeControl.currentSize === 0) {
                this.circle3SizeControl.currentSize = circle3Size;
                this.setCircle3(circle3Size, 'rgba(60, 120, 200, 0.8)');
            }
            
            // Update circle_1 control limits (but preserve current size)
            this.circle1SizeControl.minSize = Math.max(50, this.circle2SizeControl.currentSize + this.circle1SizeControl.marginFromCircle2); // Always larger than current circle_2
            this.circle1SizeControl.maxSize = Math.min(containerWidth, containerHeight) * 0.98; // Max 98% of container
            
            // Update circle_2 control limits (but preserve current size) 
            this.circle2SizeControl.minSize = Math.max(this.circle2SizeControl.borderWidth * 10, this.circle3SizeControl.currentSize + this.circle3SizeControl.marginFromCircle2); // Always larger than current circle_3
            this.circle2SizeControl.maxSize = this.circle1SizeControl.currentSize - this.circle1SizeControl.marginFromCircle2; // Margin from current circle_1
            
            // Update circle_3 control limits (but preserve current size)
            this.circle3SizeControl.minSize = this.circle3SizeControl.borderWidth * 10; // 10 times border width
            this.circle3SizeControl.maxSize = this.circle2SizeControl.currentSize - this.circle3SizeControl.marginFromCircle2; // Margin from current circle_2
        }
    }

    /**
     * Handle wheel events based on mouse position relative to circle_1
     */
    handleWheelEvent(event) {
        if (!this.isVisible) {
            return;
        }

        // Check if mouse is over rotation icon
        if (this.isMouseOverRotationIcon(event)) {
            // Handle rotation instead of zoom
            this.handleRotation(event.deltaY);
            return;
        }

        // Check if mouse is over toggle1 icon (circle_1 control)
        if (this.isMouseOverToggle1Icon(event) && this.circle1Visible) {
            // Handle circle_1 size control when hovering over its toggle button and circle is visible
            this.handleCircle1Resize(event.deltaY);
            return;
        }

        // Check if mouse is over toggle2 icon (circle_2 control)
        if (this.isMouseOverToggle2Icon(event) && this.circle2Visible) {
            // Handle circle_2 size control when hovering over its toggle button and circle is visible
            this.handleCircle2Resize(event.deltaY);
            return;
        }

        // Check if mouse is over toggle3 icon (circle_3 control)
        if (this.isMouseOverToggle3Icon(event) && this.circle3Visible) {
            // Handle circle_3 size control when hovering over its toggle button and circle is visible
            this.handleCircle3Resize(event.deltaY);
            return;
        }

        // Check if mouse is over any toggle icon but circle is hidden (prevent zoom only)
        if (this.isMouseOverToggle1Icon(event) || 
            this.isMouseOverToggle2Icon(event) || 
            this.isMouseOverToggle3Icon(event)) {
            // Prevent zoom when hovering over toggle icons, even if circle is hidden
            return;
        }

        // Check if mouse is over reset icon (prevent zoom only)
        if (this.isMouseOverResetIcon(event)) {
            // Prevent zoom when hovering over reset icon
            return;
        }

        // Get mouse position relative to container
        const rect = this.container.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Get actual crosshair center position (container center + drag offset)
        const centerX = (rect.width / 2) + this.centerOffsetX;
        const centerY = (rect.height / 2) + this.centerOffsetY;
        
        // Calculate distance from mouse to actual crosshair center
        const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
        
        // Get current circle radii (stored as diameter, so divide by 2)
        const circle1Radius = this.getCircle1Radius();
        const circle2Radius = this.getCircle2Radius();
        const circle3Radius = this.getCircle3Radius();
        
        if (distance <= circle3Radius && this.circle3Visible) {
            // Mouse is inside circle_3 and circle_3 is visible - control circle_3 size
            this.handleCircle3SizeChange(event);
        } else if (distance <= circle2Radius && this.circle2Visible) {
            // Mouse is inside circle_2 but outside circle_3, and circle_2 is visible - control circle_2 size
            this.handleCircle2SizeChange(event);
        } else if (distance <= circle1Radius && this.circle1Visible) {
            // Mouse is inside circle_1 but outside circle_2, and circle_1 is visible - control circle_1 size
            this.handleCircle1SizeChange(event.deltaY);
        } else {
            // Mouse is outside all visible circles - allow zoom controller to handle
            this.handleZoomEvent(event);
        }
    }

    /**
     * Check if mouse is over the rotation icon
     */
    isMouseOverRotationIcon(event) {
        if (!this.rotationIcon || this.rotationIcon.style.display === 'none') {
            return false;
        }

        const iconRect = this.rotationIcon.getBoundingClientRect();
        return (
            event.clientX >= iconRect.left &&
            event.clientX <= iconRect.right &&
            event.clientY >= iconRect.top &&
            event.clientY <= iconRect.bottom
        );
    }

    /**
     * Check if mouse is over the reset icon
     */
    isMouseOverResetIcon(event) {
        if (!this.resetIcon || this.resetIcon.style.display === 'none') {
            return false;
        }

        const iconRect = this.resetIcon.getBoundingClientRect();
        return (
            event.clientX >= iconRect.left &&
            event.clientX <= iconRect.right &&
            event.clientY >= iconRect.top &&
            event.clientY <= iconRect.bottom
        );
    }

    /**
     * Check if mouse is over the toggle1 (circle_1) icon
     */
    isMouseOverToggle1Icon(event) {
        if (!this.toggle1Icon || this.toggle1Icon.style.display === 'none') {
            return false;
        }

        const iconRect = this.toggle1Icon.getBoundingClientRect();
        return (
            event.clientX >= iconRect.left &&
            event.clientX <= iconRect.right &&
            event.clientY >= iconRect.top &&
            event.clientY <= iconRect.bottom
        );
    }

    /**
     * Check if mouse is over the toggle2 (circle_2) icon
     */
    isMouseOverToggle2Icon(event) {
        if (!this.toggle2Icon || this.toggle2Icon.style.display === 'none') {
            return false;
        }

        const iconRect = this.toggle2Icon.getBoundingClientRect();
        return (
            event.clientX >= iconRect.left &&
            event.clientX <= iconRect.right &&
            event.clientY >= iconRect.top &&
            event.clientY <= iconRect.bottom
        );
    }

    /**
     * Check if mouse is over the toggle3 (circle_3) icon
     */
    isMouseOverToggle3Icon(event) {
        if (!this.toggle3Icon || this.toggle3Icon.style.display === 'none') {
            return false;
        }

        const iconRect = this.toggle3Icon.getBoundingClientRect();
        return (
            event.clientX >= iconRect.left &&
            event.clientX <= iconRect.right &&
            event.clientY >= iconRect.top &&
            event.clientY <= iconRect.bottom
        );
    }

    /**
     * Check if mouse is over any button/icon
     */
    isMouseOverAnyIcon(event) {
        return (
            this.isMouseOverRotationIcon(event) ||
            this.isMouseOverResetIcon(event) ||
            this.isMouseOverToggle1Icon(event) ||
            this.isMouseOverToggle2Icon(event) ||
            this.isMouseOverToggle3Icon(event)
        );
    }

    /**
     * Get current circle_1 radius
     */
    getCircle1Radius() {
        if (this.crosshair) {
            const circle1 = this.crosshair.querySelector('.circle_1');
            if (circle1) {
                const width = parseInt(circle1.style.width) || 140;
                return width / 2;
            }
        }
        return 70; // Default fallback
    }

    /**
     * Get current circle_2 radius
     */
    getCircle2Radius() {
        if (this.crosshair) {
            const circle2 = this.crosshair.querySelector('.circle_2');
            if (circle2) {
                const width = parseInt(circle2.style.width) || 70;
                return width / 2;
            }
        }
        return 35; // Default fallback
    }

    /**
     * Get current circle_3 (blue) radius
     */
    getCircle3Radius() {
        if (this.crosshair) {
            const circle3 = this.crosshair.querySelector('.circle_3');
            if (circle3) {
                const width = parseInt(circle3.style.width) || 35;
                return width / 2;
            }
        }
        return 17.5; // Default fallback
    }

    /**
     * Handle circle_2 size change
     */
    handleCircle2SizeChange(event) {
        event.preventDefault();
        
        // Determine size change direction and step size
        const direction = event.deltaY < 0 ? 1 : -1; // Scroll up = increase, down = decrease
        const stepSize = this.isMiddleMouseDown ? this.circle2SizeControl.fineStep : this.circle2SizeControl.step;
        const sizeChange = stepSize * direction;
        const newSize = this.circle2SizeControl.currentSize + sizeChange;
        
        // Calculate maximum size based on current center position and container boundaries
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        const currentCenterX = (containerWidth / 2) + this.centerOffsetX;
        const currentCenterY = (containerHeight / 2) + this.centerOffsetY;
        
        // Calculate maximum radius based on distance to nearest boundary with 5px safety margin
        const safetyMargin = 5; // 5 pixel safety buffer from edges
        const maxRadiusX = Math.min(currentCenterX - safetyMargin, containerWidth - currentCenterX - safetyMargin);
        const maxRadiusY = Math.min(currentCenterY - safetyMargin, containerHeight - currentCenterY - safetyMargin);
        const maxRadius = Math.max(0, Math.min(maxRadiusX, maxRadiusY)); // Ensure non-negative
        const maxDiameter = maxRadius * 2;
        
        // Apply boundary constraint along with existing constraints
        const boundaryConstrainedMaxSize = Math.min(this.circle2SizeControl.maxSize, maxDiameter);
        
        // Clamp to limits
        const clampedSize = Math.max(
            this.circle2SizeControl.minSize, 
            Math.min(boundaryConstrainedMaxSize, newSize)
        );
        
        // Update if size changed
        if (clampedSize !== this.circle2SizeControl.currentSize) {
            this.circle2SizeControl.currentSize = clampedSize;
            this.setCircle2(clampedSize, 'rgba(60, 200, 60, 0.8)');
        }
    }

    /**
     * Handle circle 1 size change
     */
    handleCircle1SizeChange(deltaY) {
        // Calculate new size using appropriate step (fine or normal)
        const direction = deltaY > 0 ? -1 : 1; // Reverse: up = larger, down = smaller
        const stepSize = this.isMiddleMouseDown ? this.circle1SizeControl.fineStep : this.circle1SizeControl.step;
        const newSize = this.circle1SizeControl.currentSize + (direction * stepSize);
        
        // Calculate maximum size based on current center position and container boundaries
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        const currentCenterX = (containerWidth / 2) + this.centerOffsetX;
        const currentCenterY = (containerHeight / 2) + this.centerOffsetY;
        
        // Calculate maximum radius based on distance to nearest boundary with 5px safety margin
        const safetyMargin = 5; // 5 pixel safety buffer from edges
        const maxRadiusX = Math.min(currentCenterX - safetyMargin, containerWidth - currentCenterX - safetyMargin);
        const maxRadiusY = Math.min(currentCenterY - safetyMargin, containerHeight - currentCenterY - safetyMargin);
        const maxRadius = Math.max(0, Math.min(maxRadiusX, maxRadiusY)); // Ensure non-negative
        const maxDiameter = maxRadius * 2;
        
        // Apply boundary constraint along with existing constraints
        const boundaryConstrainedMaxSize = Math.min(this.circle1SizeControl.maxSize, maxDiameter);
        
        // Clamp to valid range
        const clampedSize = Math.max(
            this.circle1SizeControl.minSize,
            Math.min(boundaryConstrainedMaxSize, newSize)
        );
        
        // Update if size changed
        if (clampedSize !== this.circle1SizeControl.currentSize) {
            this.circle1SizeControl.currentSize = clampedSize;
            this.setCircle1(clampedSize, 'rgba(255, 255, 0, 0.8)');
            
            // Update size limits to maintain constraints
            this.updateCircleSizes();
        }
    }

    /**
     * Handle circle 3 size change (First instance - will be removed as duplicate)
     */
    handleCircle3SizeChange_OLD(event) {
        // This method is duplicated - keeping as backup but renamed
        event.preventDefault();
        
        // Determine size change direction and step size
        const direction = event.deltaY < 0 ? 1 : -1; // Scroll up = increase, down = decrease
        const stepSize = this.isMiddleMouseDown ? this.circle3SizeControl.fineStep : this.circle3SizeControl.step;
        const sizeChange = stepSize * direction;
        const newSize = this.circle3SizeControl.currentSize + sizeChange;
        
        // Clamp to limits
        const clampedSize = Math.max(
            this.circle3SizeControl.minSize, 
            Math.min(this.circle3SizeControl.maxSize, newSize)
        );
        
        // Update if size changed
        if (clampedSize !== this.circle3SizeControl.currentSize) {
            this.circle3SizeControl.currentSize = clampedSize;
            this.setCircle3(clampedSize, 'rgba(60, 120, 200, 0.8)');
            
            // Update size limits to maintain constraints
            this.updateCircleSizes();
        }
    }

    /**
     * Handle circle 3 size change
     */
    handleCircle3SizeChange(event) {
        event.preventDefault();
        
        // Determine size change direction and step size
        const direction = event.deltaY < 0 ? 1 : -1; // Scroll up = increase, down = decrease
        const stepSize = this.isMiddleMouseDown ? this.circle3SizeControl.fineStep : this.circle3SizeControl.step;
        const sizeChange = stepSize * direction;
        const newSize = this.circle3SizeControl.currentSize + sizeChange;
        
        // Calculate maximum size based on current center position and container boundaries
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        const currentCenterX = (containerWidth / 2) + this.centerOffsetX;
        const currentCenterY = (containerHeight / 2) + this.centerOffsetY;
        
        // Calculate maximum radius based on distance to nearest boundary with 5px safety margin
        const safetyMargin = 5; // 5 pixel safety buffer from edges
        const maxRadiusX = Math.min(currentCenterX - safetyMargin, containerWidth - currentCenterX - safetyMargin);
        const maxRadiusY = Math.min(currentCenterY - safetyMargin, containerHeight - currentCenterY - safetyMargin);
        const maxRadius = Math.max(0, Math.min(maxRadiusX, maxRadiusY)); // Ensure non-negative
        const maxDiameter = maxRadius * 2;
        
        // Apply boundary constraint along with existing constraints
        const boundaryConstrainedMaxSize = Math.min(this.circle3SizeControl.maxSize, maxDiameter);
        
        // Clamp to limits
        const clampedSize = Math.max(
            this.circle3SizeControl.minSize, 
            Math.min(boundaryConstrainedMaxSize, newSize)
        );
        
        // Update if size changed
        if (clampedSize !== this.circle3SizeControl.currentSize) {
            this.circle3SizeControl.currentSize = clampedSize;
            this.setCircle3(clampedSize, 'rgba(60, 120, 200, 0.8)');
            
            // Update size limits to maintain constraints
            this.updateCircleSizes();
        }
    }

    /**
     * Handle circle_1 resize when hovering over btn_circle_1
     */
    handleCircle1Resize(deltaY) {
        // Reuse existing circle_1 resize logic
        this.handleCircle1SizeChange(deltaY);
    }

    /**
     * Handle circle_2 resize when hovering over btn_circle_2
     */
    handleCircle2Resize(deltaY) {
        // Create event object similar to wheel event for circle_2 resize
        const event = { deltaY: deltaY, preventDefault: () => {} };
        this.handleCircle2SizeChange(event);
    }

    /**
     * Handle circle_3 resize when hovering over btn_circle_3
     */
    handleCircle3Resize(deltaY) {
        // Create event object similar to wheel event for circle_3 resize
        const event = { deltaY: deltaY, preventDefault: () => {} };
        this.handleCircle3SizeChange(event);
    }

    /**
     * Reset circles to their initial default sizes
     */
    resetCirclesToDefault() {
        const containerHeight = this.container.clientHeight;
        
        if (containerHeight > 0) {
            const circle1Size = Math.round(containerHeight * this.circleSettings.circle1Percentage);
            const circle2Size = Math.round(containerHeight * this.circleSettings.circle2Percentage);
            const circle3Size = Math.round(containerHeight * this.circleSettings.circle3Percentage);
            
            // Reset all circles to default sizes
            this.circle1SizeControl.currentSize = circle1Size;
            this.circle2SizeControl.currentSize = circle2Size;
            this.circle3SizeControl.currentSize = circle3Size;
            
            // Reset visibility states to defaults
            this.circle1Visible = true;
            this.circle2Visible = false; // Hidden by default - green circle
            this.circle3Visible = false; // Hidden by default - cyan circle for advanced use
            
            // Apply the reset sizes
            this.setCircle1(circle1Size, 'rgba(255, 255, 0, 0.8)');
            this.setCircle2(circle2Size, 'rgba(60, 200, 60, 0.8)');
            this.setCircle3(circle3Size, 'rgba(60, 120, 200, 0.8)');
            
            // Update circle visibility and toggle icon states
            this.updateCircleVisibility();
            this.updateToggleIconStates();
            
            // Update limits based on new sizes
            this.updateCircleSizes();
            
            // Reset rotation to 45 degrees (X orientation)
            this.rotationAngle = 45;
            this.applyCrosshairRotation();
            
            // Reset center position to default
            this.resetCenterPosition();
            
            // Hide crosshair lines (red cross) when reset
            if (this.crosshair) {
                const hLine = this.crosshair.querySelector('.h_line');
                const vLine = this.crosshair.querySelector('.v_line');
                if (hLine && vLine) {
                    hLine.style.display = 'none';
                    vLine.style.display = 'none';
                }
            }
            
            // Dispatch event for any listeners
            this.dispatchCrosshairEvent('circlesReset', { 
                circle1Size: circle1Size, 
                circle2Size: circle2Size 
            });
        }
    }

    /**
     * Handle crosshair rotation
     */
    handleRotation(deltaY) {
        // Calculate rotation direction (up = counter-clockwise, down = clockwise)
        const direction = deltaY > 0 ? 1 : -1;
        
        // Use fine adjustment when middle mouse is down, normal step otherwise
        const stepSize = this.isMiddleMouseDown ? this.fineRotationStep : this.rotationStep;
        this.rotationAngle += direction * stepSize;
        
        // Keep angle within 0-360 range
        this.rotationAngle = ((this.rotationAngle % 360) + 360) % 360;
        
        // Apply rotation to crosshair
        this.applyCrosshairRotation();
    }

    /**
     * Apply rotation transform to crosshair elements
     */
    applyCrosshairRotation() {
        if (this.crosshair) {
            // Combine rotation and translation transforms
            const transform = `translate(${this.centerOffsetX}px, ${this.centerOffsetY}px) rotate(${this.rotationAngle}deg)`;
            this.crosshair.style.transform = transform;
        }
    }

    /**
     * Reset crosshair rotation to 0 degrees
     */
    resetRotation() {
        this.rotationAngle = 45;
        this.applyCrosshairRotation();
        this.dispatchCrosshairEvent('rotationReset', { angle: this.rotationAngle });
    }

    /**
     * Toggle circle_1 (yellow circle) visibility
     */
    toggleCircle1Visibility() {
        this.circle1Visible = !this.circle1Visible;
        this.updateCircleVisibility();
        this.updateToggleIconStates();
        this.dispatchCrosshairEvent('circle1VisibilityToggled', { 
            visible: this.circle1Visible 
        });
    }

    /**
     * Toggle circle_2 (red circle) visibility
     */
    toggleCircle2Visibility() {
        this.circle2Visible = !this.circle2Visible;
        this.updateCircleVisibility();
        this.updateToggleIconStates();
        this.dispatchCrosshairEvent('circle2VisibilityToggled', { 
            visible: this.circle2Visible 
        });
    }

    /**
     * Toggle circle_3 (blue circle) visibility
     */
    toggleCircle3Visibility() {
        this.circle3Visible = !this.circle3Visible;
        this.updateCircleVisibility();
        this.updateToggleIconStates();
        this.dispatchCrosshairEvent('circle3VisibilityToggled', { 
            visible: this.circle3Visible 
        });
    }

    /**
     * Update the visual state of circles based on visibility flags
     */
    updateCircleVisibility() {
        if (!this.isVisible) return; // Don't update if crosshair is hidden

        const circle1 = this.crosshair.querySelector('.circle_1');
        const circle2 = this.crosshair.querySelector('.circle_2');
        const circle3 = this.crosshair.querySelector('.circle_3');

        if (circle1) {
            circle1.style.display = this.circle1Visible ? 'block' : 'none';
        }
        if (circle2) {
            circle2.style.display = this.circle2Visible ? 'block' : 'none';
        }
        if (circle3) {
            circle3.style.display = this.circle3Visible ? 'block' : 'none';
        }
    }

    /**
     * Update toggle icon visual states based on circle visibility
     */
    updateToggleIconStates() {
        if (this.toggle1Icon) {
            if (this.circle1Visible) {
                this.toggle1Icon.classList.remove('hidden');
            } else {
                this.toggle1Icon.classList.add('hidden');
            }
        }

        if (this.toggle2Icon) {
            if (this.circle2Visible) {
                this.toggle2Icon.classList.remove('hidden');
            } else {
                this.toggle2Icon.classList.add('hidden');
            }
        }

        if (this.toggle3Icon) {
            if (this.circle3Visible) {
                this.toggle3Icon.classList.remove('hidden');
            } else {
                this.toggle3Icon.classList.add('hidden');
            }
        }
    }

    /**
     * Handle zoom event (delegate back to zoom controller)
     */
    handleZoomEvent(event) {
        // Temporarily re-enable zoom for this event
        if (this.zoomController && this.zoomController.handleWheelForCrosshair) {
            this.zoomController.handleWheelForCrosshair(event);
        }
    }

    /**
     * Setup event listeners for crosshair toggle
     */
    setupEventListeners() {
        // Right-click context menu prevention - now used for fine control state
        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent browser context menu
        });

        // Optional: Hide crosshair when camera stops
        document.addEventListener('cameraStreamStopped', () => {
            this.hide();
        });

        // Update circle sizes when camera starts and show crosshair by default
        document.addEventListener('cameraStreamStarted', () => {
            // Small delay to ensure video element has proper dimensions
            setTimeout(() => {
                this.updateCircleSizes();
                this.show(); // Automatically show crosshair and buttons when camera starts
            }, 100);
        });

        // Track mouse button states
        this.container.addEventListener('mousedown', (event) => {
            if (event.button === 1) { // Middle mouse button - now drags center point
                event.preventDefault(); // Prevent default middle-click behavior (scrolling)
                if (this.isVisible) {
                    // Get mouse position relative to container
                    const rect = this.container.getBoundingClientRect();
                    const mouseX = event.clientX - rect.left;
                    const mouseY = event.clientY - rect.top;
                    
                    // Calculate current center position (container center + current offset)
                    const containerCenterX = rect.width / 2;
                    const containerCenterY = rect.height / 2;
                    const currentCenterX = containerCenterX + this.centerOffsetX;
                    const currentCenterY = containerCenterY + this.centerOffsetY;
                    
                    // Calculate offset from mouse to current center
                    this.dragMouseOffsetX = currentCenterX - mouseX;
                    this.dragMouseOffsetY = currentCenterY - mouseY;
                    
                    // Check if crosshair lines are currently visible
                    const hLine = this.crosshair.querySelector('.h_line');
                    const vLine = this.crosshair.querySelector('.v_line');
                    this.crosshairLinesVisibleBeforeDrag = hLine && vLine && 
                        hLine.style.display !== 'none' && vLine.style.display !== 'none';
                    
                    // Show crosshair lines during drag for better positioning reference
                    if (hLine && vLine) {
                        hLine.style.display = 'block';
                        vLine.style.display = 'block';
                    }
                    
                    this.isDraggingCenter = true;
                    this.container.style.cursor = 'move';
                }
            } else if (event.button === 2) { // Right mouse button - now for fine control
                this.isMiddleMouseDown = true; // Reusing the same variable for fine control
                event.preventDefault(); // Prevent context menu
            }
        });

        this.container.addEventListener('mousemove', (event) => {
            if (this.isDraggingCenter && this.isVisible) {
                event.preventDefault();
                
                // Get mouse position relative to container
                const rect = this.container.getBoundingClientRect();
                const mouseX = event.clientX - rect.left;
                const mouseY = event.clientY - rect.top;
                
                // Calculate new center position (mouse + offset to maintain relative position)
                const newCenterX = mouseX + this.dragMouseOffsetX;
                const newCenterY = mouseY + this.dragMouseOffsetY;
                
                // Get current circle_1 (yellow circle) radius
                const circle1Radius = this.getCircle1Radius();
                
                // Apply constraints to keep circle_1 within container bounds with 5px safety margin
                const containerWidth = rect.width;
                const containerHeight = rect.height;
                const safetyMargin = 5; // 5 pixel safety buffer from edges
                
                // Constrain center position so circle_1 stays within bounds plus safety margin
                const constrainedCenterX = Math.max(
                    circle1Radius + safetyMargin, 
                    Math.min(containerWidth - circle1Radius - safetyMargin, newCenterX)
                );
                const constrainedCenterY = Math.max(
                    circle1Radius + safetyMargin, 
                    Math.min(containerHeight - circle1Radius - safetyMargin, newCenterY)
                );
                
                // Calculate container center for reference
                const containerCenterX = rect.width / 2;
                const containerCenterY = rect.height / 2;
                
                // Calculate offset from container center using constrained position
                this.centerOffsetX = constrainedCenterX - containerCenterX;
                this.centerOffsetY = constrainedCenterY - containerCenterY;
                
                this.updateCenterPosition();
            }
        });

        this.container.addEventListener('mouseup', (event) => {
            if (event.button === 1) { // Middle mouse button released
                if (this.isDraggingCenter) {
                    // Restore crosshair lines visibility to pre-drag state
                    if (!this.crosshairLinesVisibleBeforeDrag) {
                        const hLine = this.crosshair.querySelector('.h_line');
                        const vLine = this.crosshair.querySelector('.v_line');
                        if (hLine && vLine) {
                            hLine.style.display = 'none';
                            vLine.style.display = 'none';
                        }
                    }
                    
                    this.isDraggingCenter = false;
                    this.container.style.cursor = 'grab';
                }
            } else if (event.button === 2) { // Right mouse button - reset fine control state
                this.isMiddleMouseDown = false;
            }
        });

        // Reset states when mouse leaves the container
        this.container.addEventListener('mouseleave', () => {
            this.isMiddleMouseDown = false;
            if (this.isDraggingCenter) {
                // Restore crosshair lines visibility to pre-drag state
                if (!this.crosshairLinesVisibleBeforeDrag) {
                    const hLine = this.crosshair.querySelector('.h_line');
                    const vLine = this.crosshair.querySelector('.v_line');
                    if (hLine && vLine) {
                        hLine.style.display = 'none';
                        vLine.style.display = 'none';
                    }
                }
                
                this.isDraggingCenter = false;
                this.container.style.cursor = 'grab';
            }
        });

        // Prevent event propagation on circle elements to avoid triggering zoom reset
        this.setupCircleEventHandlers();

        // Crosshair icon click behavior: single click = toggle, double click = reset orientation
        if (this.rotationIcon) {
            let crosshairClickTimeout = null;
            let crosshairClickCount = 0;
            
            this.rotationIcon.addEventListener('click', (event) => {
                event.preventDefault();
                crosshairClickCount++;
                
                if (crosshairClickCount === 1) {
                    // Wait for potential second click
                    crosshairClickTimeout = setTimeout(() => {
                        // Single click - toggle crosshair lines only
                        this.toggleCrosshairLines();
                        crosshairClickCount = 0;
                    }, 250); // 250ms window for double click
                } else if (crosshairClickCount === 2) {
                    // Double click - reset orientation
                    clearTimeout(crosshairClickTimeout);
                    this.resetRotation();
                    crosshairClickCount = 0;
                }
            });
        }

        // Reset icon click to reset circles
        if (this.resetIcon) {
            this.resetIcon.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetCirclesToDefault();
            });
        }

        // Toggle icons for individual circle visibility
        if (this.toggle1Icon) {
            let circle1ClickTimeout = null;
            let circle1ClickCount = 0;
            
            this.toggle1Icon.addEventListener('click', (event) => {
                event.preventDefault();
                circle1ClickCount++;
                
                if (circle1ClickCount === 1) {
                    // Wait for potential second click
                    circle1ClickTimeout = setTimeout(() => {
                        // Single click - toggle visibility
                        this.toggleCircle1Visibility();
                        circle1ClickCount = 0;
                    }, 250); // 250ms window for double click
                } else if (circle1ClickCount === 2) {
                    // Double click - do nothing (prevent double toggle)
                    clearTimeout(circle1ClickTimeout);
                    circle1ClickCount = 0;
                }
            });
        }

        if (this.toggle2Icon) {
            let circle2ClickTimeout = null;
            let circle2ClickCount = 0;
            
            this.toggle2Icon.addEventListener('click', (event) => {
                event.preventDefault();
                circle2ClickCount++;
                
                if (circle2ClickCount === 1) {
                    // Wait for potential second click
                    circle2ClickTimeout = setTimeout(() => {
                        // Single click - toggle visibility
                        this.toggleCircle2Visibility();
                        circle2ClickCount = 0;
                    }, 250); // 250ms window for double click
                } else if (circle2ClickCount === 2) {
                    // Double click - do nothing (prevent double toggle)
                    clearTimeout(circle2ClickTimeout);
                    circle2ClickCount = 0;
                }
            });
        }

        if (this.toggle3Icon) {
            let circle3ClickTimeout = null;
            let circle3ClickCount = 0;
            
            this.toggle3Icon.addEventListener('click', (event) => {
                event.preventDefault();
                circle3ClickCount++;
                
                if (circle3ClickCount === 1) {
                    // Wait for potential second click
                    circle3ClickTimeout = setTimeout(() => {
                        // Single click - toggle visibility
                        this.toggleCircle3Visibility();
                        circle3ClickCount = 0;
                    }, 250); // 250ms window for double click
                } else if (circle3ClickCount === 2) {
                    // Double click - do nothing (prevent double toggle)
                    clearTimeout(circle3ClickTimeout);
                    circle3ClickCount = 0;
                }
            });
        }
    }

    /**
     * Toggle crosshair lines visibility (not the circles or buttons)
     */
    toggleCrosshairLines() {
        if (!this.isVisible) {
            // If crosshair system is not visible, show everything first
            this.show();
            return;
        }

        if (this.crosshair) {
            const hLine = this.crosshair.querySelector('.h_line');
            const vLine = this.crosshair.querySelector('.v_line');
            
            if (hLine && vLine) {
                const isHidden = hLine.style.display === 'none';
                
                if (isHidden) {
                    // Show crosshair lines
                    hLine.style.display = 'block';
                    vLine.style.display = 'block';
                    this.dispatchCrosshairEvent('crosshairLinesShown');
                } else {
                    // Hide crosshair lines
                    hLine.style.display = 'none';
                    vLine.style.display = 'none';
                    this.dispatchCrosshairEvent('crosshairLinesHidden');
                }
            }
        }
    }

    /**
     * Show crosshair (only if camera is active)
     */
    show() {
        // Only show crosshair if camera is currently running
        if (!this.isCameraActive()) {
            return; // Don't show crosshair when camera is not active
        }

        if (this.crosshair) {
            this.crosshair.style.display = 'block';
            this.isVisible = true;
            
            // Apply initial rotation (45 degrees for X orientation)
            this.applyCrosshairRotation();
            
            // Hide crosshair lines by default
            const hLine = this.crosshair.querySelector('.h_line');
            const vLine = this.crosshair.querySelector('.v_line');
            if (hLine && vLine) {
                hLine.style.display = 'none';
                vLine.style.display = 'none';
            }
            
            // Setup event handlers for circles to prevent zoom conflicts
            this.setupCircleEventHandlers();
            
            // Show rotation, reset, and toggle icons when crosshair is visible
            if (this.rotationIcon) {
                this.rotationIcon.style.display = 'flex';
            }
            if (this.resetIcon) {
                this.resetIcon.style.display = 'flex';
            }
            if (this.toggle1Icon) {
                this.toggle1Icon.style.display = 'flex';
            }
            if (this.toggle2Icon) {
                this.toggle2Icon.style.display = 'flex';
            }
            if (this.toggle3Icon) {
                this.toggle3Icon.style.display = 'flex';
            }
            
            // Update circle visibility and toggle icon states
            this.updateCircleVisibility();
            this.updateToggleIconStates();
            
            // Apply current center position
            this.updateCenterPosition();
            
            // Disable zoom when crosshair is shown (wheel events will be handled by crosshair controller)
            if (this.zoomController && this.zoomController.disableZoom) {
                this.zoomController.disableZoom();
            }
            
            this.dispatchCrosshairEvent('show');
        }
    }

    /**
     * Hide crosshair
     */
    hide() {
        if (this.crosshair) {
            this.crosshair.style.display = 'none';
            this.isVisible = false;
            
            // Hide rotation, reset, and toggle icons when crosshair is hidden
            if (this.rotationIcon) {
                this.rotationIcon.style.display = 'none';
            }
            if (this.resetIcon) {
                this.resetIcon.style.display = 'none';
            }
            if (this.toggle1Icon) {
                this.toggle1Icon.style.display = 'none';
            }
            if (this.toggle2Icon) {
                this.toggle2Icon.style.display = 'none';
            }
            if (this.toggle3Icon) {
                this.toggle3Icon.style.display = 'none';
            }
            
            // Re-enable zoom when crosshair is hidden
            if (this.zoomController && this.zoomController.enableZoom) {
                this.zoomController.enableZoom();
            }
            
            this.dispatchCrosshairEvent('hide');

        }
    }

    /**
     * Toggle crosshair visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Get crosshair visibility status
     */
    isShown() {
        return this.isVisible;
    }

    /**
     * Set crosshair color
     */
    setColor(color) {
        if (this.crosshair) {
            const horizontal = this.crosshair.querySelector('.h_line');
            const vertical = this.crosshair.querySelector('.v_line');
            
            if (horizontal && vertical) {
                horizontal.style.backgroundColor = color;
                vertical.style.backgroundColor = color;
                this.dispatchCrosshairEvent('colorChanged', { color });
            }
        }
    }

    /**
     * Set crosshair thickness
     */
    setThickness(thickness) {
        if (this.crosshair) {
            const horizontal = this.crosshair.querySelector('.h_line');
            const vertical = this.crosshair.querySelector('.v_line');
            
            if (horizontal && vertical) {
                horizontal.style.height = `${thickness}px`;
                vertical.style.width = `${thickness}px`;
                this.dispatchCrosshairEvent('thicknessChanged', { thickness });
            }
        }
    }

    /**
     * Set crosshair opacity
     */
    setOpacity(opacity) {
        if (this.crosshair) {
            this.crosshair.style.opacity = opacity;
            this.dispatchCrosshairEvent('opacityChanged', { opacity });
        }
    }

    /**
     * Set circle_1 (yellow) properties
     */
    setCircle1(size, color = 'rgba(255, 255, 0, 0.8)') {
        if (this.crosshair) {
            const circle1 = this.crosshair.querySelector('.circle_1');
            if (circle1) {
                circle1.style.setProperty('width', `${size}px`, 'important');
                circle1.style.setProperty('height', `${size}px`, 'important');
                circle1.style.borderColor = color;
                circle1.style.border = `2px solid ${color}`;
                circle1.style.display = this.circle1Visible ? 'block' : 'none';
                this.updateCrosshairLines(size);
                this.dispatchCrosshairEvent('circle1Changed', { size, color });
            }
        }
    }

    /**
     * Update crosshair lines based on circle_1 size
     */
    updateCrosshairLines(circle1Size) {
        if (this.crosshair) {
            const hLine = this.crosshair.querySelector('.h_line');
            const vLine = this.crosshair.querySelector('.v_line');
            
            if (hLine && vLine) {
                // Calculate line length: circle_1 diameter + 5% extension on each side
                const extension = circle1Size * 0.05; // 5% of circle_1 diameter
                const lineLength = circle1Size + (extension * 2); // Extension on both sides
                
                // Set both horizontal and vertical line lengths
                hLine.style.width = `${lineLength}px`;
                vLine.style.height = `${lineLength}px`;
            }
        }
    }

    /**
     * Update the center position of the crosshair and all circles
     */
    updateCenterPosition() {
        if (this.crosshair) {
            // Apply combined transform to the entire crosshair container
            // This moves all elements (lines and circles) together while preserving rotation
            const transform = `translate(${this.centerOffsetX}px, ${this.centerOffsetY}px) rotate(${this.rotationAngle}deg)`;
            this.crosshair.style.transform = transform;
        }
    }

    /**
     * Reset center position to default (center of container)
     */
    resetCenterPosition() {
        this.centerOffsetX = 0;
        this.centerOffsetY = 0;
        
        if (this.crosshair) {
            // Reset crosshair container transform while preserving rotation
            this.crosshair.style.transform = `translate(0px, 0px) rotate(${this.rotationAngle}deg)`;
        }
        
        this.dispatchCrosshairEvent('centerReset');
    }

    /**
     * Set circle_2 (red) properties
     */
    setCircle2(size, color = 'rgba(60, 200, 60, 0.8)') {
        if (this.crosshair) {
            const circle2 = this.crosshair.querySelector('.circle_2');
            if (circle2) {
                circle2.style.width = `${size}px`;
                circle2.style.height = `${size}px`;
                circle2.style.borderColor = color;
                circle2.style.display = this.circle2Visible ? 'block' : 'none';
                this.dispatchCrosshairEvent('circle2Changed', { size, color });
            }
        }
    }

    /**
     * Set circle_3 (blue) properties
     */
    setCircle3(size, color = 'rgba(60, 120, 200, 0.8)') {
        if (this.crosshair) {
            const circle3 = this.crosshair.querySelector('.circle_3');
            if (circle3) {
                circle3.style.width = `${size}px`;
                circle3.style.height = `${size}px`;
                circle3.style.borderColor = color;
                circle3.style.display = this.circle3Visible ? 'block' : 'none';
                this.dispatchCrosshairEvent('circle3Changed', { size, color });
            }
        }
    }

    /**
     * Show/hide circles
     */
    setCirclesVisible(visible) {
        if (this.crosshair) {
            const center = this.crosshair.querySelector('.crosshair-center');
            if (center) {
                center.style.display = visible ? 'block' : 'none';
                this.dispatchCrosshairEvent('circlesVisibilityChanged', { visible });
            }
        }
    }

    /**
     * Reset crosshair to default settings
     */
    reset() {
        this.setColor('rgba(0, 0, 0, 0.9)');
        this.setThickness(1);
        this.setOpacity(1);
        this.updateCircleSizes(); // Use dynamic sizing and reset circle_2 size
        this.setCirclesVisible(true);
        this.hide(); // This will also re-enable zoom
        this.dispatchCrosshairEvent('reset');
    }

    /**
     * Setup event handlers for circle elements to prevent event propagation
     */
    setupCircleEventHandlers() {
        if (this.crosshair) {
            const circles = [
                this.crosshair.querySelector('.circle_1'),
                this.crosshair.querySelector('.circle_2'),
                this.crosshair.querySelector('.circle_3')
            ];

            circles.forEach(circle => {
                if (circle) {
                    // Prevent all mouse events from bubbling up to container
                    ['click', 'dblclick', 'mousedown', 'mouseup', 'wheel'].forEach(eventType => {
                        circle.addEventListener(eventType, (e) => {
                            e.stopPropagation(); // Prevent event from reaching container
                        });
                    });
                }
            });

            // Also prevent events on crosshair lines
            const lines = [
                this.crosshair.querySelector('.h_line'),
                this.crosshair.querySelector('.v_line')
            ];

            lines.forEach(line => {
                if (line) {
                    ['click', 'dblclick', 'mousedown', 'mouseup', 'wheel'].forEach(eventType => {
                        line.addEventListener(eventType, (e) => {
                            e.stopPropagation(); // Prevent event from reaching container
                        });
                    });
                }
            });
        }
    }

    /**
     * Dispatch crosshair events
     */
    dispatchCrosshairEvent(type, detail = {}) {
        const event = new CustomEvent('crosshairChanged', {
            detail: {
                type,
                visible: this.isVisible,
                ...detail
            }
        });
        this.container.dispatchEvent(event);
    }

    /**
     * Get current settings
     */
    getSettings() {
        const horizontal = this.crosshair?.querySelector('.h_line');
        const vertical = this.crosshair?.querySelector('.v_line');
        const outerCircle = this.crosshair?.querySelector('.circle_1');
        const innerCircle = this.crosshair?.querySelector('.circle_2');
        const center = this.crosshair?.querySelector('.crosshair-center');
        
        return {
            visible: this.isVisible,
            color: horizontal?.style.backgroundColor || 'rgba(0, 0, 0, 0.9)',
            thickness: parseInt(horizontal?.style.height) || 1,
            opacity: parseFloat(this.crosshair?.style.opacity) || 1,
            circles: {
                visible: center?.style.display !== 'none',
                outer: {
                    size: parseInt(outerCircle?.style.width) || 20,
                    color: outerCircle?.style.borderColor || 'rgba(255, 255, 0, 0.8)'
                },
                inner: {
                    size: parseInt(innerCircle?.style.width) || 10,
                    color: innerCircle?.style.borderColor || 'rgba(200, 60, 60, 0.8)'
                }
            }
        };
    }

    /**
     * Cleanup method
     */
    destroy() {
        if (this.container) {
            this.container.removeEventListener('contextmenu', this.toggle);
            this.container.removeEventListener('selectstart', this.preventSelection);
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        this.initialized = false;
    }
}