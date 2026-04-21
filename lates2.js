window.renderLatesJournal = function() {
            if (!window.lastOvnRes) return;
            const res = window.lastOvnRes;
            
            const presetEl = document.getElementById('lates-history-preset');
            if (presetEl && presetEl.value === 'today' && !document.getElementById('lates-history-start').value) {
                applyLatesPreset();
                return;
            }

            const startD = document.getElementById('lates-history-start').value;
            const endD = document.getElementById('lates-history-end').value;
            const locFilter = document.getElementById('lates-history-loc-filter').value;
            const masterFilter = document.getElementById('lates-history-master-filter').value;
            
            const tbody = document.getElementById('lates-history');
            
            const list = res.filter(r => {
                const rDateStr = r.date || r.createdAt;
                if (!rDateStr) return false;
                
                const recDay = dayjs(rDateStr);
                
                if (startD && recDay.isBefore(dayjs(startD), 'day')) return false;
                if (endD && recDay.isAfter(dayjs(endD), 'day')) return false;
                if (locFilter && r.location && r.location !== locFilter && locFilter !== "") return false;
                if (masterFilter && masterFilter !== "" && r.barber !== masterFilter) return false;
                
                if (r.schedTime) return true;
                const v = (r.violation || "").toLowerCase();
                return v !== "замечаний нет" && !v.includes('р—р°рјрµс') && v !== "";
            }).sort((a,b) => dayjs(b.date || b.createdAt).valueOf() - dayjs(a.date || a.createdAt).valueOf());
            
            tbody.innerHTML = list.map(r => {
                const lowV = (r.violation || "").toLowerCase();
                const isOk = lowV === "замечаний нет" || lowV.includes('р—р°рјрµс') || !lowV;

                let badgeStyles = 'background: rgba(255,255,255,0.05); color: #888;';
                if (lowV.includes('согласованное') || lowV.includes('рїрѕрґс‚рі')) badgeStyles = 'background: rgba(52,199,89,0.1); color: #34C759;';
                else if (lowV.includes('опоздал') || lowV.includes('рѕрїрѕр·рґ') || (r.schedTime && r.time > r.schedTime)) {
                     badgeStyles = 'background: rgba(255,59,48,0.1); color: #FF3B30; font-weight:700;';
                }

                let delayText = '-';
                if (r.schedTime && r.time) {
                    const diff = dayjs(`2000-01-01 ${r.time}`).diff(dayjs(`2000-01-01 ${r.schedTime}`), 'minute');
                    if (diff > 0) delayText = `+${diff} мин`;
                    else if (diff < 0) delayText = `${Math.abs(diff)} мин раньше`;
                    else delayText = 'вовремя';
                }

                return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.01); height: 50px;">
             