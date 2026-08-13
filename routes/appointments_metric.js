// Shared contract for the analytics card "Доля записей".
// A record is any active YClients appointment of a master explicitly present
// in the adapter. `online` is intentionally not used: it is an integration
// flag, not a reliable business classification of a booking channel.
function calculateAppointmentShare({ orders = [], records = [] } = {}) {
  const servicesByMaster = new Map();
  const recordsByMaster = new Map();
  const seenRecords = new Set();

  for (const order of orders) {
    if (!order?.completed || !order.master) continue;
    servicesByMaster.set(order.master, (servicesByMaster.get(order.master) || 0) + 1);
  }

  for (const record of records) {
    if (record?.deleted || !record?.master) continue;
    const identity = record.id == null ? null : `${record.branch || ''}:${record.id}`;
    if (identity && seenRecords.has(identity)) continue;
    if (identity) seenRecords.add(identity);
    recordsByMaster.set(record.master, (recordsByMaster.get(record.master) || 0) + 1);
  }

  const totalServices = [...servicesByMaster.values()].reduce((sum, value) => sum + value, 0);
  const totalRecords = [...recordsByMaster.values()].reduce((sum, value) => sum + value, 0);
  const percentage = totalServices > 0 ? Number((totalRecords / totalServices * 100).toFixed(1)) : 0;
  const masters = [...servicesByMaster.entries()]
    .map(([name, services]) => ({
      name,
      services,
      records: recordsByMaster.get(name) || 0,
      percentage: Math.round(((recordsByMaster.get(name) || 0) / services) * 100)
    }))
    .sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name, 'ru'));

  return { percentage, totalRecords, totalServices, masters };
}

module.exports = { calculateAppointmentShare };
