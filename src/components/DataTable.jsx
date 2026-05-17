import { Download } from 'lucide-react';

const DataTable = ({ headers, data, renderRow, loading, title = null, containerStyle = {} }) => {
    const exportToCSV = () => {
        if (!data || data.length === 0) return;
        const csvRows = [];
        // headers as first row
        csvRows.push(headers.join(','));
        // data rows - this is a bit tricky because renderRow returns JSX
        // so we'll just export the raw data keys if available, or just the values
        data.forEach(item => {
            const values = Object.values(item).map(v => `"${String(v).replace(/"/g, '""')}"`);
            csvRows.push(values.join(','));
        });
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${title || 'records'}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', ...containerStyle }}>
            {(title || data.length > 0) && (
                <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontWeight: '700', fontSize: '0.9rem' }}>{title}</h4>
                    <button 
                        className="btn glass" 
                        style={{ 
                            fontSize: '0.7rem', 
                            padding: '6px 12px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            color: 'var(--primary)',
                            borderColor: 'rgba(99, 102, 241, 0.3)',
                            background: 'rgba(99, 102, 241, 0.1)'
                        }}
                        onClick={exportToCSV}
                    >
                        <Download size={14} color="var(--primary)" /> Export CSV
                    </button>
                </div>
            )}
            <div className="scrollable-content-card" style={{ flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', backdropFilter: 'blur(10px)' }}>
                    <tr>
                        {headers.map(h => (
                            <th key={h} style={{ 
                                textAlign: 'left', padding: '12px 16px', 
                                color: 'var(--text-dim)', fontSize: '0.75rem', 
                                textTransform: 'uppercase', letterSpacing: '0.05em' 
                            }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={headers.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                                Fetching records from database...
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={headers.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                                No records found.
                            </td>
                        </tr>
                    ) : (
                        data.map((item, idx) => (
                            <tr key={idx} style={{ 
                                background: 'rgba(255,255,255,0.02)', 
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }} className="table-row-hover">
                                {renderRow(item, idx)}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .table-row-hover:hover {
                    background: rgba(255,255,255,0.05) !important;
                    transform: translateX(4px);
                }
                .table-row-hover td {
                    padding: 16px;
                    border-top: 1px solid var(--border);
                    border-bottom: 1px solid var(--border);
                }
                .table-row-hover td:first-child {
                    border-left: 1px solid var(--border);
                    border-top-left-radius: 12px;
                    border-bottom-left-radius: 12px;
                }
                .table-row-hover td:last-child {
                    border-right: 1px solid var(--border);
                    border-top-right-radius: 12px;
                    border-bottom-right-radius: 12px;
                }
            `}} />
            </div>
        </div>
    );
};

export default DataTable;
