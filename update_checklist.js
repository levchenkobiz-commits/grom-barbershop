const fs = require('fs');

let js = fs.readFileSync('mainscript.js', 'utf8');

// 1. Rewrite MANAGER_CHECK_FIELDS
const newManagerCheckFields = `
        const MANAGER_CHECK_FIELDS = [
            { id: 1, label: 'Рамки с ценами, светильники...', photo: 'optional' },
            { id: 2, label: 'Инструмент мастера в исправном состоянии.', photo: 'optional' },
            { id: 3, label: 'В салоне температура в диапазоне 19-23 градуса...', photo: 'optional' },
            { id: 4, label: 'В зале не лежат коробки промоутеров...', photo: 'optional' },
            { id: 5, label: 'Музыка играет из согласованного плей-листа...', photo: 'optional' },
            { id: 6, label: 'Проверка технической части...', photo: 'optional' },
            { id: 7, label: 'Консультация перед стрижкой...', photo: 'optional' },
            { id: 8, label: 'Цветные бутылочки, косметика не из нашей матрицы отсутствуют', photo: 'optional' },
            { id: 9, label: 'Все нарушения из таблицы за последние 48 часов проработаны на месте', photo: 'optional' }
        ];
`;

const fieldsStart = js.indexOf('const MANAGER_CHECK_FIELDS = [');
const fieldsEnd = js.indexOf('];', fieldsStart) + 2;
js = js.substring(0, fieldsStart) + newManagerCheckFields.trim() + js.substring(fieldsEnd);


// 2. Rewrite Zones
const newZones = `
    const zones = [
        { id: 'reklama', title: 'Наружная реклама', desc: 'Реклама исправна и чистая.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Реклама' },
        { id: 'forma', title: 'Мастера в форме', desc: 'Чистая форма, закрытая обувь.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Мастера' },
        { id: 'kreslo', title: 'Кресло развернуто ко входу', desc: 'Кресло направлено ко входу, есть пеньюар.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Кресло' },
        { id: 'tv', title: 'Телевизор', desc: 'Телевизор включен и работает.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Телевизор' },
        { id: 'shkaf', title: 'Шкафы', desc: 'На шкафах нет волос и личных вещей.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Шкафы' },
        { id: 'moyka', title: 'Мойка', desc: 'Раковина чистая, нет тряпок на виду.', img: 'https://dummyimage.com/600x400/111/E8FF38&text=Мойка' }
    ];
`;
const zonesStart = js.indexOf('const zones = [');
const zonesEnd = js.indexOf('];', zonesStart) + 2;
js = js.substring(0, zonesStart) + newZones.trim() + js.substring(zonesEnd);

// 3. Rename checklist
js = js.replace('Шаг 2: Классический чек-лист', 'Шаг 2: Чек-лист');
js = js.replace('Шаг 1: Фото-отчет для ИИ', 'Шаг 1: Фото-проверка ИИ');

fs.writeFileSync('mainscript.js', js);
console.log('Frontend rewrite complete');
