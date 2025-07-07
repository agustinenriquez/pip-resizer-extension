chrome.runtime.onInstalled.addListener(() => {
    console.log("Custom PiP Resizer extension installed!");
});

console.log("Background script loaded!");

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
                console.log('Script injected successfully!');
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
                testDiv.textContent = 'Extension activated! Looking for video...';
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
        
        console.log('Video processor activated!');
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

        // 2. Wait for video to be ready
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
        const sliceWidth = w * config.CROP_RATIO;
        const sliceX = (w - sliceWidth) / 2;
        canvas.width = sliceWidth;
        canvas.height = h;

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
        const windowFeatures = `
            width=${config.CONTAINER_WIDTH},
            height=${config.CONTAINER_HEIGHT},
            left=${screen.width - config.CONTAINER_WIDTH - 100},
            top=100,
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
                </style>
            </head>
            <body>
                <div class="video-container">
                    <video id="cropped-video" controls></video>
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
            
            // Set the video stream
            videoElement.srcObject = stream;
            videoElement.muted = true;
            videoElement.controls = true;
            videoElement.autoplay = true;
            
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
