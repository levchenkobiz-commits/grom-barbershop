#!/usr/bin/env python3
content = open('index_fixed.html', 'r', encoding='utf-8').read()
import re

# Remaining mojibake
mojibake = re.findall(r'[А-Яа-яёЁ][А-Яа-яёЁ]{0,5}\u2019', content)
print('Remaining mojibake with smart quote:')
for m in list(set(mojibake))[:15]:
    print(' ', repr(m))

# Normal cyrillic  
normal = re.findall(r'[А-Яа-яёЁ]{5,}', content)
print('\nNormal Cyrillic samples:')
for n in list(set(normal))[:15]:
    print(' ', n)

# Check key strings
tests = ['Вход в систему', 'Авторизация', 'Настройки', 'Аналитика', 'Кабинет', 'Видеоконтроль']
for t in tests:
    idx = content.find(t)
    print(f'{t}: {"FOUND" if idx >= 0 else "NOT FOUND"}')
