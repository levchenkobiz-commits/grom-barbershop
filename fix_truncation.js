const fs = require('fs');
let js = fs.readFileSync('mainscript.js', 'utf8');

const newFields = `
        const MANAGER_CHECK_FIELDS = [
            { id: 1, label: 'Рамки с ценами, светильники в зале исправны, включены и выглядят опрятно.', photo: 'optional' },
            { id: 2, label: 'Инструмент мастера в исправном состоянии (нет сломанных машинок/гребней).', photo: 'optional' },
            { id: 3, label: 'В салоне поддерживается комфортная температура в диапазоне 19-23 градуса.', photo: 'optional' },
            { id: 4, label: 'В зале на видных местах не хранятся коробки промоутеров, вода и другой хозяйственный инвентарь.', photo: 'optional' },
            { id: 5, label: 'Музыка играет строго из согласованного плей-листа, поддерживается оптимальная фоновая громкость.', photo: 'optional' },
            { id: 6, label: 'Проверка технической части: работают все розетки, терминал, нет протечек воды, в туалете есть бумага и мыло.', photo: 'optional' },
            { id: 7, label: 'Каждый мастер обязательно проводит детальную консультацию с клиентом перед началом стрижки.', photo: 'optional' },
            { id: 8, label: 'Цветные бутылочки и косметика, не входящая в нашу официальную рабочую матрицу, полностью отсутствуют на рабочих местах.', photo: 'optional' },
            { id: 9, label: 'Все зафиксированные нарушения из таблицы (ОВН) за последние 48 часов проработаны на месте с мастерами.', photo: 'optional' }
        ];
`;

const fieldsStart = js.indexOf('const MANAGER_CHECK_FIELDS = [');
const fieldsEnd = js.indexOf('];', fieldsStart) + 2;
js = js.substring(0, fieldsStart) + newFields.trim() + js.substring(fieldsEnd);

fs.writeFileSync('mainscript.js', js);
console.log('Fixed truncation');
