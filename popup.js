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

// UI state management
const UI = {
    button: null,
    statusDiv: null,
    
    init() {
        this.button = document.getElementById("pip-btn");
        this.createStatusDiv();
        this.button.addEventListener("click", this.handlePipClick.bind(this));
    },
    
    createStatusDiv() {
        this.statusDiv = document.createElement('div');
        this.statusDiv.id = 'status-message';
        this.statusDiv.style.cssText = `
            margin-top: 10px;
            padding: 8px;
            border-radius: 4px;
            font-size: 12px;
            display: none;
        `;
        document.body.appendChild(this.statusDiv);
    },
    
    showStatus(message, type = 'info') {
        this.statusDiv.textContent = message;
        this.statusDiv.className = `status-${type}`;
        this.statusDiv.style.display = 'block';
        
        if (type === 'success' || type === 'info') {
            setTimeout(() => this.hideStatus(), 3000);
        }
    },
    
    hideStatus() {
        this.statusDiv.style.display = 'none';
    },
    
    setLoading(isLoading) {
        this.button.disabled = isLoading;
        this.button.textContent = isLoading ? 'Processing...' : 'Activate PiP';
    },
    
    async handlePipClick() {
        try {
            this.setLoading(true);
            this.hideStatus();
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('No active tab found');
            }
            
            this.showStatus('Looking for video...', 'info');
            
            const config = await loadConfig();
            
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: createVideoProcessor,
                args: [config]
            });
            
            this.showStatus('Video processor activated!', 'success');
        } catch (error) {
            console.error('PiP activation failed:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
        } finally {
            this.setLoading(false);
        }
    }
};

// Main video processing function (injected into page)
function createVideoProcessor(config) {
    try {
        // 1. Locate the original <video> on the page
        const video = document.querySelector("video");
        if (!video) {
            throw new Error('No video found on this page');
        }

        // 2. Ensure the video has metadata so we know dimensions
        if (video.readyState < 1) {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Video metadata loading timed out'));
                }, 5000);
                
                video.addEventListener("loadedmetadata", () => {
                    clearTimeout(timeout);
                    resolve(setupCustomCrop(video, config));
                });
            });
        } else {
            return setupCustomCrop(video, config);
        }
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
                ctx.drawImage(
                    originalVideo,
                    sliceX, 0,          // source X,Y (start in the middle)
                    sliceWidth, h,      // source width, height
                    0, 0,               // destination X,Y in canvas
                    sliceWidth, h       // destination width, height
                );
            } catch (error) {
                console.error('Canvas drawing error:', error);
                isDrawing = false;
                return;
            }
            
            if (isDrawing) {
                animationId = requestAnimationFrame(drawFrame);
            }
        }
        
        drawFrame(); // start continuous drawing

        // ----- B) Create a new <video> that shows this canvas stream -----
        const stream = canvas.captureStream();
        const croppedVideo = document.createElement("video");
        croppedVideo.srcObject = stream;
        croppedVideo.muted = true;    // avoid double-audio
        
        // Better error handling for video play
        croppedVideo.play().catch(err => {
            console.error("Cropped video play error:", err);
            throw new Error('Failed to play cropped video');
        });

        // ----- C) Create the floating container for the cropped video -----
        const floatingContainer = document.createElement("div");
        floatingContainer.id = 'pip-resizer-container';
        floatingContainer.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: ${config.CONTAINER_WIDTH}px;
            height: ${config.CONTAINER_HEIGHT}px;
            border: ${config.CONTAINER_BORDER};
            background: black;
            z-index: ${config.Z_INDEX};
            cursor: move;
            resize: both;
            overflow: hidden;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        // Remove existing container if present
        const existingContainer = document.getElementById('pip-resizer-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        document.body.appendChild(floatingContainer);

        // Create a drag handle bar
        const dragHandle = document.createElement("div");
        dragHandle.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: linear-gradient(135deg, rgba(0,123,255,0.9) 0%, rgba(108,117,125,0.9) 100%);
            cursor: move;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: 500;
            backdrop-filter: blur(10px);
        `;
        dragHandle.innerHTML = '⋮⋮ Drag to move ⋮⋮';
        floatingContainer.appendChild(dragHandle);

        // Insert the "cropped" video into this floating container
        croppedVideo.style.cssText = `
            width: 100%;
            height: calc(100% - 40px);
            margin-top: 40px;
            object-fit: fill;
        `;
        croppedVideo.controls = true;
        floatingContainer.appendChild(croppedVideo);

        // ----- D) Make the container draggable -----
        let isDragging = false, startX, startY;
        
        const handleMouseDown = (e) => {
            // Don't drag if clicking on interactive elements
            if (e.target.tagName === 'BUTTON' || 
                e.target.tagName === 'VIDEO' || 
                e.target.closest('button') ||
                e.target.closest('video')) {
                return;
            }
            
            isDragging = true;
            startX = e.clientX - floatingContainer.offsetLeft;
            startY = e.clientY - floatingContainer.offsetTop;
            dragHandle.style.cursor = "grabbing";
            floatingContainer.style.cursor = "grabbing";
            e.preventDefault();
        };
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const newLeft = Math.max(0, Math.min(window.innerWidth - floatingContainer.offsetWidth, e.clientX - startX));
            const newTop = Math.max(0, Math.min(window.innerHeight - floatingContainer.offsetHeight, e.clientY - startY));
            floatingContainer.style.left = newLeft + "px";
            floatingContainer.style.top = newTop + "px";
        };
        
        const handleMouseUp = () => {
            isDragging = false;
            dragHandle.style.cursor = "move";
            floatingContainer.style.cursor = "move";
        };
        
        floatingContainer.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        // ----- E) Add controls container -----
        const controlsContainer = document.createElement("div");
        controlsContainer.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            display: flex;
            gap: 5px;
            z-index: 11;
        `;
        
        // Enter PiP button
        const pipButton = document.createElement("button");
        pipButton.textContent = "Enter PiP";
        pipButton.style.cssText = `
            padding: 6px 10px;
            background: ${config.BUTTON_COLOR};
            color: white;
            border: none;
            cursor: pointer;
            border-radius: 4px;
            font-size: 12px;
        `;
        
        // Close button
        const closeButton = document.createElement("button");
        closeButton.textContent = "×";
        closeButton.style.cssText = `
            padding: 6px 8px;
            background: #dc3545;
            color: white;
            border: none;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
        `;
        
        controlsContainer.appendChild(pipButton);
        controlsContainer.appendChild(closeButton);
        floatingContainer.appendChild(controlsContainer);
        
        // Cleanup function
        const cleanup = () => {
            isDrawing = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            floatingContainer.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            if (floatingContainer.parentNode) {
                floatingContainer.remove();
            }
        };
        
        pipButton.addEventListener("click", async () => {
            try {
                pipButton.disabled = true;
                pipButton.textContent = "Loading...";
                
                await croppedVideo.requestPictureInPicture();
                cleanup();
            } catch (error) {
                console.error("PiP mode failed:", error);
                pipButton.textContent = "PiP Failed";
                setTimeout(() => {
                    pipButton.disabled = false;
                    pipButton.textContent = "Enter PiP";
                }, 2000);
            }
        });
        
        closeButton.addEventListener("click", cleanup);
        
        // Auto-cleanup on video end or error
        croppedVideo.addEventListener('ended', cleanup);
        croppedVideo.addEventListener('error', cleanup);
        
        return { cleanup };
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UI.init());
} else {
    UI.init();
}