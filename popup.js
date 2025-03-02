document.getElementById("pip-btn").addEventListener("click", async () => {
    chrome.scripting.executeScript({
        target: {tabId: (await chrome.tabs.query({active: true, currentWindow: true}))[0].id},
        function: () => {
            const video = document.querySelector("video");
            if (video) {
                video.requestPictureInPicture();
            } else {
                alert("No video found!");
            }
        }
    });
});
