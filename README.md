# Telescope Collimation Tool

A modern, responsive web application for precise telescope mirror collimation with advanced crosshair controls and intelligent auto-exposure.

## 🌐 Live Demo

**Try it now:** [https://yourusername.github.io/telescope-collimation-tool](https://yourusername.github.io/telescope-collimation-tool)
_(Replace with your actual GitHub Pages URL)_

## 🚀 Quick Start

1. **Visit the live demo** link above
2. **Allow camera permission** when prompted
3. **Select your telescope camera** from the dropdown menu
4. **Click START** to begin collimation process
5. **Use crosshair controls** to align your telescope mirrors

## 🔧 Local Development

To run locally for development or customization:

```bash
# Clone the repository
git clone https://github.com/yourusername/telescope-collimation-tool.git
cd telescope-collimation-tool

# Start a local web server
python -m http.server 8000
# Or use any other web server

# Open browser to http://localhost:8000
```

## 🔧 Requirements

- **Python 3.x** (recommended) or Python 2.7+
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **Camera/webcam** connected to your computer

## 🎯 Features

### Core Collimation Tools

- 🎯 **Interactive crosshair system** with draggable center point
- 🔵 **Three adjustable circles** for precise mirror alignment
- 🖱️ **Middle-mouse drag** to reposition crosshair center
- ↩️ **Double-click reset** for quick crosshair orientation
- 📏 **Real-time size controls** with fine adjustment mode

### Advanced Camera Controls

- 📹 **Multiple camera support** with automatic detection
- 🔍 **Zoom and pan** functionality with mouse wheel
- ☀️ **Intelligent auto-exposure** with image analysis
- 🎚️ **Manual exposure controls** (brightness, contrast, saturation)
- 📱 **Quality selection** (480p, 720p, 1080p)

### User Experience

- 🎨 **Modern GitHub-style interface** with dark theme
- 📱 **Fully responsive design** for all screen sizes
- ⌨️ **Keyboard shortcuts** for quick actions
- 🔧 **Debug information** for troubleshooting
- 🌐 **Works on GitHub Pages** - no installation required

## 🎮 Controls

### Crosshair Controls

- **Circle Size Buttons**: Adjust individual circle diameters
- **Rotation Icon**: Single click to toggle lines, double-click to reset
- **Middle Mouse Drag**: Move crosshair center position anywhere
- **Right Click**: Enable fine adjustment mode for precise control

### Camera Controls

- **START/STOP**: Begin/end telescope camera streaming
- **Camera Selector**: Choose from available cameras
- **Auto Exposure**: Toggle intelligent exposure adjustment
- **Manual Sliders**: Fine-tune exposure, brightness, contrast

### Zoom & Navigation

- **Mouse Wheel**: Zoom in/out for detailed alignment
- **Mouse Drag**: Pan around zoomed image
- **Double Click**: Reset zoom and center view

## 🔍 Troubleshooting

### Camera Not Working

1. **Check HTTPS/localhost**: Modern browsers require HTTPS or localhost for camera access
2. **Grant permissions**: Allow camera access when browser prompts
3. **Check Debug Info**: Look at the debug panel for specific issues
4. **Try different browser**: Chrome and Firefox have best camera support

### Common Issues

- **"Camera Support: No"** → Use a modern browser
- **"HTTPS: No"** → Use the local server (localhost) or HTTPS
- **"Permission Status: denied"** → Grant camera permission in browser settings
- **"Cameras Found: 0"** → Check camera connection and drivers

### Browser Compatibility

- ✅ **Chrome 60+** (recommended)
- ✅ **Firefox 55+**
- ✅ **Safari 11+**
- ✅ **Edge 79+**
- ❌ Internet Explorer (not supported)

## 📁 Project Structure

```
telescope-collimation-tool/
├── index.html                  # Main application entry point
├── styles.css                  # GitHub-style dark theme CSS
├── .gitignore                  # Git ignore file for clean repo
├── js/
│   ├── app.js                  # Application initialization & coordination
│   ├── webcam-manager.js       # Camera enumeration and stream management
│   ├── ui-controller.js        # User interface interactions & state
│   ├── crosshair-controller.js # Advanced crosshair system with drag
│   ├── overlay-renderer.js     # Canvas-based rendering system
│   ├── zoom-controller.js      # Zoom and pan functionality
│   └── exposure-controller.js  # Camera settings & auto-exposure
└── README.md                   # Project documentation
```

## 🛠️ Architecture

**Modular JavaScript Design** with clean separation of concerns:

- **🎯 CrosshairController** - Advanced crosshair system with drag functionality
- **📹 WebcamManager** - Camera access, enumeration, and stream management
- **🎨 UIController** - Interface interactions, state management, event handling
- **🖼️ OverlayRenderer** - Canvas rendering system for all visual overlays
- **🔍 ZoomController** - Mouse wheel zoom and pan with constraints
- **☀️ ExposureController** - Intelligent auto-exposure and manual adjustments
- **🚀 App** - Application lifecycle, initialization, and component coordination

**Key Features:**

- Event-driven architecture with custom events
- Dependency injection for clean testing
- Professional error handling and user feedback
- Responsive design with mobile support

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve the application.

---

**Need help?** Check the Debug Info panel in the application for detailed troubleshooting information.
