#!/usr/bin/env python3
"""
Fix mojibake in index.html
The file is UTF-8 but contains text that was double-encoded:
  Original Cyrillic UTF-8 bytes -> misread as Latin-1/CP1252 -> re-encoded as UTF-8
  
To fix: find these double-encoded sequences and decode them back.
"""
import re
import shutil
from pathlib import Path

src = Path('index.html')
backup = Path('index.html.encoding_backup')

# Make backup
shutil.copy(src, backup)
print(f"Backup created: {backup}")

# Read as raw bytes
raw = src.read_bytes()

# The file is stored as UTF-8, read it
content = raw.decode('utf-8')

def fix_mojibake(text):
    """
    Mojibake pattern: UTF-8 Cyrillic bytes were interpreted as Latin-1/Windows-1252
    and then stored as UTF-8 again.
    
    Example: "Вход" -> UTF-8 bytes: D0 92 D1 85 D0 BE D0 B4
    Misread as Latin-1: Ð\x92Ñ\x85Ð¾Ð´
    Stored as UTF-8: C3 90 C2 92 C3 91 C2 85 C3 90 C2 BE C3 90 C2 B4
    
    Strategy: try to re-encode each character as latin-1 and decode as utf-8
    """
    result = []
    i = 0
    
    while i < len(text):
        # Try to detect mojibake: look for Ð followed by certain chars
        # Mojibake from CP1252->UTF8 pattern detection
        # Try a window of chars
        found_fix = False
        
        # Try lengths from 2 to 8 chars
        for length in range(8, 1, -1):
            if i + length > len(text):
                continue
            window = text[i:i+length]
            try:
                # Try to encode window as latin-1, then decode as utf-8
                fixed = window.encode('latin-1').decode('utf-8')
                # Check if result contains actual Cyrillic (meaning fix worked)
                if any('\u0400' <= c <= '\u04ff' for c in fixed):
                    result.append(fixed)
                    i += length
                    found_fix = True
                    break
            except (UnicodeDecodeError, UnicodeEncodeError):
                pass
        
        if not found_fix:
            result.append(text[i])
            i += 1
    
    return ''.join(result)

print("Fixing mojibake...")
fixed = fix_mojibake(content)

# Count remaining mojibake
import re as re2
remaining = len(re2.findall(r'Р[^\s]{0,3}[А-Яа-яёЁ]', fixed))
normal = len(re2.findall(r'[А-Яа-яёЁ]{3,}', fixed))
print(f"After fix - Mojibake patterns: {remaining}, Normal Cyrillic: {normal}")

# Save
src.write_text(fixed, encoding='utf-8')
print(f"Fixed file saved to {src}")
