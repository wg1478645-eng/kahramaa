#!/bin/bash
# ACES Dashboard - Print Fix Patch Script
# Run this in the directory containing index.html

FILE="index.html"

if [ ! -f "$FILE" ]; then
    echo "❌ index.html not found in current directory"
    exit 1
fi

echo "📋 Creating backup..."
cp "$FILE" "${FILE}.backup_$(date +%Y%m%d_%H%M%S)"

echo "🔧 Applying fix 1: @media print CSS..."
python3 << 'EOF'
with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

old1 = """@media print{
  nav,.no-print{display:none!important}
  .screen{padding:0!important}
  body{background:#fff}
  .report-page{page-break-after:always}
}"""

new1 = """@media print{
  nav,.no-print{display:none!important}
  .screen{padding:0!important}
  body{background:#fff;margin:0;padding:0}
  .report-page{page-break-after:always}
  @page{size:A4 portrait;margin:10mm 12mm}
  #rpt-root{max-width:100%!important;padding:0 4mm!important}
}"""

if old1 in content:
    content = content.replace(old1, new1)
    print("  ✅ Fix 1 applied")
else:
    print("  ⚠️  Fix 1: block not found exactly, trying alternative...")

# Fix 2: _printReport CSS - fix dimensions
old2 = "body{font-family:Tajawal,sans-serif;background:#fff;color:#1a1a1a}#rpt-root{max-width:900px;margin:0 auto;padding:20px}@page{size:A4 portrait;margin:10mm 12mm}@media print{body,html{background:#fff!important}button,.no-print,input[type=file],label[title^=sig-upload]{display:none!important}.sig-print-img{display:block!important;max-height:52px!important;object-fit:contain!important}#rpt-root>div{break-inside:avoid;page-break-inside:avoid}body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}canvas{display:none!important}img[id$=-img]{display:block!important}[style*="background:#6b1c24"],[style*="background: #6b1c24"]{background-color:#6b1c24!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.rpt-footer-logos img{filter:brightness(0) invert(1)!important}}"

new2 = "body{font-family:Tajawal,sans-serif;background:#fff;color:#1a1a1a}#rpt-root{max-width:900px;margin:0 auto;padding:20px}@page{size:A4 portrait;margin:10mm 12mm}@media print{body,html{background:#fff!important;margin:0;padding:0}button,.no-print,input[type=file],label[title^=sig-upload]{display:none!important}.sig-print-img{display:block!important;max-height:52px!important;object-fit:contain!important}#rpt-root{max-width:100%!important;width:100%!important;padding:0 4mm!important;margin:0 auto!important}#rpt-root>div{break-inside:avoid;page-break-inside:avoid}body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}canvas{display:none!important}img[id$=-img]{display:block!important}[style*="background:#6b1c24"],[style*="background: #6b1c24"]{background-color:#6b1c24!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.rpt-footer-logos img{filter:brightness(0) invert(1)!important;max-height:36px!important;object-fit:contain!important}img[alt="ACES"],img[alt="MoPH"]{max-height:40px!important;object-fit:contain!important;display:block!important}}"

if old2 in content:
    content = content.replace(old2, new2)
    print("  ✅ Fix 2 applied")
else:
    print("  ⚠️  Fix 2: not found exactly")

# Fix 3: Logo row in renderFinalReport - header logos
old3 = '<img src="${_ACES_D}" style="height:52px;object-fit:contain" alt="ACES">'
new3 = '<img src="${_ACES_D}" style="height:52px;object-fit:contain;display:block;max-width:130px" alt="ACES" onerror="this.style.visibility='hidden'">'
if old3 in content:
    content = content.replace(old3, new3)
    print("  ✅ Fix 3a applied (ACES logo)")
else:
    print("  ⚠️  Fix 3a: ACES logo img not found")

old3b = '<img src="${_MOPH_D}" style="height:52px;object-fit:contain" alt="MoPH">'
new3b = '<img src="${_MOPH_D}" style="height:52px;object-fit:contain;display:block;max-width:130px" alt="MoPH" onerror="this.style.visibility='hidden'">'
if old3b in content:
    content = content.replace(old3b, new3b)
    print("  ✅ Fix 3b applied (MoPH logo)")
else:
    print("  ⚠️  Fix 3b: MoPH logo img not found")

# Fix 4: Footer logos
old4 = '<img src="${_ACES_D}" style="height:40px;object-fit:contain;filter:brightness(0) invert(1)">'
new4 = '<img src="${_ACES_D}" style="height:36px;max-width:100px;object-fit:contain;filter:brightness(0) invert(1);display:block" onerror="this.style.display='none'">'
if old4 in content:
    content = content.replace(old4, new4)
    print("  ✅ Fix 4a applied (footer ACES)")

old4b = '<img src="${_MOPH_D}" style="height:40px;object-fit:contain;filter:brightness(0) invert(1)">'
new4b = '<img src="${_MOPH_D}" style="height:36px;max-width:100px;object-fit:contain;filter:brightness(0) invert(1);display:block" onerror="this.style.display='none'">'
if old4b in content:
    content = content.replace(old4b, new4b)
    print("  ✅ Fix 4b applied (footer MoPH)")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

print("\n✅ All fixes applied to index.html")
EOF

echo ""
echo "✅ Done! Upload the patched index.html to GitHub."
