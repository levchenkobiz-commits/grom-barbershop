#!/usr/bin/env python3
"""
Analyze and fix mojibake in index.html

The corruption pattern: UTF-8 Cyrillic bytes were misread as cp1252,
creating double-encoded sequences.

Original: 'В' (UTF-8: D0 92)
cp1252 misread: D0->Ð(U+00D0), 92->U+2018(')  (cp1252 maps 0x92 to right single quote U+2019)
Re-stored as UTF-8: [C3 90] [E2 80 99] 

But we see: D0 A0 E2 80 99 ... something else happened.

Let me trace: D0 A0 = U+0420 (Р), E2 80 99 = U+2019 (')
So Р' in the file.

Looking at it differently:
If the byte was D0 (cp1251 = Р), cp1252 maps D0 to Ð (U+00D0)
U+00D0 in UTF-8 = C3 90 (2 bytes)
But in file we see D0 A0 (U+0420 Р) not C3 90...

Wait: maybe the bytes went through an extra step.
Cyrillic Р (U+0420) in UTF-8 = D0 A0.
So if cp1251 Р (0xD0) was converted to UTF-8 Р (U+0420), that's D0 A0.
That means: someone did bytes.decode('cp1251').encode('utf-8')
And cp1251 0xD0 = р... wait:

cp1251 encoding table (Russian Windows):
0xC0 = А, 0xC1 = Б, ..., 0xCF = П
0xD0 = Р, 0xD1 = С, ..., 0xDF = Я
0xE0 = а, ..., 0xFF = я

So cp1251 0xD0 = Р (CYRILLIC CAPITAL LETTER ER)!
And Р in Unicode = U+0420
U+0420 in UTF-8 = D0 A0

EUREKA! The UTF-8 bytes of the original file were read as cp1251 (or raw bytes),
then decoded as cp1251 strings, then re-encoded as UTF-8.

Example:
Original UTF-8 'В' = bytes D0 92
D0 92 read as cp1251: D0=Р, 92=? (0x92 in cp1251 = undefined or special)
Actually cp1251 0x92 = U+2019 (RIGHT SINGLE QUOTATION MARK)
So D0 92 as cp1251 = 'Р\u2019' = 'Р''
Re-encoded as UTF-8: D0 A0 (for Р) + E2 80 99 (for ')

This matches what we see! D0 A0 E2 80 99 = Р'

So the fix is:
1. Read file as UTF-8 (correct bytes)  
2. For each sequence that looks like cp1251->utf8 corruption:
   - Take the chars
   - Try to encode as cp1251 (reversing the decode('cp1251') step)
   - That gives us the original UTF-8 bytes
   - Decode those bytes as UTF-8

Let me build the cp1251 reverse map and fix.
"""

import sys
import re
import shutil
from pathlib import Path

src = Path('index.html.encoding_backup')
dst = Path('index_fixed.html')

# Read the corrupted file
content = src.read_bytes().decode('utf-8')

print(f"File size: {len(content)} chars")

# Build cp1251 -> unicode mapping (for all 256 bytes)
cp1251_to_unicode = {}
for byte_val in range(256):
    try:
        char = bytes([byte_val]).decode('cp1251')
        cp1251_to_unicode[byte_val] = char
    except Exception:
        pass

# Build reverse: unicode char -> cp1251 byte
unicode_to_cp1251 = {v: k for k, v in cp1251_to_unicode.items()}

print("CP1251 reverse map built:", len(unicode_to_cp1251), "entries")

def try_fix_sequence(chars):
    """
    Given a sequence of unicode chars that may be cp1251->utf8 corruption,
    try to recover the original bytes and decode as utf-8.
    """
    # Try to encode chars back to cp1251 bytes
    cp1251_bytes = []
    for ch in chars:
        if ch in unicode_to_cp1251:
            cp1251_bytes.append(unicode_to_cp1251[ch])
        else:
            return None  # Can't encode this char as cp1251
    
    # Try to decode the resulting bytes as UTF-8
    try:
        original = bytes(cp1251_bytes).decode('utf-8')
        # Check that result is proper Cyrillic (or at least valid text)
        if any('\u0400' <= c <= '\u04ff' for c in original) or original.isascii():
            return original
    except UnicodeDecodeError:
        pass
    return None

# Strategy: scan through content, find sequences that look like mojibake
# A mojibake sequence starts with Р (U+0420) which is cp1251 0xD0
# The trick: 0xD0 is the start of many 2-byte UTF-8 sequences for Cyrillic

fixed_parts = []
i = 0
fixes = 0
total_chars = len(content)

while i < total_chars:
    # Try to detect if this position starts a mojibake sequence
    # Check if current char can be encoded as cp1251 AND the result could be valid UTF-8
    
    # Try window sizes from 2 to 6 chars
    best_fix = None
    best_len = 0
    
    ch = content[i]
    
    # Quick check: is this char likely mojibake?
    # Mojibake chars are in specific Unicode ranges from cp1252/cp1251 misread
    # Р (U+0420) is cp1251 0xD0 which in UTF-8 is the start of Cyrillic 2-byte sequences
    # С (U+0421) is cp1251 0xD1
    # ... etc
    
    if ch in unicode_to_cp1251 and unicode_to_cp1251.get(ch, 256) >= 0xC0:
        # This char could be first byte of a UTF-8 Cyrillic 2-byte sequence
        for length in range(6, 1, -1):
            if i + length > total_chars:
                continue
            window = content[i:i+length]
            result = try_fix_sequence(window)
            if result and len(result) <= length:  # Fix is shorter = good
                best_fix = result
                best_len = length
                break
    
    if best_fix and best_len > 1:
        fixed_parts.append(best_fix)
        i += best_len
        fixes += 1
    else:
        fixed_parts.append(content[i])
        i += 1
    
    if i % 10000 == 0:
        print(f"  Progress: {i}/{total_chars} ({100*i//total_chars}%), fixes so far: {fixes}")

fixed = ''.join(fixed_parts)

# Count results
import re as re2
remaining = len(re2.findall(r'Р[^\s]{0,3}[А-Яа-яёЁ]', fixed))
normal = len(re2.findall(r'[А-Яа-яёЁ]{3,}', fixed))
print(f"\nResults - Mojibake patterns: {remaining}, Normal Cyrillic: {normal}, Fixes applied: {fixes}")

# Save
dst.write_text(fixed, encoding='utf-8')
print(f"Saved to {dst}")
print(f"Original size: {total_chars} chars, Fixed size: {len(fixed)} chars")
