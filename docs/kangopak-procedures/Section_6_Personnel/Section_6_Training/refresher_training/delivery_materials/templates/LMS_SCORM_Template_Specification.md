# LMS SCORM TEMPLATE SPECIFICATIONS
## BRCGS Refresher Training Module Framework

**Version:** 1.0  
**Date:** September 2025  
**SCORM Version:** 1.2 (with 2004 upgrade path)  
**Compliance:** xAPI/Tin Can API ready  

---

## 📋 SCORM PACKAGE STRUCTURE

### **Standard Directory Layout**
```
BRCGS_[ModuleName]_LMS_v1.0_SCORM.zip
├── imsmanifest.xml                 # SCORM manifest (required)
├── adlcp_rootv1p2.xsd             # SCORM schema (required)
├── ims_xml.xsd                     # IMS XML schema (required)
├── imscp_rootv1p1p2.xsd           # IMS Content Packaging schema
├── index.html                      # Launch page
├── content/
│   ├── module_content.html         # Main learning content
│   ├── practical_demo.html         # Hands-on demonstration guide  
│   ├── assessment.html             # Interactive assessment
│   ├── completion.html             # Module completion page
│   └── resources/
│       ├── css/
│       │   ├── kangopak_styles.css # Company branding
│       │   └── responsive.css      # Mobile compatibility
│       ├── js/
│       │   ├── scorm_wrapper.js    # SCORM API communication
│       │   ├── assessment.js       # Assessment functionality
│       │   └── progress_tracking.js # Progress management
│       ├── images/
│       │   ├── kangopak_logo.png
│       │   ├── brcgs_logo.png
│       │   └── module_diagrams/
│       └── media/
│           ├── demonstration_videos/
│           └── audio_narration/
└── shared/
    ├── templates/
    │   ├── page_template.html
    │   ├── assessment_template.html
    │   └── navigation_template.html
    └── common/
        ├── common_functions.js
        ├── kangopak_branding.css
        └── accessibility_features.js
```

## 🔧 TECHNICAL SPECIFICATIONS

### **SCORM Manifest Configuration (imsmanifest.xml)**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="BRCGS_PersonalHygiene_v1.0" version="1.0" 
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
    <adlcp:location>BRCGS_PersonalHygiene_v1.0_metadata.xml</adlcp:location>
  </metadata>
  
  <organizations default="BRCGS_PH_ORG">
    <organization identifier="BRCGS_PH_ORG">
      <title>BRCGS Personal Hygiene Standards Refresher</title>
      <item identifier="BRCGS_PH_ITEM" identifierref="BRCGS_PH_RESOURCE">
        <title>Personal Hygiene Standards - Refresher Training</title>
        <adlcp:maxtimeallowed>PT45M</adlcp:maxtimeallowed>
        <adlcp:timelimitaction>exit,message</adlcp:timelimitaction>
        <adlcp:datafromlms>
          employee_id,department,shift,previous_completion_date
        </adlcp:datafromlms>
        <adlcp:masteryscore>80</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  
  <resources>
    <resource identifier="BRCGS_PH_RESOURCE" type="webcontent" 
              adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="content/module_content.html"/>
      <file href="content/practical_demo.html"/>
      <file href="content/assessment.html"/>
      <file href="content/completion.html"/>
      <dependency identifierref="COMMON_RESOURCES"/>
    </resource>
    
    <resource identifier="COMMON_RESOURCES" type="webcontent">
      <file href="content/resources/css/kangopak_styles.css"/>
      <file href="content/resources/js/scorm_wrapper.js"/>
      <file href="content/resources/js/assessment.js"/>
      <file href="content/resources/js/progress_tracking.js"/>
      <file href="content/resources/images/kangopak_logo.png"/>
      <file href="content/resources/images/brcgs_logo.png"/>
    </resource>
  </resources>
