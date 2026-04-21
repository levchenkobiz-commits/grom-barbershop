async function quickSaveLate(barber, btn) {
            const card = btn.closest('.card');
            const plan = card.querySelector('.sched-plan').value;
            const fact = card.querySelector('.sched-fact').value;
            if (!fact) { alert('Укажите фактическое время прихода'); return; }

            const diff = dayjs(`2000-01-01 ${fact}`).diff(dayjs(`2000-01-01 ${plan}`), 'minute');
            const violation = diff > 0 ? 'Мастер опоздал' : 'Замечаний нет';
            const fine = diff > 0 ? 500 : 0;

            const report = {
                location: document.getElementById('lates-audit-loc').value,
                barber: barber,
                date: dayjs().format('YYYY-MM-DD'),
                time: fact,
                schedTime: plan,
                fine: fine,
                slot: "1",
                match: "да",
                violation: violation,
                notes: diff > 0 ? `Опоздание на ${diff} мин` : 'Открытие вовремя'
            };

            try {
                btn.innerText = '⌛...';
                const res = await fetch('/api/ovn', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(report)
                });
                if (!res.ok) throw new Error('Server error');
                btn.innerText = '✅ Готово';
                setTimeout(() => loadLatesHistory(), 500);
            } catch(e) {
                alert('Ошибка со