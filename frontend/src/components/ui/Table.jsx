export default function Table({ columns = [], data = [] }) {
  return (
    <div className="overflow-x-auto bg-white border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>{columns.map(c => <th key={c.key} className="px-4 py-2">{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id ?? i} className="border-t">
              {columns.map(c => (
                <td key={c.key} className="px-4 py-2">
                  {c.cell ? c.cell(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
