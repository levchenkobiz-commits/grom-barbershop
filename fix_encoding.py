#!/usr/bin/env python3
"""
fix_encoding.py — конвертирует index.html из CP1251 в UTF-8
Запускать на сервере: python3 fix_encoding.py
"""
import sys

path = '/root/grom-dashboard/index.html'

with open(path, 'rb') as f:
    raw = f.read()

# Проверяем текущую кодировку
print(f'Размер файла: {len(raw)} байт')
print(f'Первые 4 байта: {raw[:4].hex()}')

# Пробуем декодировать как CP1251
try:
    text = raw.decode('cp1251')
    print('Декодировано как CP1251')
    print('Первые 200 символов:')
    print(text[:200])
    
    # Сохраняем как UTF-8
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('\nФайл сохранён в UTF-8 ✓')
    
except UnicodeDecodeError as e:
    print(f'Ошибка CP1251: {e}')
    # Пробуем как latin-1 (не падает никогда)
    text = raw.decode('latin-1')
    print('Декодировано как Latin-1')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('Файл сохранён через latin-1 → utf-8')
