chrome.runtime.onInstalled.addListener(() => {
    console.log("Custom PiP Resizer extension installed!");
});

console.log("Background script loaded!");

// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
    console.log('Command received:', command);
    
    if (command === 'activate-pip') {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab) {
            console.log('Activating PiP via keyboard shortcut');
            // Trigger the same function as clicking the extension icon
            activatePiP(tab);
        }
    }
});

// Shared function for PiP activation
async function activatePiP(tab) {
    try {
        if (!tab) {
            console.error('No active tab found');
            return;
        }
        
        console.log('Tab info:', tab.url, tab.id);
        
        const config = await loadConfig();
        console.log('Config loaded:', config);
        
        // First inject a simple test to see if injection works
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                console.log('Script injected successfully via keyboard shortcut!');
                const testDiv = document.createElement('div');
                testDiv.id = 'pip-test-message';
                testDiv.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    background: #28a745;
                    color: white;
                    padding: 10px;
                    border-radius: 5px;
                    z-index: 999999;
                    font-family: Arial, sans-serif;
                `;
                testDiv.textContent = 'PiP activated via keyboard! (Ctrl+Q)';
                document.body.appendChild(testDiv);
                
                setTimeout(() => {
                    if (testDiv.parentNode) testDiv.remove();
                }, 3000);
            }
        });
        
        // Then inject the main processor
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: createVideoProcessor,
            args: [config]
        });
        
        console.log('Video processor activated via keyboard shortcut!');
    } catch (error) {
        console.error('PiP activation failed:', error);
        // Show user feedback via notification
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: showErrorMessage,
                args: [error.message]
            });
        } catch (e) {
            console.error('Could not show error message:', e);
        }
    }
}

// Default configuration
const DEFAULT_CONFIG = {
    CROP_RATIO: 1/3,
    CONTAINER_WIDTH: 300,
    CONTAINER_HEIGHT: 500,
    CONTAINER_BORDER: '2px solid #007bff',
    BUTTON_COLOR: '#007bff',
    Z_INDEX: 999999
};

// Load user configuration from storage
async function loadConfig() {
    try {
        const result = await chrome.storage.sync.get(DEFAULT_CONFIG);
        return {
            ...result,
            Z_INDEX: DEFAULT_CONFIG.Z_INDEX // Always use default z-index
        };
    } catch (error) {
        console.error('Failed to load config:', error);
        return DEFAULT_CONFIG;
    }
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
    console.log('Extension icon clicked!', tab);
    activatePiP(tab);
});

// Show error message to user
function showErrorMessage(message) {
    const existingError = document.getElementById('pip-error-message');
    if (existingError) existingError.remove();
    
    const errorDiv = document.createElement('div');
    errorDiv.id = 'pip-error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        z-index: 999999;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    errorDiv.textContent = `PiP Error: ${message}`;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
}

// Main video processing function (injected into page)
function createVideoProcessor(config) {
    try {
        // 1. Look for all videos and find the best one
        const videos = document.querySelectorAll("video");
        console.log(`Found ${videos.length} video elements`);
        
        if (videos.length === 0) {
            throw new Error('No video found on this page');
        }
        
        // Find the largest playing video
        let targetVideo = null;
        let maxArea = 0;
        
        videos.forEach((video, index) => {
            console.log(`Video ${index}:`, {
                src: video.src || 'blob/no src',
                width: video.videoWidth,
                height: video.videoHeight,
                readyState: video.readyState,
                paused: video.paused,
                currentTime: video.currentTime,
                offsetWidth: video.offsetWidth,
                offsetHeight: video.offsetHeight
            });
            
            const area = video.offsetWidth * video.offsetHeight;
            if (area > maxArea && (video.currentTime > 0 || !video.paused)) {
                maxArea = area;
                targetVideo = video;
            }
        });
        
        if (!targetVideo) {
            // If no playing video found, use the first one
            targetVideo = videos[0];
        }
        
        console.log('Selected video:', targetVideo);

        // 2. Set video quality to 720p if available
        function setVideoQuality(video) {
            try {
                // Check if video has quality settings (common in streaming sites)
                if (video.videoTracks && video.videoTracks.length > 0) {
                    console.log('Available video tracks:', video.videoTracks);
                }
                
                // Try to access video element's quality settings
                if (video.getVideoPlaybackQuality) {
                    const quality = video.getVideoPlaybackQuality();
                    console.log('Current video quality:', quality);
                }
                
                // For sites with custom quality selectors, try to find and set 720p
                const qualitySelectors = [
                    '.quality-selector',
                    '.video-quality',
                    '.resolution-selector',
                    '[data-quality]',
                    '.settings-menu'
                ];
                
                for (const selector of qualitySelectors) {
                    const qualityControl = document.querySelector(selector);
                    if (qualityControl) {
                        console.log('Found quality control:', qualityControl);
                        
                        // Look for 720p option
                        const options = qualityControl.querySelectorAll('option, button, [data-quality*="720"]');
                        for (const option of options) {
                            if (option.textContent.includes('720') || option.value.includes('720')) {
                                console.log('Setting quality to 720p');
                                option.click();
                                break;
                            }
                        }
                    }
                }
                
                // Try setting video attributes for quality
                video.setAttribute('preload', 'metadata');
                video.setAttribute('data-quality', '720p');
                
            } catch (error) {
                console.log('Could not set video quality:', error);
            }
        }
        
        // Apply quality settings
        setVideoQuality(targetVideo);
        
        // Site-specific quality handling
        function setSiteSpecificQuality() {
            const hostname = window.location.hostname.toLowerCase();
            
            try {
                // Chaturbate specific quality settings
                if (hostname.includes('chaturbate')) {
                    // Look for Chaturbate's quality controls
                    const qualityButtons = document.querySelectorAll('[data-quality], .quality-button, .resolution-button');
                    for (const button of qualityButtons) {
                        if (button.textContent.includes('720') || button.getAttribute('data-quality') === '720') {
                            console.log('Setting Chaturbate quality to 720p');
                            button.click();
                            break;
                        }
                    }
                }
                
                // YouTube specific
                else if (hostname.includes('youtube')) {
                    // YouTube quality selector
                    setTimeout(() => {
                        const settingsButton = document.querySelector('.ytp-settings-button');
                        if (settingsButton) {
                            settingsButton.click();
                            setTimeout(() => {
                                const qualityOption = document.querySelector('[role="menuitem"]:contains("Quality")');
                                if (qualityOption) qualityOption.click();
                                setTimeout(() => {
                                    const quality720 = document.querySelector('[role="menuitemradio"]:contains("720")');
                                    if (quality720) quality720.click();
                                }, 200);
                            }, 200);
                        }
                    }, 1000);
                }
                
                // Twitch specific
                else if (hostname.includes('twitch')) {
                    setTimeout(() => {
                        const settingsButton = document.querySelector('[data-a-target="player-settings-button"]');
                        if (settingsButton) {
                            settingsButton.click();
                            setTimeout(() => {
                                const qualityOption = document.querySelector('[data-a-target="player-settings-menu-item-quality"]');
                                if (qualityOption) qualityOption.click();
                                setTimeout(() => {
                                    const quality720 = document.querySelector('[data-a-target*="720"]');
                                    if (quality720) quality720.click();
                                }, 200);
                            }, 200);
                        }
                    }, 1000);
                }
                
                console.log(`Applied quality settings for ${hostname}`);
            } catch (error) {
                console.log('Site-specific quality setting failed:', error);
            }
        }
        
        // Apply site-specific quality after a short delay
        setTimeout(setSiteSpecificQuality, 2000);
        
        // 3. Wait for video to be ready
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Video metadata loading timed out after 10 seconds'));
            }, 10000);
            
            function checkVideo() {
                console.log('Checking video readiness:', {
                    readyState: targetVideo.readyState,
                    videoWidth: targetVideo.videoWidth,
                    videoHeight: targetVideo.videoHeight
                });
                
                if (targetVideo.readyState >= 1 && targetVideo.videoWidth > 0 && targetVideo.videoHeight > 0) {
                    clearTimeout(timeout);
                    resolve(setupCustomCrop(targetVideo, config));
                } else if (targetVideo.readyState >= 1) {
                    // Video is loaded but dimensions not available yet
                    setTimeout(checkVideo, 500);
                } else {
                    // Wait for metadata
                    targetVideo.addEventListener("loadedmetadata", checkVideo, { once: true });
                }
            }
            
            checkVideo();
        });
    } catch (error) {
        console.error('Video processor error:', error);
        throw error;
    }

    function setupCustomCrop(originalVideo, config) {
        // Validate video dimensions
        const w = originalVideo.videoWidth;
        const h = originalVideo.videoHeight;
        
        if (w <= 0 || h <= 0) {
            throw new Error('Invalid video dimensions');
        }
        
        // ----- A) Create a hidden <canvas> that draws only the middle slice -----
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
            throw new Error('Could not create canvas context');
        }

        // Calculate crop dimensions using config
        let cropRatio = config.CROP_RATIO;
        let sliceWidth = w * cropRatio;
        let sliceX = (w - sliceWidth) / 2; // Start at center
        let maxSliceX = w - sliceWidth; // Maximum X position
        canvas.width = sliceWidth;
        canvas.height = h;
        
        // Function to update crop position
        function updateCropPosition(newX) {
            sliceX = Math.max(0, Math.min(maxSliceX, newX));
        }
        
        // Function to update crop width
        function updateCropWidth(newRatio) {
            cropRatio = Math.max(0.1, Math.min(1.0, newRatio)); // Min 10%, Max 100%
            sliceWidth = w * cropRatio;
            maxSliceX = w - sliceWidth;
            
            // Adjust X position to keep crop in bounds
            sliceX = Math.max(0, Math.min(maxSliceX, sliceX));
            
            // Update canvas size
            canvas.width = sliceWidth;
        }

        let animationId;
        let isDrawing = true;
        
        function drawFrame() {
            if (!isDrawing) return;
            
            try {
                // Draw current frame regardless of pause state
                if (originalVideo && originalVideo.videoWidth > 0 && originalVideo.videoHeight > 0) {
                    // Clear canvas first
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.drawImage(
                        originalVideo,
                        sliceX, 0,          // source X,Y (start in the middle)
                        sliceWidth, h,      // source width, height
                        0, 0,               // destination X,Y in canvas
                        sliceWidth, h       // destination width, height
                    );
                }
            } catch (error) {
                console.error('Canvas drawing error:', error);
                // Don't stop drawing on error, just skip this frame
            }
            
            if (isDrawing) {
                requestAnimationFrame(drawFrame);
            }
        }
        
        drawFrame(); // start continuous drawing

        // ----- B) Create a new <video> that shows this canvas stream -----
        const stream = canvas.captureStream(30); // 30 FPS for smooth playback
        const croppedVideo = document.createElement("video");
        croppedVideo.srcObject = stream;
        croppedVideo.muted = true;    // avoid double-audio
        croppedVideo.loop = originalVideo.loop;
        
        // Keep the original video "active" to prevent throttling
        function keepVideoActive() {
            try {
                // Trick browser into thinking video is still visible
                if (originalVideo.paused && originalVideo.readyState >= 2) {
                    // Force play if it gets paused by tab switching
                    originalVideo.play().catch(() => {
                        // If play fails, try to keep it "warm" by seeking slightly
                        const currentTime = originalVideo.currentTime;
                        originalVideo.currentTime = currentTime + 0.001;
                    });
                }
                
                // Keep requesting frames even when tab is inactive
                if (originalVideo.videoWidth > 0) {
                    // This helps prevent the video element from going dormant
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = 1;
                    tempCanvas.height = 1;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(originalVideo, 0, 0, 1, 1);
                }
            } catch (error) {
                // Ignore errors, just keep trying
            }
        }
        
        // Run this every few seconds to keep video active
        const keepAliveInterval = setInterval(keepVideoActive, 2000);
        
        // Prevent video from being throttled by browser
        originalVideo.setAttribute('playsinline', 'true');
        originalVideo.setAttribute('webkit-playsinline', 'true');
        
        // Add visibility change listener to force resume
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab became hidden, try to keep video active
                setTimeout(() => {
                    if (originalVideo.paused) {
                        originalVideo.play().catch(console.error);
                    }
                }, 100);
            }
        });
        
        // Force video to stay "in viewport" by making it tiny but visible
        const originalStyle = originalVideo.style.cssText;
        originalVideo.style.cssText = originalStyle + '; position: fixed !important; top: -1px !important; left: -1px !important; width: 1px !important; height: 1px !important; opacity: 0.01 !important; z-index: -1 !important; pointer-events: none !important;';
        
        // Better error handling for video play
        croppedVideo.play().catch(err => {
            console.error("Cropped video play error:", err);
            // Don't throw error, just log it
        });

        // ----- C) Create a new popup window for the cropped video -----
        // Calculate window size to fit screen height with specified dimensions
        const windowWidth = 482;
        const windowHeight = Math.min(1050, screen.availHeight - 100); // Fit to screen height with padding
        const windowLeft = screen.width - windowWidth - 20; // Position on right side with margin
        const windowTop = Math.max(20, (screen.availHeight - windowHeight) / 2); // Center vertically or near top
        
        const windowFeatures = `
            width=${windowWidth},
            height=${windowHeight},
            left=${windowLeft},
            top=${windowTop},
            resizable=yes,
            scrollbars=no,
            menubar=no,
            toolbar=no,
            location=no,
            status=no,
            alwaysRaised=yes
        `.replace(/\s+/g, '');
        
        const newWindow = window.open('', 'PiPResizerWindow', windowFeatures);
        
        if (!newWindow) {
            throw new Error('Could not open popup window. Please allow popups for this site.');
        }
        
        // Set up the new window content
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>PiP Resizer</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: black;
                        font-family: Arial, sans-serif;
                        overflow: hidden;
                        position: relative;
                    }
                    
                    .video-container {
                        width: 100%;
                        height: 100vh;
                        position: relative;
                    }
                    
                    video {
                        width: 100%;
                        height: 100%;
                        object-fit: fill;
                    }
                    
                    .pip-button {
                        position: absolute;
                        bottom: 10px;
                        right: 10px;
                        background: rgba(40, 167, 69, 0.7);
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                        backdrop-filter: blur(5px);
                        transition: all 0.3s ease;
                        z-index: 10;
                    }
                    
                    .pip-button:hover {
                        background: rgba(30, 126, 52, 0.9);
                        transform: translateY(-1px);
                    }
                    
                    .pip-button:disabled {
                        background: rgba(108, 117, 125, 0.7);
                        cursor: not-allowed;
                        transform: none;
                    }
                    
                    .pan-controls {
                        position: absolute;
                        bottom: 10px;
                        left: 10px;
                        display: flex;
                        gap: 5px;
                        z-index: 10;
                    }
                    
                    .pan-button {
                        background: rgba(0, 123, 255, 0.7);
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                        backdrop-filter: blur(5px);
                        transition: all 0.3s ease;
                        min-width: 40px;
                    }
                    
                    .pan-button:hover {
                        background: rgba(0, 86, 179, 0.9);
                        transform: translateY(-1px);
                    }
                    
                    .pan-button:active {
                        transform: translateY(0);
                    }
                    
                    .pan-slider {
                        position: absolute;
                        bottom: 90px;
                        left: 10px;
                        right: 10px;
                        height: 30px;
                        background: rgba(0, 0, 0, 0.5);
                        border-radius: 15px;
                        display: flex;
                        align-items: center;
                        padding: 0 10px;
                        backdrop-filter: blur(5px);
                        z-index: 10;
                    }
                    
                    .zoom-slider {
                        position: absolute;
                        bottom: 50px;
                        left: 10px;
                        right: 10px;
                        height: 30px;
                        background: rgba(0, 0, 0, 0.5);
                        border-radius: 15px;
                        display: flex;
                        align-items: center;
                        padding: 0 10px;
                        backdrop-filter: blur(5px);
                        z-index: 10;
                    }
                    
                    .zoom-controls {
                        position: absolute;
                        top: 10px;
                        left: 10px;
                        display: flex;
                        gap: 5px;
                        z-index: 10;
                    }
                    
                    .zoom-button {
                        background: rgba(255, 152, 0, 0.7);
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                        backdrop-filter: blur(5px);
                        transition: all 0.3s ease;
                        min-width: 40px;
                    }
                    
                    .zoom-button:hover {
                        background: rgba(230, 137, 0, 0.9);
                        transform: translateY(-1px);
                    }
                    
                    .zoom-button:active {
                        transform: translateY(0);
                    }
                    
                    .control-label {
                        position: absolute;
                        left: 15px;
                        top: 50%;
                        transform: translateY(-50%);
                        color: white;
                        font-size: 10px;
                        font-weight: bold;
                        opacity: 0.8;
                        pointer-events: none;
                        min-width: 30px;
                    }
                    
                    .toggle-controls {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: rgba(128, 128, 128, 0.7);
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: bold;
                        backdrop-filter: blur(5px);
                        transition: all 0.3s ease;
                        z-index: 11;
                    }
                    
                    .toggle-controls:hover {
                        background: rgba(90, 90, 90, 0.9);
                        transform: translateY(-1px);
                    }
                    
                    .controls-hidden .pan-slider,
                    .controls-hidden .zoom-slider,
                    .controls-hidden .pan-controls,
                    .controls-hidden .zoom-controls {
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.3s ease;
                    }
                    
                    .controls-visible .pan-slider,
                    .controls-visible .zoom-slider,
                    .controls-visible .pan-controls,
                    .controls-visible .zoom-controls {
                        opacity: 1;
                        pointer-events: auto;
                        transition: opacity 0.3s ease;
                    }
                    
                    .slider {
                        width: 100%;
                        height: 4px;
                        border-radius: 2px;
                        background: rgba(255, 255, 255, 0.3);
                        outline: none;
                        -webkit-appearance: none;
                        appearance: none;
                    }
                    
                    .slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background: #007bff;
                        cursor: pointer;
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    }
                    
                    .slider::-moz-range-thumb {
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background: #007bff;
                        cursor: pointer;
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    }
                </style>
            </head>
            <body>
                <div class="video-container controls-hidden" id="video-container">
                    <video id="cropped-video" controls></video>
                    
                    <button id="toggle-controls" class="toggle-controls">👁️‍🗨️</button>
                    
                    <div class="zoom-controls">
                        <button id="zoom-out" class="zoom-button">-</button>
                        <button id="zoom-in" class="zoom-button">+</button>
                        <button id="zoom-reset" class="zoom-button">⌂</button>
                    </div>
                    
                    <div class="pan-slider">
                        <span class="control-label">PAN</span>
                        <input type="range" id="pan-slider" class="slider" min="0" max="100" value="50">
                    </div>
                    
                    <div class="zoom-slider">
                        <span class="control-label">ZOOM</span>
                        <input type="range" id="zoom-slider" class="slider" min="10" max="100" value="33">
                    </div>
                    
                    <div class="pan-controls">
                        <button id="pan-left" class="pan-button">◀</button>
                        <button id="pan-right" class="pan-button">▶</button>
                        <button id="pan-center" class="pan-button">⌖</button>
                    </div>
                    
                    <button id="pip-button" class="pip-button">Enter PiP</button>
                </div>
            </body>
            </html>
        `);
        
        newWindow.document.close();

        // Wait for the new window to load
        newWindow.addEventListener('load', () => {
            const videoElement = newWindow.document.getElementById('cropped-video');
            const pipButton = newWindow.document.getElementById('pip-button');
            const panSlider = newWindow.document.getElementById('pan-slider');
            const panLeftBtn = newWindow.document.getElementById('pan-left');
            const panRightBtn = newWindow.document.getElementById('pan-right');
            const panCenterBtn = newWindow.document.getElementById('pan-center');
            const zoomSlider = newWindow.document.getElementById('zoom-slider');
            const zoomInBtn = newWindow.document.getElementById('zoom-in');
            const zoomOutBtn = newWindow.document.getElementById('zoom-out');
            const zoomResetBtn = newWindow.document.getElementById('zoom-reset');
            const toggleBtn = newWindow.document.getElementById('toggle-controls');
            const videoContainer = newWindow.document.getElementById('video-container');
            
            // Set the video stream
            videoElement.srcObject = stream;
            videoElement.muted = true;
            videoElement.controls = true;
            videoElement.autoplay = true;
            
            // Initialize sliders with current values
            zoomSlider.value = cropRatio * 100;
            
            // Controls visibility state
            let controlsVisible = false;
            
            // Toggle controls visibility
            function toggleControls() {
                controlsVisible = !controlsVisible;
                
                if (controlsVisible) {
                    videoContainer.className = 'video-container controls-visible';
                    toggleBtn.textContent = '👁️';
                    toggleBtn.title = 'Hide controls';
                } else {
                    videoContainer.className = 'video-container controls-hidden';
                    toggleBtn.textContent = '👁️‍🗨️';
                    toggleBtn.title = 'Show controls';
                }
            }
            
            // Toggle button event
            toggleBtn.addEventListener('click', toggleControls);
            toggleBtn.title = 'Show controls';
            
            // Pan control functionality
            function updatePan(percentage) {
                const newX = (maxSliceX * percentage) / 100;
                updateCropPosition(newX);
                panSlider.value = percentage;
            }
            
            // Zoom control functionality
            function updateZoom(percentage) {
                const newRatio = percentage / 100;
                updateCropWidth(newRatio);
                zoomSlider.value = percentage;
                
                // Update pan slider max based on new crop width
                const currentPanPercent = parseFloat(panSlider.value);
                updatePan(currentPanPercent);
            }
            
            // Slider controls
            panSlider.addEventListener('input', (e) => {
                updatePan(parseFloat(e.target.value));
            });
            
            zoomSlider.addEventListener('input', (e) => {
                updateZoom(parseFloat(e.target.value));
            });
            
            // Pan button controls
            panLeftBtn.addEventListener('click', () => {
                const currentPercent = parseFloat(panSlider.value);
                const newPercent = Math.max(0, currentPercent - 10);
                updatePan(newPercent);
            });
            
            panRightBtn.addEventListener('click', () => {
                const currentPercent = parseFloat(panSlider.value);
                const newPercent = Math.min(100, currentPercent + 10);
                updatePan(newPercent);
            });
            
            panCenterBtn.addEventListener('click', () => {
                updatePan(50); // Center position
            });
            
            // Zoom button controls
            zoomInBtn.addEventListener('click', () => {
                const currentPercent = parseFloat(zoomSlider.value);
                const newPercent = Math.min(100, currentPercent + 10);
                updateZoom(newPercent);
            });
            
            zoomOutBtn.addEventListener('click', () => {
                const currentPercent = parseFloat(zoomSlider.value);
                const newPercent = Math.max(10, currentPercent - 10);
                updateZoom(newPercent);
            });
            
            zoomResetBtn.addEventListener('click', () => {
                updateZoom(33); // Reset to default 1/3 ratio
            });
            
            // Keyboard controls
            newWindow.document.addEventListener('keydown', (e) => {
                const currentPanPercent = parseFloat(panSlider.value);
                const currentZoomPercent = parseFloat(zoomSlider.value);
                
                switch(e.key) {
                    // Pan controls
                    case 'ArrowLeft':
                        e.preventDefault();
                        updatePan(Math.max(0, currentPanPercent - 5));
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        updatePan(Math.min(100, currentPanPercent + 5));
                        break;
                    case 'Home':
                        e.preventDefault();
                        updatePan(0); // Far left
                        break;
                    case 'End':
                        e.preventDefault();
                        updatePan(100); // Far right
                        break;
                    case ' ':
                        e.preventDefault();
                        updatePan(50); // Center pan
                        break;
                        
                    // Zoom controls
                    case 'ArrowUp':
                        e.preventDefault();
                        updateZoom(Math.min(100, currentZoomPercent + 5));
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        updateZoom(Math.max(10, currentZoomPercent - 5));
                        break;
                    case '+':
                    case '=':
                        e.preventDefault();
                        updateZoom(Math.min(100, currentZoomPercent + 10));
                        break;
                    case '-':
                        e.preventDefault();
                        updateZoom(Math.max(10, currentZoomPercent - 10));
                        break;
                    case '0':
                        e.preventDefault();
                        updateZoom(33); // Reset zoom
                        break;
                    case '1':
                        e.preventDefault();
                        updateZoom(100); // Full width
                        break;
                        
                    // Toggle controls
                    case 'h':
                    case 'H':
                        e.preventDefault();
                        toggleControls();
                        break;
                }
            });
            
            // Start video
            videoElement.play().catch(console.error);
            
            // Add PiP functionality to the button
            pipButton.addEventListener('click', async () => {
                try {
                    pipButton.disabled = true;
                    pipButton.textContent = 'Loading...';
                    
                    await videoElement.requestPictureInPicture();
                    newWindow.close();
                } catch (error) {
                    console.error('PiP mode failed:', error);
                    pipButton.textContent = 'PiP Failed';
                    setTimeout(() => {
                        pipButton.disabled = false;
                        pipButton.textContent = 'Enter PiP';
                    }, 2000);
                }
            });
            
            // Cleanup when popup window closes
            newWindow.addEventListener('beforeunload', () => {
                isDrawing = false;
                if (animationId) {
                    cancelAnimationFrame(animationId);
                }
                if (keepAliveInterval) {
                    clearInterval(keepAliveInterval);
                }
                // Restore original video style
                originalVideo.style.cssText = originalStyle;
            });
        });
        
        // Close popup window when original tab/window is closed or unloaded
        window.addEventListener('beforeunload', () => {
            if (newWindow && !newWindow.closed) {
                newWindow.close();
            }
        });
        
        // Also close popup if original page is navigated away
        window.addEventListener('pagehide', () => {
            if (newWindow && !newWindow.closed) {
                newWindow.close();
            }
        });
        
        // Periodically check if original window still exists
        const windowCheckInterval = setInterval(() => {
            try {
                // If we can't access document, the window is probably gone
                if (!document.body) {
                    if (newWindow && !newWindow.closed) {
                        newWindow.close();
                    }
                    clearInterval(windowCheckInterval);
                }
            } catch (error) {
                // If there's an error accessing document, close popup
                if (newWindow && !newWindow.closed) {
                    newWindow.close();
                }
                clearInterval(windowCheckInterval);
            }
        }, 2000);
        
        return { 
            cleanup: () => {
                isDrawing = false;
                if (animationId) {
                    cancelAnimationFrame(animationId);
                }
                if (keepAliveInterval) {
                    clearInterval(keepAliveInterval);
                }
                if (windowCheckInterval) {
                    clearInterval(windowCheckInterval);
                }
                if (newWindow && !newWindow.closed) {
                    newWindow.close();
                }
            }
        };
    }
}
