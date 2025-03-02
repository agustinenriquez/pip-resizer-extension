document.getElementById("pip-btn").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject our script into the current tab
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
            // 1. Locate the original <video> on the page
            let video = document.querySelector("video");
            if (!video) {
                // alert("No video found!");
                console.log("No video found!");
                return;
            }

            // 2. Ensure the video has metadata so we know dimensions
            //    (In some cases you might need a more robust wait)
            if (video.readyState < 1) {
                video.addEventListener("loadedmetadata", () => setupCustomCrop(video));
            } else {
                setupCustomCrop(video);
            }

            function setupCustomCrop(originalVideo) {
                // ----- A) Create a hidden <canvas> that draws only the middle slice -----
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                // We'll continuously draw the MIDDLE vertical slice of the original video.
                // For simplicity, let’s define:
                //   - The slice is 1/3 of the video’s width, centered horizontally.
                //   - The slice is the full height.
                const w = originalVideo.videoWidth;
                const h = originalVideo.videoHeight;
                const sliceWidth = w / 3;   // one-third of original width
                const sliceX = (w - sliceWidth) / 2; // center it
                canvas.width = sliceWidth;
                canvas.height = h;

                function drawFrame() {
                    ctx.drawImage(
                        originalVideo,
                        sliceX, 0,          // source X,Y (start in the middle)
                        sliceWidth, h,      // source width, height
                        0, 0,               // destination X,Y in canvas
                        sliceWidth, h       // destination width, height
                    );
                    requestAnimationFrame(drawFrame);
                }
                drawFrame(); // start continuous drawing

                // ----- B) Create a new <video> that shows this canvas stream -----
                const stream = canvas.captureStream();
                const croppedVideo = document.createElement("video");
                croppedVideo.srcObject = stream;
                croppedVideo.muted = true;    // avoid double-audio
                croppedVideo.play().catch(err => console.error("croppedVideo play error:", err));

                // ----- C) Create the floating container for the cropped video -----
                let floatingContainer = document.createElement("div");
                floatingContainer.style.position = "fixed";
                floatingContainer.style.bottom = "10px";
                floatingContainer.style.right = "10px";
                floatingContainer.style.width = "300px";
                floatingContainer.style.height = "500px";
                floatingContainer.style.border = "2px solid #007bff";
                floatingContainer.style.background = "black";
                floatingContainer.style.zIndex = "999999";
                floatingContainer.style.cursor = "move";
                floatingContainer.style.resize = "both";
                floatingContainer.style.overflow = "hidden";
                floatingContainer.style.borderRadius = "8px";
                document.body.appendChild(floatingContainer);

                // Insert the "cropped" video into this floating container
                croppedVideo.style.width = "100%";
                croppedVideo.style.height = "100%";
                // objectFit = "fill" or "cover" depending on if you want to fill or preserve some ratio
                croppedVideo.style.objectFit = "fill";
                croppedVideo.controls = true;
                floatingContainer.appendChild(croppedVideo);

                // ----- D) Make the container draggable -----
                let isDragging = false, startX, startY;
                floatingContainer.addEventListener("mousedown", (e) => {
                    if (e.target === croppedVideo) return;  // let video controls work
                    isDragging = true;
                    startX = e.clientX - floatingContainer.offsetLeft;
                    startY = e.clientY - floatingContainer.offsetTop;
                    floatingContainer.style.cursor = "grabbing";
                });

                document.addEventListener("mousemove", (e) => {
                    if (!isDragging) return;
                    floatingContainer.style.left = e.clientX - startX + "px";
                    floatingContainer.style.top = e.clientY - startY + "px";
                });

                document.addEventListener("mouseup", () => {
                    isDragging = false;
                    floatingContainer.style.cursor = "move";
                });

                // ----- E) Add a button to enter real PiP with the *cropped* video -----
                let pipButton = document.createElement("button");
                pipButton.textContent = "Enter PiP";
                pipButton.style.position = "absolute";
                pipButton.style.top = "10px";
                pipButton.style.right = "10px";
                pipButton.style.padding = "6px";
                pipButton.style.background = "#007bff";
                pipButton.style.color = "white";
                pipButton.style.border = "none";
                pipButton.style.cursor = "pointer";
                pipButton.style.borderRadius = "4px";
                floatingContainer.appendChild(pipButton);

                pipButton.addEventListener("click", async () => {
                    try {
                        // We want the PiP to show the *cropped* video, so:
                        await croppedVideo.requestPictureInPicture();
                        // Remove floating window after PiP activation (optional)
                        floatingContainer.remove();
                    } catch (error) {
                        console.log("PiP mode failed: ", error);
                        // alert("PiP mode failed: " + error);
                    }
                });
            }
        }
    });
});