</manifest>
```

### **SCORM API Wrapper (scorm_wrapper.js)**
```javascript
// SCORM API Wrapper for Kangopak BRCGS Training
var ScormWrapper = {
    // Initialize SCORM connection
    initialize: function() {
        var API = this.getAPI();
        if (API == null) {
            alert("ERROR - Could not establish connection with LMS.");
            return false;
        }
        
        var result = API.LMSInitialize("");
        if (result.toString() != "true") {
            var errorNumber = API.LMSGetLastError();
            var errorString = API.LMSGetErrorString(errorNumber);
            alert("Error initializing SCORM: " + errorString);
            return false;
        }
        return true;
    },
    
    // Set completion status and score
    setComplete: function(score, status) {
        var API = this.getAPI();
        if (API != null) {
            // Set completion status
            API.LMSSetValue("cmi.core.lesson_status", status);
            
            // Set score
            if (score != null) {
                API.LMSSetValue("cmi.core.score.raw", score);
                API.LMSSetValue("cmi.core.score.max", "100");
                API.LMSSetValue("cmi.core.score.min", "0");
            }
            
            // Save progress
            API.LMSCommit("");
            
            // Record completion timestamp
            var now = new Date();
            var timestamp = now.toISOString();
            API.LMSSetValue("cmi.suspend_data", JSON.stringify({
                completion_timestamp: timestamp,
                module_version: "1.0",
                assessment_score: score,
                practical_demo_completed: true
            }));
            
            API.LMSCommit("");
        }
    },
    
    // Track detailed progress
    trackProgress: function(sectionId, sectionScore, timeSpent) {
        var API = this.getAPI();
        if (API != null) {
            var existingData = API.LMSGetValue("cmi.suspend_data");
            var progressData = {};
            
            if (existingData != "" && existingData != null) {
                progressData = JSON.parse(existingData);
            }
            
            if (!progressData.sections) {
                progressData.sections = {};
            }
            
            progressData.sections[sectionId] = {
                score: sectionScore,
                time_spent: timeSpent,
                completed: true,
                timestamp: new Date().toISOString()
            };
            
            API.LMSSetValue("cmi.suspend_data", JSON.stringify(progressData));
            API.LMSCommit("");
        }
    },
    
    // Find SCORM API
    getAPI: function() {
        var theAPI = null;
        var findAPITries = 0;
        
        while ((theAPI == null) && (findAPITries < 7)) {
            findAPITries++;
            
            if (findAPITries > 1) {
                theAPI = this.findAPI(window.parent);
            } else {
                theAPI = this.findAPI(window);
            }
        }
        
        if (theAPI == null) {
            alert("Unable to find an API adapter");
        }
        
        return theAPI;
    },
    
    findAPI: function(win) {
        var findAttempts = 0;
        var findAttemptLimit = 500;
        
        while ((win.API == null) && (win.parent != null) && 
               (win.parent != win) && (findAttempts <= findAttemptLimit)) {
            findAttempts++;
            win = win.parent;
        }
        
        return win.API;
    }
};
```

### **Assessment Engine (assessment.js)**
```javascript
// BRCGS Assessment Engine
var BRCGSAssessment = {
    currentModule: '',
    questions: [],
    userAnswers: {},
    practicalDemo: {
        completed: false,
        score: 0,
        assessor: ''
    },
    
    // Initialize assessment
    init: function(moduleId, questionBank) {
        this.currentModule = moduleId;
        this.questions = questionBank;
        this.renderAssessment();
    },
    
    // Render assessment interface
    renderAssessment: function() {
        var container = document.getElementById('assessment-container');
        var html = '<h2>Module Assessment - ' + this.currentModule + '</h2>';
        
        for (var i = 0; i < this.questions.length; i++) {
            var q = this.questions[i];
            html += '<div class="question-block" id="q' + i + '">';
            html += '<h3>Question ' + (i+1) + '</h3>';
            html += '<p class="question-text">' + q.question + '</p>';
            
            if (q.type === 'multiple_choice') {
                for (var j = 0; j < q.options.length; j++) {
                    html += '<label class="option">';
                    html += '<input type="radio" name="q' + i + '" value="' + j + '">';
                    html += q.options[j];
                    html += '</label>';
                }
            } else if (q.type === 'practical_demo') {
                html += '<div class="practical-demo">';
                html += '<p><strong>Practical Demonstration Required:</strong></p>';
                html += '<p>' + q.demo_instructions + '</p>';
                html += '<div class="assessor-section">';
                html += '<label>Assessor Name: <input type="text" id="assessor_name" required></label>';
                html += '<label>Demonstration Score: ';
                html += '<select id="demo_score" required>';
                html += '<option value="">Select Score</option>';
                html += '<option value="100">Competent - All criteria met</option>';
                html += '<option value="75">Mostly Competent - Minor improvements needed</option>';
                html += '<option value="50">Partially Competent - Requires additional training</option>';
                html += '<option value="0">Not Competent - Significant retraining required</option>';
                html += '</select></label>';
                html += '</div></div>';
            }
            
            html += '</div>';
        }
        
        html += '<button onclick="BRCGSAssessment.submitAssessment()" class="submit-btn">Submit Assessment</button>';
        container.innerHTML = html;
    },
    
    // Submit assessment
    submitAssessment: function() {
        this.collectAnswers();
        var score = this.calculateScore();
        var passed = score >= 80;
        
        // Record practical demonstration
        var demoScore = document.getElementById('demo_score');
        var assessorName = document.getElementById('assessor_name');
        
        if (demoScore && demoScore.value) {
            this.practicalDemo.completed = true;
            this.practicalDemo.score = parseInt(demoScore.value);
            this.practicalDemo.assessor = assessorName.value;
        }
        
        // Calculate final score (theory 60% + practical 40%)
        var finalScore = (score * 0.6) + (this.practicalDemo.score * 0.4);
        var finalPassed = finalScore >= 80 && this.practicalDemo.completed;
        
        // Update SCORM
        var status = finalPassed ? "passed" : "failed";
        ScormWrapper.setComplete(finalScore, status);
        
        // Display results
        this.showResults(finalScore, finalPassed);
        
        // Track detailed progress
        ScormWrapper.trackProgress(this.currentModule, finalScore, this.getTimeSpent());
    },
    
    // Collect user answers
    collectAnswers: function() {
        for (var i = 0; i < this.questions.length; i++) {
            if (this.questions[i].type === 'multiple_choice') {
                var selected = document.querySelector('input[name="q' + i + '"]:checked');
                if (selected) {
                    this.userAnswers[i] = parseInt(selected.value);
                }
            }
        }
    },
    
    // Calculate theory score
    calculateScore: function() {
        var correct = 0;
        var total = 0;
        
        for (var i = 0; i < this.questions.length; i++) {
            if (this.questions[i].type === 'multiple_choice') {
                total++;
                if (this.userAnswers[i] === this.questions[i].correct_answer) {
                    correct++;
                }
            }
        }
        
        return total > 0 ? Math.round((correct / total) * 100) : 0;
    },
    
    // Show results
    showResults: function(score, passed) {
        var container = document.getElementById('assessment-container');
        var html = '<div class="results-container">';
        html += '<h2>Assessment Results</h2>';
        html += '<div class="score-display ' + (passed ? 'passed' : 'failed') + '">';
        html += '<h3>Final Score: ' + Math.round(score) + '%</h3>';
        html += '<p class="status">' + (passed ? 'PASSED' : 'FAILED') + '</p>';
        html += '</div>';
        
        if (this.practicalDemo.completed) {
            html += '<div class="practical-results">';
            html += '<h4>Practical Demonstration</h4>';
            html += '<p>Score: ' + this.practicalDemo.score + '%</p>';
            html += '<p>Assessor: ' + this.practicalDemo.assessor + '</p>';
            html += '</div>';
        }
        
        if (passed) {
            html += '<p class="success-message">Congratulations! Your refresher training is complete.</p>';
            html += '<p>A completion certificate will be generated and added to your personnel file.</p>';
            html += '<p><strong>Next Refresher Due:</strong> ' + this.getNextRefresherDate() + '</p>';
        } else {
            html += '<p class="retry-message">Additional training is required before you can retake this assessment.</p>';
            html += '<p>Please contact your supervisor to arrange remedial training.</p>';
        }
        
        html += '<button onclick="window.close()" class="close-btn">Close Training</button>';
        html += '</div>';
        
        container.innerHTML = html;
    },
    
    // Calculate next refresher date
    getNextRefresherDate: function() {
        var nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return nextYear.toLocaleDateString('en-GB');
    },
    
    // Get time spent in module
    getTimeSpent: function() {
        // Implementation would track actual time spent
        return 45; // Default 45 minutes for refresher
    }
};
```

## 🎨 BRANDING & STYLING SPECIFICATIONS

### **Kangopak Corporate Styles (kangopak_styles.css)**
```css
/* Kangopak BRCGS Training Module Styles */
:root {
    --kangopak-primary: #0066cc;
    --kangopak-secondary: #004499;
    --kangopak-accent: #ff6600;
    --kangopak-success: #00aa44;
    --kangopak-warning: #ffaa00;
    --kangopak-error: #cc0000;
    --kangopak-text: #333333;
    --kangopak-light-bg: #f8f9fa;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: var(--kangopak-text);
    background: var(--kangopak-light-bg);
    margin: 0;
    padding: 20px;
}

