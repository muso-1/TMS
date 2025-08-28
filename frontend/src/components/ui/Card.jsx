export default function Card({ title, value, children }) {
  return (
    <div className="bg-white rounded border p-4">
      {title && <div className="text-sm text-gray-500">{title}</div>}
      {value !== undefined && <div className="text-2xl font-semibold">{value}</div>}
      {children}
    </div>
  )
}
