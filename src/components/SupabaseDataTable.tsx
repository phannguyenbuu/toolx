import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

interface DataTableProps {
  table: string;
  columns: string[];
}

export const SupabaseDataTable: React.FC<DataTableProps> = ({ table, columns }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    const subscription = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [table]);

  const fetchData = async () => {
    setLoading(true);
    const { data: result } = await supabase.from(table).select('*');
    setData(result || []);
    setLoading(false);
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h3>{table}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col} style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td key={col} style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {JSON.stringify(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
