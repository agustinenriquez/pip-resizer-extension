# PiP Resizer Extension

A powerful Chrome extension that converts wide videos into customizable vertical crop windows with advanced pan and zoom controls. Perfect for streaming sites, video platforms, and any content where you want to focus on a specific portion of the video in a separate, moveable window.

## ✨ Features

### 🎬 **Video Cropping & Window Management**
- **Automatic video detection** - Finds and processes videos on any website
- **Separate popup window** - Creates an independent, resizable window with cropped video
- **Real-time streaming** - Live video feed with synchronized playback
- **Auto-cleanup** - Closes popup when original tab/window is closed

### 🎛️ **Advanced Controls**
- **Pan Controls** - Move left/right to choose which part of the video to show
- **Zoom Controls** - Adjust crop width from 10% to 100% of original video
- **Hide/Show UI** - Toggle all controls for distraction-free viewing (hidden by default)
- **Dual control methods** - Both visual sliders and quick-action buttons

### ⌨️ **Keyboard Shortcuts**
- **Ctrl+Q** (Cmd+Q on Mac) - Instantly activate PiP resizer from any tab
- **H** - Toggle controls visibility in popup window
- **Arrow Keys** - Pan left/right (←→) and zoom in/out (↑↓)
- **+/-** - Quick zoom adjustments
- **0** - Reset to default crop ratio
- **1** - Full width view
- **Space** - Center the crop area

### 🎯 **Smart Features**
- **720p Quality** - Automatically attempts to set video quality to 720p
- **Site-specific optimization** - Enhanced support for popular streaming platforms
- **Hidden original video** - Makes source video nearly invisible (1x1 pixel)
- **Memory leak prevention** - Proper cleanup and resource management
- **Error handling** - Graceful failure with user feedback

### 🎨 **User Interface**
- **Clean, modern design** - Transparent controls with blur effects
- **Intuitive controls** - Clearly labeled sliders and buttons
- **Visual feedback** - Hover effects and status indicators
- **Responsive layout** - Adapts to different window sizes

## 🚀 Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your toolbar

## 📖 Usage

### Quick Start
1. **Navigate to any video page** (YouTube, Twitch, streaming sites, etc.)
2. **Press Ctrl+Q** or click the extension icon
3. **A new window opens** with your cropped video
4. **Adjust as needed** using the controls (press H to show them)

### Controls Overview

#### **Pan Controls** (Horizontal Position)
- **Slider**: Drag to move crop area left/right
- **Arrow Buttons** (◀ ▶): Move in 10% increments  
- **Center Button** (⌖): Jump to center position
- **Keyboard**: Arrow left/right keys for fine control

#### **Zoom Controls** (Crop Width)
- **Slider**: Drag to adjust crop width (10%-100%)
- **Plus/Minus Buttons**: Increase/decrease width
- **Reset Button** (⌂): Return to default 1/3 width
- **Keyboard**: Arrow up/down keys, +/- keys

#### **Visibility Controls**
- **Eye Button** (👁️): Toggle all controls on/off
- **Default**: Controls start hidden for clean viewing
- **Keyboard**: Press H to toggle

### Example Workflows

**Streaming Sites**: Crop to focus on a specific area of the stream
```
1. Go to streaming site
2. Press Ctrl+Q
3. Use pan controls to frame the area you want
4. Adjust zoom to get the perfect crop width
5. Hide controls (H) for clean viewing
```

**YouTube Videos**: Create a vertical slice for multitasking
```
1. Open YouTube video
2. Press Ctrl+Q  
3. Use zoom controls to make it narrower
4. Pan to interesting part of the video
5. Click "Enter PiP" for native picture-in-picture
```

## ⚙️ Settings

Access the options page by:
- Right-clicking the extension icon → "Options"
- Or clicking the ⚙️ button in the popup (when visible)

**Configurable Settings:**
- Default crop ratio (how much of video width to show)
- Default window dimensions
- Button colors and theme
- Initial position preferences

## 🔧 Technical Details

### Supported Sites
- **Universal compatibility** - Works on any site with HTML5 video
- **Enhanced support** for popular platforms:
  - YouTube
  - Twitch  
  - Chaturbate
  - Most streaming sites

### Quality Management
- Automatically attempts to set video quality to 720p
- Site-specific quality detection and selection
- Fallback handling for sites without quality controls

### Performance
- **Efficient rendering** - 30 FPS canvas streaming
- **Memory management** - Automatic cleanup of resources
- **Error resilience** - Graceful handling of edge cases
- **Browser integration** - Uses native APIs for optimal performance

## 🎯 Keyboard Reference

### Global Shortcuts
| Key | Action |
|-----|--------|
| `Ctrl+Q` | Activate PiP Resizer |

### In Popup Window
| Key | Action |
|-----|--------|
| `H` | Toggle controls visibility |
| `←` `→` | Pan left/right (5% steps) |
| `↑` `↓` | Zoom in/out (5% steps) |
| `+` `-` | Quick zoom (10% steps) |
| `Space` | Center crop area |
| `Home` `End` | Jump to far left/right |
| `0` | Reset to default crop |
| `1` | Full width view |

## 🛠️ Development

### File Structure
```
├── manifest.json          # Extension configuration
├── background.js          # Main extension logic
├── popup.html/js          # Extension popup (legacy)
├── options.html/js        # Settings page
├── styles.css            # Shared styles
└── icons/                # Extension icons
```

### Key Components
- **Video Detection**: Automatically finds and analyzes video elements
- **Canvas Streaming**: Real-time video cropping using HTML5 canvas
- **Window Management**: Creates and manages popup windows
- **Quality Control**: Site-specific video quality optimization
- **User Interface**: Modern, responsive control system

## 🐛 Troubleshooting

**Video not found**: Make sure the video is playing and fully loaded
**Controls not working**: Try refreshing the page and re-activating
**Poor quality**: Extension attempts 720p but depends on site availability
**Window not opening**: Check if popups are blocked for the site

## 📄 Changelog

### Version 1.1
- ✨ Added pan and zoom controls
- ✨ Keyboard shortcut support (Ctrl+Q)
- ✨ Hide/show controls toggle
- ✨ Automatic 720p quality selection
- ✨ Separate popup window instead of overlay
- ✨ Enhanced error handling and user feedback
- ✨ Memory leak fixes and performance improvements
- 🎨 Modern UI with transparent controls
- 🎨 Hidden controls by default

### Version 1.0
- 🎬 Basic video cropping functionality
- 🎬 Picture-in-Picture integration
- 🎬 Floating video overlay

## 🤝 Contributing

We welcome contributions! Feel free to:
- Open issues for bugs or feature requests
- Submit pull requests with improvements
- Share feedback and suggestions
- Help test on different sites and browsers

### Development Setup
1. Clone the repository
2. Make your changes
3. Test in Chrome developer mode
4. Submit a pull request

## 📜 License

This project is open source. See LICENSE file for details.

## 🙏 Acknowledgments

Thanks to all contributors and users who help improve this extension!