document.getElementById("pip-btn").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
            let video = document.querySelector("video");
            if (!video) {
                alert("No video found!");
                return;
            }

            // Create a floating, resizable video container
            let floatingContainer = document.createElement("div");
            floatingContainer.style.position = "fixed";
            floatingContainer.style.bottom = "10px";
            floatingContainer.style.right = "10px";
            floatingContainer.style.width = "400px";
            floatingContainer.style.height = "300px";
            floatingContainer.style.border = "2px solid #007bff";
            floatingContainer.style.background = "black";
            floatingContainer.style.zIndex = "999999";
            floatingContainer.style.cursor = "move";
            floatingContainer.style.resize = "both";
            floatingContainer.style.overflow = "hidden";
            floatingContainer.style.borderRadius = "8px";
            document.body.appendChild(floatingContainer);

            // Clone the video and insert it into the floating window
            let floatingVideo = video.cloneNode(true);
            floatingVideo.style.width = "100%";
            floatingVideo.style.height = "100%";
            floatingVideo.controls = true;
            floatingContainer.appendChild(floatingVideo);

            // Dragging functionality
            let isDragging = false, startX, startY;

            floatingContainer.addEventListener("mousedown", (e) => {
                if (e.target === floatingVideo) return;  // Ignore clicks on the video
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

            // Add a button to send to PiP mode
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
                    await video.requestPictureInPicture();
                    floatingContainer.remove(); // Remove floating window after PiP activation
                } catch (error) {
                    alert("PiP mode failed: " + error);
                }
            });
        }
    });
});
