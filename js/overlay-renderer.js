/**
 * OverlayRenderer - Handles canvas overlay rendering on top of webcam
 */
class OverlayRenderer {
    constructor(canvasId, videoElement) {
        this.canvas = document.getElementById(canvasId);
        this.canvasContext = this.canvas.getContext('2d');
        this.video = videoElement;
        this.overlayElements = {
            circles: [],
            lines: [],
            points: [],
            polygons: []
        };
        this.isRendering = false;
        this.animationId = null;
        this.settings = {
            showCircles: true,
            showLines: true,
            showPoints: true,
            showPolygons: true
        };
    }

    /**
     * Initialize the overlay renderer
     */
    initialize() {
        this.setupCanvas();
        this.setupEventListeners();
        return true;
    }

    /**
     * Setup canvas properties
     */
    setupCanvas() {
        // Set canvas size to match container
        this.resizeCanvas();
        
        // Setup canvas styles
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '10';
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for webcam loaded event
        document.addEventListener('webcamLoaded', (event) => {
            this.onWebcamLoaded(event.detail);
        });

        // Listen for window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });

        // Listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRendering) {
                this.pauseRendering();
            } else if (!document.hidden && !this.isRendering && this.video.srcObject) {
                this.startRendering();
            }
        });
    }

    /**
     * Handle webcam loaded event
     */
    onWebcamLoaded(videoInfo) {
        this.resizeCanvas();
        this.startRendering();
    }

    /**
     * Resize canvas to match video display size
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        this.canvas.width = containerRect.width;
        this.canvas.height = containerRect.height;
        
        // Update canvas display size
        this.canvas.style.width = `${containerRect.width}px`;
        this.canvas.style.height = `${containerRect.height}px`;
    }

    /**
     * Start rendering loop
     */
    startRendering() {
        if (this.isRendering) return;
        
        this.isRendering = true;
        this.renderLoop();
    }

    /**
     * Stop rendering loop
     */
    stopRendering() {
        this.isRendering = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.clearCanvas();
    }

    /**
     * Pause rendering
     */
    pauseRendering() {
        this.isRendering = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Main rendering loop
     */
    renderLoop() {
        if (!this.isRendering) return;

        this.clearCanvas();
        this.drawAllOverlays();

        this.animationId = requestAnimationFrame(() => {
            this.renderLoop();
        });
    }

    /**
     * Clear the canvas
     */
    clearCanvas() {
        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw all overlay elements
     */
    drawAllOverlays() {
        // Draw circles
        if (this.settings.showCircles) {
            this.drawCircles();
        }

        // Draw lines
        if (this.settings.showLines) {
            this.drawLines();
        }

        // Draw points
        if (this.settings.showPoints) {
            this.drawPoints();
        }

        // Draw polygons
        if (this.settings.showPolygons) {
            this.drawPolygons();
        }
    }

    /**
     * Draw circles
     */
    drawCircles() {
        this.overlayElements.circles.forEach(circle => {
            if (!circle.visible) return;

            this.canvasContext.save();
            this.canvasContext.strokeStyle = circle.color || '#00ff00';
            this.canvasContext.lineWidth = circle.lineWidth || 2;
            this.canvasContext.globalAlpha = circle.opacity || 1;

            if (circle.fill) {
                this.canvasContext.fillStyle = circle.fillColor || circle.color || '#00ff0030';
                this.canvasContext.beginPath();
                this.canvasContext.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
                this.canvasContext.fill();
            }

            this.canvasContext.beginPath();
            this.canvasContext.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
            this.canvasContext.stroke();

            // Draw label if exists
            if (circle.label) {
                this.drawLabel(circle.x, circle.y - circle.radius - 10, circle.label);
            }

            this.canvasContext.restore();
        });
    }

    /**
     * Draw lines
     */
    drawLines() {
        this.overlayElements.lines.forEach(line => {
            if (!line.visible) return;

            this.canvasContext.save();
            this.canvasContext.strokeStyle = line.color || '#ff0000';
            this.canvasContext.lineWidth = line.lineWidth || 2;
            this.canvasContext.globalAlpha = line.opacity || 1;

            if (line.dashed) {
                this.canvasContext.setLineDash([5, 5]);
            }

            this.canvasContext.beginPath();
            this.canvasContext.moveTo(line.x1, line.y1);
            this.canvasContext.lineTo(line.x2, line.y2);
            this.canvasContext.stroke();

            // Draw arrows if specified
            if (line.arrow) {
                this.drawArrow(line.x1, line.y1, line.x2, line.y2);
            }

            this.canvasContext.restore();
        });
    }

    /**
     * Draw points
     */
    drawPoints() {
        this.overlayElements.points.forEach(point => {
            if (!point.visible) return;

            this.canvasContext.save();
            this.canvasContext.fillStyle = point.color || '#0000ff';
            this.canvasContext.globalAlpha = point.opacity || 1;

            this.canvasContext.beginPath();
            this.canvasContext.arc(point.x, point.y, point.radius || 3, 0, 2 * Math.PI);
            this.canvasContext.fill();

            if (point.label) {
                this.drawLabel(point.x + 5, point.y - 5, point.label);
            }

            this.canvasContext.restore();
        });
    }

    /**
     * Draw polygons
     */
    drawPolygons() {
        this.overlayElements.polygons.forEach(polygon => {
            if (!polygon.visible || polygon.points.length < 3) return;

            this.canvasContext.save();
            this.canvasContext.strokeStyle = polygon.color || '#ff00ff';
            this.canvasContext.lineWidth = polygon.lineWidth || 2;
            this.canvasContext.globalAlpha = polygon.opacity || 1;

            this.canvasContext.beginPath();
            this.canvasContext.moveTo(polygon.points[0].x, polygon.points[0].y);
            
            for (let pointIndex = 1; pointIndex < polygon.points.length; pointIndex++) {
                this.canvasContext.lineTo(polygon.points[pointIndex].x, polygon.points[pointIndex].y);
            }
            
            this.canvasContext.closePath();

            if (polygon.fill) {
                this.canvasContext.fillStyle = polygon.fillColor || polygon.color + '30';
                this.canvasContext.fill();
            }

            this.canvasContext.stroke();
            this.canvasContext.restore();
        });
    }

    /**
     * Draw label text
     */
    drawLabel(labelX, labelY, text) {
        this.canvasContext.save();
        this.canvasContext.fillStyle = '#ffffff';
        this.canvasContext.strokeStyle = '#000000';
        this.canvasContext.lineWidth = 3;
        this.canvasContext.font = '12px Arial';
        this.canvasContext.textAlign = 'center';
        
        this.canvasContext.strokeText(text, labelX, labelY);
        this.canvasContext.fillText(text, labelX, labelY);
        this.canvasContext.restore();
    }

    /**
     * Draw arrow at the end of a line
     */
    drawArrow(startX, startY, endX, endY) {
        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowLength = 15;
        const arrowAngle = Math.PI / 6;

        this.canvasContext.beginPath();
        this.canvasContext.moveTo(endX, endY);
        this.canvasContext.lineTo(
            endX - arrowLength * Math.cos(angle - arrowAngle),
            endY - arrowLength * Math.sin(angle - arrowAngle)
        );
        this.canvasContext.moveTo(endX, endY);
        this.canvasContext.lineTo(
            endX - arrowLength * Math.cos(angle + arrowAngle),
            endY - arrowLength * Math.sin(angle + arrowAngle)
        );
        this.canvasContext.stroke();
    }

    // Overlay management methods

    /**
     * Add a circle overlay
     */
    addCircle(centerX, centerY, radius, options = {}) {
        const circle = {
            id: this.generateId(),
            x: centerX,
            y: centerY,
            radius,
            color: options.color || '#00ff00',
            lineWidth: options.lineWidth || 2,
            opacity: options.opacity || 1,
            fill: options.fill || false,
            fillColor: options.fillColor,
            label: options.label,
            visible: true,
            ...options
        };

        this.overlayElements.circles.push(circle);
        return circle.id;
    }

    /**
     * Add a line overlay
     */
    addLine(startX, startY, endX, endY, options = {}) {
        const line = {
            id: this.generateId(),
            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY,
            color: options.color || '#ff0000',
            lineWidth: options.lineWidth || 2,
            opacity: options.opacity || 1,
            dashed: options.dashed || false,
            arrow: options.arrow || false,
            visible: true,
            ...options
        };

        this.overlayElements.lines.push(line);
        return line.id;
    }

    /**
     * Add a point overlay
     */
    addPoint(pointX, pointY, options = {}) {
        const point = {
            id: this.generateId(),
            x: pointX,
            y: pointY,
            radius: options.radius || 3,
            color: options.color || '#0000ff',
            opacity: options.opacity || 1,
            label: options.label,
            visible: true,
            ...options
        };

        this.overlayElements.points.push(point);
        return point.id;
    }

    /**
     * Clear all overlays
     */
    clearAllOverlays() {
        this.overlayElements.circles = [];
        this.overlayElements.lines = [];
        this.overlayElements.points = [];
        this.overlayElements.polygons = [];
    }

    /**
     * Remove specific overlay by ID
     */
    removeOverlay(id) {
        Object.keys(this.overlayElements).forEach(type => {
            this.overlayElements[type] = this.overlayElements[type].filter(
                element => element.id !== id
            );
        });
    }

    /**
     * Update overlay settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return 'overlay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get canvas coordinates from screen coordinates
     */
    getCanvasCoordinates(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: ((screenX - rect.left) / rect.width) * this.canvas.width,
            y: ((screenY - rect.top) / rect.height) * this.canvas.height
        };
    }

}