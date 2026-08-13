(function() {
    const HISTORY_URL = './analytics_history.json';

    async function loadHistory() {
        try {
            const res = await fetch(`${HISTORY_URL}?v=${Date.now()}`);
            if (!res.ok) return null;
            window.ANALYTICS_HISTORY = await res.json();
            return window.ANALYTICS_HISTORY;
        } catch (error) {
            console.warn('[AnalyticsHistory] load failed:', error);
            return null;
        }
    }

    function patchLoadData() {
        const original = window.loadData;
        if (typeof original !== 'function' || original.__historyPatched) return;
        window.loadData = async function() {
            const result = await original.apply(this, arguments);
            await loadHistory();
            return result;
        };
        window.loadData.__historyPatched = true;
    }

    patchLoadData();
    window.loadAnalyticsHistory = loadHistory;
})();
