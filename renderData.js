function renderData(data) {
            try {
                let nowStr = data.lastUpdate;
                if (!nowStr) nowStr = dayjs().format("HH:mm DD.MM.YYYY");
                const now = dayjs(nowStr, "HH:mm DD.MM.YYYY");

                let startStr = "Начало кв.";
                let endStr = "----";
                try {
                    endStr = now.format('DD.MM');
                    startStr = now.startOf('quarter').format('DD.MM');
                } catch(e) {
                    console.error("dayjs format error:", e);
                }

                if (data.revenue) {
                    try {
                        const revCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(1)');
                        const growthVal = data.revenue.growth || 0;
                        revCard.querySelector('.card-value').innerText = (growthVal >= 0 ? '+' : '') + growthVal + '%';
                        const curRev = data.revenue.current ? data.revenue.current.toLocaleString() : "0";
                        const prevRev = data.revenue.previous ? data.revenue.previous.toLocaleString() : "0";
                        revCard.querySelector('.card-subtext').innerText = `${startStr}-${endStr} (${curRev} vs ${prevRev} ₽)`;
                    } catch(e) {}
                    
                    try {
                        const pCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(4) .card-value');
                        if (pCard) pCard.innerText = (data.revenue.today || 0).toLocaleString() + ' ₽';
                    } catch(e) {}
                }
                
                if (data.returnRate) {
                    try {
                        const rrCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(2)');
                        rrCard.querySelector('.card-value').innerText = (data.returnRate.value || 0) + '%';
                        if (data.returnRate.drilldown && data.returnRate.drilldown[0]) {
                            rrCard.querySelector('.card-subtext').innerText = data.returnRate.drilldown[0].value;
                        } else {
                            rrCard.querySelector('.card-subtext').innerText = "Когорта 64-32 дня";
                        }
                    } catch(e) {}
                }
                
                if (data.cycle) {
                    try {
                        const cycleCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(3) .card-value');
                        if (cycleCard) cycleCard.innerText = (data.cycle.value || 0) + 'д';
                    } catch(e) {}
                }
                
                if (data.appointments) {
                    try {
                        const apptCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(5) .card-value');
                        if (apptCard) apptCard.innerText = (data.appointments.percentage || 0) + '%';
                    } catch(e) {}
                }

                if (data.occupancy) {
                    try {
                        const occCard = document.querySelector('#analytics-section .metrics-grid .card:nth-child(6) .card-value');
                        if (occCard) occCard.innerText = (data.occupancy.value || 0);
                    } catch(e) {}
                }

                // Always render Master Cabinet mock for showcase
                try {
                    updateMasterCabinet(data);
                } catch(e) {}
                window.DASH_DATA = data;
            } catch(e) {
                console.error("renderData general error:", e);
            }
        }