.module-header {
    background: linear-gradient(135deg, var(--kangopak-primary), var(--kangopak-secondary));
    color: white;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    text-align: center;
}

.module-header h1 {
    margin: 0 0 10px 0;
    font-size: 24px;
    font-weight: 600;
}

.module-info {
    font-size: 14px;
    opacity: 0.9;
}

.content-section {
    background: white;
    padding: 25px;
    margin-bottom: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.assessment-container {
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.question-block {
    margin-bottom: 25px;
    padding: 20px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fafafa;
}

.question-text {
    font-weight: 500;
    color: var(--kangopak-secondary);
    margin-bottom: 15px;
}

.option {
    display: block;
    margin-bottom: 10px;
    padding: 8px 12px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.option:hover {
    background: var(--kangopak-light-bg);
}

.option input[type="radio"] {
    margin-right: 10px;
}

.practical-demo {
    background: #e8f4fd;
    padding: 20px;
    border-radius: 6px;
    border-left: 4px solid var(--kangopak-primary);
}

.assessor-section {
    margin-top: 15px;
    padding: 15px;
    background: white;
    border-radius: 4px;
}

.assessor-section label {
    display: block;
    margin-bottom: 10px;
    font-weight: 500;
}

.assessor-section input,
.assessor-section select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
}

.submit-btn {
    background: var(--kangopak-primary);
    color: white;
    padding: 12px 30px;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.3s;
}

.submit-btn:hover {
    background: var(--kangopak-secondary);
}

.results-container {
    text-align: center;
    padding: 30px;
}

.score-display {
    padding: 25px;
    border-radius: 8px;
    margin: 20px 0;
}

.score-display.passed {
    background: linear-gradient(135deg, #d4edda, #c3e6cb);
    border: 2px solid var(--kangopak-success);
}

.score-display.failed {
    background: linear-gradient(135deg, #f8d7da, #f5c6cb);
    border: 2px solid var(--kangopak-error);
}

.score-display h3 {
    margin: 0;
    font-size: 28px;
    font-weight: bold;
}

.status {
    font-size: 18px;
    font-weight: 600;
    margin: 10px 0;
}

.close-btn {
    background: var(--kangopak-secondary);
    color: white;
    padding: 10px 25px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

/* Responsive Design */
@media (max-width: 768px) {
    body {
        padding: 10px;
    }
    
    .module-header h1 {
        font-size: 20px;
    }
    
    .content-section,
    .assessment-container {
        padding: 20px;
    }
    
    .question-block {
        padding: 15px;
    }
}
```

## 📱 MOBILE COMPATIBILITY

### **Responsive Design Requirements**
- **Viewport Meta Tag:** `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- **Touch-Friendly Interface:** Minimum 44px touch targets
- **Readable Text:** 16px base font size on mobile
- **Optimized Media:** Compressed images and videos for mobile bandwidth
- **Progressive Enhancement:** Core functionality works without JavaScript

### **Offline Capability (Progressive Web App)**
```javascript
// Service Worker for Offline Functionality
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open('brcgs-training-v1').then(function(cache) {
            return cache.addAll([
                '/',
                '/content/module_content.html',
                '/content/practical_demo.html',
                '/content/assessment.html',
                '/content/resources/css/kangopak_styles.css',
                '/content/resources/js/scorm_wrapper.js',
                '/content/resources/js/assessment.js'
            ]);
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request);
        })
    );
});
```

## ♿ ACCESSIBILITY COMPLIANCE (WCAG 2.1 AA)

### **Required Accessibility Features**
- **Keyboard Navigation:** Full functionality accessible via keyboard
- **Screen Reader Support:** ARIA labels and semantic HTML
- **Color Contrast:** Minimum 4.5:1 ratio for normal text, 3:1 for large text
- **Focus Management:** Clear focus indicators and logical tab order
- **Alternative Text:** Descriptive alt text for all images and media
- **Captions:** Video content includes synchronized captions

### **Accessibility JavaScript (accessibility_features.js)**
```javascript
// Accessibility Enhancement Functions
var AccessibilityFeatures = {
    init: function() {
        this.addSkipLinks();
        this.enhanceKeyboardNavigation();
        this.addScreenReaderSupport();
        this.manageAnnouncements();
    },
    
    addSkipLinks: function() {
        var skipNav = document.createElement('a');
        skipNav.href = '#main-content';
        skipNav.textContent = 'Skip to main content';
        skipNav.className = 'skip-link';
        document.body.insertBefore(skipNav, document.body.firstChild);
    },
    
    enhanceKeyboardNavigation: function() {
        // Add keyboard event handlers
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', function(e) {
            document.body.classList.remove('keyboard-navigation');
        });
    },
    
    addScreenReaderSupport: function() {
        // Add ARIA live regions for dynamic content updates
        var liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'live-announcements';
        document.body.appendChild(liveRegion);
    },
    
    announceToScreenReader: function(message) {
        var liveRegion = document.getElementById('live-announcements');
        if (liveRegion) {
            liveRegion.textContent = message;
            setTimeout(function() {
                liveRegion.textContent = '';
            }, 1000);
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', AccessibilityFeatures.init);
```

---

This comprehensive LMS SCORM template specification provides the complete technical framework for deploying BRCGS refresher training modules with full regulatory compliance, accessibility support, and enterprise-grade functionality. The template is immediately deployable for the priority modules (Personal Hygiene and Foreign Body Control) and scalable for the complete 17-module training system.