// Default configuration
const DEFAULT_CONFIG = {
    CROP_RATIO: 1/3,
    CONTAINER_WIDTH: 300,
    CONTAINER_HEIGHT: 500,
    CONTAINER_BORDER: '2px solid #007bff',
    BUTTON_COLOR: '#007bff'
};

// Options management
const OptionsManager = {
    async loadOptions() {
        try {
            const result = await chrome.storage.sync.get(DEFAULT_CONFIG);
            return result;
        } catch (error) {
            console.error('Failed to load options:', error);
            return DEFAULT_CONFIG;
        }
    },
    
    async saveOptions(options) {
        try {
            await chrome.storage.sync.set(options);
            return true;
        } catch (error) {
            console.error('Failed to save options:', error);
            return false;
        }
    },
    
    async resetOptions() {
        try {
            await chrome.storage.sync.clear();
            return DEFAULT_CONFIG;
        } catch (error) {
            console.error('Failed to reset options:', error);
            return DEFAULT_CONFIG;
        }
    }
};

// UI Management
const UI = {
    elements: {},
    
    init() {
        this.bindElements();
        this.loadCurrentOptions();
        this.bindEvents();
    },
    
    bindElements() {
        this.elements = {
            cropRatio: document.getElementById('crop-ratio'),
            containerWidth: document.getElementById('container-width'),
            containerHeight: document.getElementById('container-height'),
            buttonColor: document.getElementById('button-color'),
            saveBtn: document.getElementById('save-options'),
            resetBtn: document.getElementById('reset-options'),
            status: document.getElementById('status')
        };
    },
    
    async loadCurrentOptions() {
        const options = await OptionsManager.loadOptions();
        this.elements.cropRatio.value = options.CROP_RATIO;
        this.elements.containerWidth.value = options.CONTAINER_WIDTH;
        this.elements.containerHeight.value = options.CONTAINER_HEIGHT;
        this.elements.buttonColor.value = options.BUTTON_COLOR;
    },
    
    bindEvents() {
        this.elements.saveBtn.addEventListener('click', () => this.saveOptions());
        this.elements.resetBtn.addEventListener('click', () => this.resetOptions());
        
        // Add real-time validation
        this.elements.cropRatio.addEventListener('input', () => this.validateCropRatio());
        this.elements.containerWidth.addEventListener('input', () => this.validateDimensions());
        this.elements.containerHeight.addEventListener('input', () => this.validateDimensions());
    },
    
    validateCropRatio() {
        const value = parseFloat(this.elements.cropRatio.value);
        if (value < 0.1 || value > 1.0) {
            this.elements.cropRatio.setCustomValidity('Crop ratio must be between 0.1 and 1.0');
        } else {
            this.elements.cropRatio.setCustomValidity('');
        }
    },
    
    validateDimensions() {
        const width = parseInt(this.elements.containerWidth.value);
        const height = parseInt(this.elements.containerHeight.value);
        
        if (width < 200 || width > 800) {
            this.elements.containerWidth.setCustomValidity('Width must be between 200 and 800 pixels');
        } else {
            this.elements.containerWidth.setCustomValidity('');
        }
        
        if (height < 300 || height > 1000) {
            this.elements.containerHeight.setCustomValidity('Height must be between 300 and 1000 pixels');
        } else {
            this.elements.containerHeight.setCustomValidity('');
        }
    },
    
    async saveOptions() {
        this.validateCropRatio();
        this.validateDimensions();
        
        if (!this.elements.cropRatio.checkValidity() || 
            !this.elements.containerWidth.checkValidity() || 
            !this.elements.containerHeight.checkValidity()) {
            this.showStatus('Please fix validation errors before saving', 'error');
            return;
        }
        
        const options = {
            CROP_RATIO: parseFloat(this.elements.cropRatio.value),
            CONTAINER_WIDTH: parseInt(this.elements.containerWidth.value),
            CONTAINER_HEIGHT: parseInt(this.elements.containerHeight.value),
            BUTTON_COLOR: this.elements.buttonColor.value,
            CONTAINER_BORDER: `2px solid ${this.elements.buttonColor.value}`
        };
        
        const success = await OptionsManager.saveOptions(options);
        if (success) {
            this.showStatus('Options saved successfully!', 'success');
        } else {
            this.showStatus('Failed to save options', 'error');
        }
    },
    
    async resetOptions() {
        const options = await OptionsManager.resetOptions();
        this.elements.cropRatio.value = options.CROP_RATIO;
        this.elements.containerWidth.value = options.CONTAINER_WIDTH;
        this.elements.containerHeight.value = options.CONTAINER_HEIGHT;
        this.elements.buttonColor.value = options.BUTTON_COLOR;
        this.showStatus('Options reset to defaults', 'success');
    },
    
    showStatus(message, type = 'info') {
        this.elements.status.textContent = message;
        this.elements.status.className = `status-${type}`;
        this.elements.status.style.display = 'block';
        
        setTimeout(() => {
            this.elements.status.style.display = 'none';
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
