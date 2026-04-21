const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Add the styles just before </style>
const newStyles = `
        /* PREMIUM ANALYTICS REDESIGN */
        .analytics-wrapper {
            background: radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 40%),
                        radial-gradient(circle at 90% 80%, rgba(76, 29, 149, 0.08) 0%, transparent 40%);
            border-radius: 30px;
            padding: 20px;
            position: relative;
        }
        #analytics-section .section-title {
            text-transform: uppercase;
            letter-spacing: 2px;
            font-size: 28px;
            background: linear-gradient(90deg, #ffffff, #c4b5fd);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 30px;
        }
        .analytic-card {
            background: linear-gradient(145deg, rgba(20, 18, 30, 0.95) 0%, rgba(13, 11, 20, 0.95) 100%) !important;
            border: 1px solid rgba(139, 92, 246, 0.2) !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05) !important;
            border-radius: 20px !important;
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
            padding: 24px !important;
        }
        .analytic-card::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 2px;
            background: linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.8), transparent);
            opacity: 0;
            transition: opacity 0.4s ease;
        }
        .analytic-card:hover {
            transform: translateY(-6px) !important;
            border-color: rgba(167, 139, 250, 0.5) !important;
            box-shadow: 0 20px 50px rgba(139, 92, 246, 0.2), inset 0 0 20px rgba(139, 92, 246, 0.05) !important;
        }
        .analytic-card:hover::after { opacity: 1; }
        
        .analytic-card .card-label {
            color: #c4b5fd !important;
            font-weight: 600 !important;
            letter-spacing: 1.5px !important;
            font-size: 11px !important;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .analytic-card .card-value {
            font-size: 38px !important;
            font-weight: 800 !important;
            margin: 15px 0 10px 0 !important;
            background: linear-gradient(to bottom right, #ffffff, #e0e7ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 2px 20px rgba(139, 92, 246, 0.3) !important;
        }
        .analytic-card .card-subtext {
            color: #8b8d9b !important;
        }
        .analytic-card .btn-refresh-cell {
            color: #a78bfa !important;
            opacity: 0.6;
            transition: all 0.2s;
            background: rgba(139, 92, 246, 0.1) !important;
            padding: 6px !important;
            border-radius: 8px !important;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .analytic-card:hover .btn-refresh-cell {
            opacity: 1;
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.4);
            color: #ffffff !important;
        }
`;

if (!html.includes('PREMIUM ANALYTICS REDESIGN')) {
    html = html.replace('</style>', newStyles + '\n    </style>');
}

// Find the analytics section and replace 'class="card"' with 'class="card analytic-card"'
const startIdx = html.indexOf('id="analytics-section"');
const endIdx = html.indexOf('id="manager-section"');
let analyticsSection = html.substring(startIdx, endIdx);

if (!analyticsSection.includes('analytics-wrapper')) {
    analyticsSection = analyticsSection.replace(/<div class="metrics-grid">/, '<div class="analytics-wrapper">\n            <div class="metrics-grid">');
    analyticsSection = analyticsSection.replace(/class="card"/g, 'class="card analytic-card"');
    // We added an extra div, we need to close it. But `analyticsSection` substring ends right before `id="manager-section"`. Let's just find the closing tags of metrics-grid or find `drilldown`. Actually, just right before `<div id="drilldown"` is better.
    analyticsSection = analyticsSection.replace(/<\/div>\s*<div id="drilldown"/, '</div>\n            </div>\n            <div id="drilldown"');
}

html = html.substring(0, startIdx) + analyticsSection + html.substring(endIdx);

fs.writeFileSync('index.html', html);
console.log('Design patched');
